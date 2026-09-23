using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Models;
using NodexMeshApi.OpenApi;
using NodexMeshApi.Options;
using NodexMeshApi.Services;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // Board items cap at 2MB each (enforced in BoardMutationService), a mutation batch
    // is capped separately at MutationLimits.MaxUpsertsPerBatch — this Kestrel limit is
    // just the outer backstop against an oversized request being read into memory at all.
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 5_000_000; // ~5 MB

        // Don't advertise "Kestrel" to every client — version-specific exploit hunting
        // starts with fingerprinting the stack (OWASP A05).
        options.AddServerHeader = false;

        // Slowloris defence: a client that opens a connection and dribbles bytes ties up
        // a request slot indefinitely without these.
        options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
        options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
        options.Limits.MinRequestBodyDataRate = new Microsoft.AspNetCore.Server.Kestrel.Core.MinDataRate(
            bytesPerSecond: 100, gracePeriod: TimeSpan.FromSeconds(10));
    });

    // ---------------------------------------------------------------------
    // Data & Identity
    // ---------------------------------------------------------------------
    var connectionString = builder.Configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");

    builder.Services.AddDbContext<AppDbContext>(options => options
        .UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure())
        // Requires the EFCore.NamingConventions package — maps PascalCase C#
        // properties to the snake_case column/table names used in the DDL.
        .UseSnakeCaseNamingConvention());

    // No global RBAC roles here (unlike the Warehouse template) — this app's
    // permissions are per-project (Owner/Editor/Commenter/Viewer, see
    // Common/ProjectRole.cs), checked fresh from project_members on every
    // mutating request rather than baked into the JWT. That means revoking a
    // collaborator's access takes effect on their very next request instead
    // of waiting up to the access token's 15-minute lifetime.
    builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;

        options.User.RequireUniqueEmail = true;
    })
        .AddEntityFrameworkStores<AppDbContext>()
        .AddSignInManager()
        .AddDefaultTokenProviders();

    // ---------------------------------------------------------------------
    // Authentication (JWT bearer + rotating refresh-token cookie)
    // ---------------------------------------------------------------------
    var jwtSection = builder.Configuration.GetSection("Jwt");
    var jwtKey = jwtSection["Key"];

    if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    {
        throw new InvalidOperationException(
            "Jwt:Key must be configured and at least 32 characters (256 bits) long. " +
            "Set it via 'dotnet user-secrets set Jwt:Key \"...\"' locally, or the Jwt__Key " +
            "environment variable in other environments — never commit it to source control.");
    }

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
            options.SaveToken = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSection["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSection["Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    // SignalR sends the short-lived access token in the query only for
                    // WebSocket/SSE negotiation. Never accept this parameter on API routes.
                    var token = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                        context.Token = token;
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    if (context.Principal is null)
                    {
                        context.Fail("Missing user identity.");
                        return;
                    }
                    var userId = context.Principal.GetUserId();
                    await using var scope = context.HttpContext.RequestServices.CreateAsyncScope();
                    var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                    var user = await users.FindByIdAsync(userId.ToString());
                    var tokenRole = context.Principal.FindFirstValue(ClaimTypes.Role);
                    var currentRole = user?.IsAdmin == true ? "admin" : "user";
                    if (user is null || user.IsBlocked || !string.Equals(tokenRole, currentRole, StringComparison.Ordinal))
                        context.Fail("User account or role has changed.");
                }
            };
        });

    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = false;
        options.MaximumReceiveMessageSize = 32 * 1024;
    });
    builder.Services.AddSingleton<PresenceRegistry>();

    // ---------------------------------------------------------------------
    // Rate limiting (OWASP API4: Unrestricted Resource Consumption)
    // ---------------------------------------------------------------------
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.Headers.RetryAfter = "60";
            await context.HttpContext.Response.WriteAsJsonAsync(
                new { error = "Too many requests. Please try again later." }, token);
        };

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var key = !string.IsNullOrWhiteSpace(userId)
                ? $"user:{userId}"
                : $"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";

            return RateLimitPartition.GetSlidingWindowLimiter(key, _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            });
        });

        options.AddPolicy("auth-strict", httpContext =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetSlidingWindowLimiter($"ip:{ip}", _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            });
        });

        options.AddPolicy("auth-refresh", httpContext =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetTokenBucketLimiter($"ip:{ip}", _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 30,
                TokensPerPeriod = 30,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
        });

        // The board-mutation endpoint is the heaviest write path (up to 2,000,000 bytes
        // of JSON per item, batched) — keep it well under the 300/min global limit.
        options.AddPolicy("board-mutation", httpContext =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anon";
            return RateLimitPartition.GetSlidingWindowLimiter($"user:{userId}", _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            });
        });

        // Anonymous share links. Two distinct risks, both handled by one per-IP limit:
        // brute-forcing the 256-bit token (hopeless anyway, but no reason to allow the
        // attempts), and a popular public board being used to hammer the read path since
        // there is no account to throttle or lock out.
        options.AddPolicy("public-share", httpContext =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetSlidingWindowLimiter($"ip:{ip}", _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            });
        });
    });

    // ---------------------------------------------------------------------
    // CORS — deny-by-default; only origins explicitly configured are allowed
    // ---------------------------------------------------------------------
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddApiCors(allowedOrigins);

    builder.Services.AddAuthorization(options =>
        options.AddPolicy("AdminOnly", policy => policy.RequireClaim(ClaimTypes.Role, "admin")));

    // ---------------------------------------------------------------------
    // App services
    // ---------------------------------------------------------------------
    // Injected rather than calling DateTimeOffset.UtcNow directly, so expiry and
    // revocation logic in ShareLinkService is testable without waiting in real time.
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.Configure<AppVersionOptions>(builder.Configuration.GetSection(AppVersionOptions.SectionName));
    builder.Services.AddMemoryCache();
    builder.Services.AddHttpClient("GitHubReleases", client =>
    {
        client.DefaultRequestHeaders.UserAgent.ParseAdd("NodexMesh-VersionChecker");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        client.Timeout = TimeSpan.FromSeconds(10);
    });

    builder.Services.AddScoped<ITokenService, TokenService>();
    builder.Services.AddScoped<IProjectAccessService, ProjectAccessService>();
    builder.Services.AddScoped<IBoardMutationService, BoardMutationService>();
    builder.Services.AddScoped<IShareLinkService, ShareLinkService>();
    builder.Services.AddScoped<TagService>();
    builder.Services.AddSingleton<IGitHubReleaseService, GitHubReleaseService>();

    // idempotency_keys and refresh_tokens grow on every save and every token refresh;
    // nothing else deletes them.
    builder.Services.AddHostedService<ExpiredDataCleanupService>();

    // .NET 10 built-in Minimal API validation: DataAnnotations / IValidatableObject on
    // request DTOs are enforced automatically for query/header/body-bound parameters.
    builder.Services.AddValidation();

    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();

    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    });

    var app = builder.Build();

    // Applies pending EF Core migrations on boot. Fine for a single-instance self-hosted
    // deployment; if you ever scale to multiple replicas, move this to a one-shot job so
    // two instances can't race to migrate the same database.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // The "Testing" environment (WebApplicationFactory in the test suite) swaps in a
        // SQLite provider with no Npgsql migration history, so applying the real (Postgres-
        // flavoured) migrations would fail. EnsureCreated builds the schema straight from
        // the current model instead — fine for a throwaway test database, never for
        // production, where MigrateAsync is what keeps schema history consistent.
        if (app.Environment.IsEnvironment("Testing"))
            await db.Database.EnsureCreatedAsync();
        else
            await db.Database.MigrateAsync();

        await AdminBootstrap.EnsureAsync(scope.ServiceProvider, app.Configuration, app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("AdminBootstrap"));
    }

    app.UseSerilogRequestLogging(options =>
    {
        // Routine successful requests are intentionally quiet. Warnings and errors
        // still retain method, path, status and elapsed time for incident analysis.
        options.GetLevel = (context, _, exception) =>
            exception is not null || context.Response.StatusCode >= 500
                ? LogEventLevel.Error
                : context.Response.StatusCode >= 400
                    ? LogEventLevel.Warning
                    : LogEventLevel.Debug;
        options.EnrichDiagnosticContext = (diagnostics, context) =>
        {
            diagnostics.Set("RequestMethod", context.Request.Method);
            diagnostics.Set("RequestPath", context.Request.Path.Value);
            diagnostics.Set("ResponseStatus", context.Response.StatusCode);
        };
    });
    app.UseSecurityHeaders();
    app.UseExceptionHandler();

    app.UseApiTransportSecurity();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
    }

    app.UseCors("Default");
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();
    app.MapHub<CollaborationHub>("/hubs/collaboration").RequireAuthorization();

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", timeUtc = DateTime.UtcNow }))
       .AllowAnonymous()
       .WithTags("Health");

    app.MapAuthEndpoints();
    app.MapAdminEndpoints();
    app.MapProjectEndpoints();
    app.MapBoardEndpoints();
    app.MapCommentEndpoints();
    app.MapPublicEndpoints();
    app.MapVersionEndpoints();

    app.Run();
}
// HostAbortedException is how `dotnet ef migrations add` stops the host after building the
// service provider. Catching it here would log a spurious "terminated unexpectedly" fatal
// on every migration command.
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// WebApplicationFactory<Program> (used by the integration test suite) needs a public type
// to bind to; top-level statements otherwise generate an internal one. This adds nothing at
// runtime — Main above still runs exactly as before.
public partial class Program { }
