using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Models;
using NodexMeshApi.OpenApi;
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
        });

    builder.Services.AddAuthorization();

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
    });

    // ---------------------------------------------------------------------
    // CORS — deny-by-default; only origins explicitly configured are allowed
    // ---------------------------------------------------------------------
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddApiCors(allowedOrigins);

    // ---------------------------------------------------------------------
    // App services
    // ---------------------------------------------------------------------
    builder.Services.AddScoped<ITokenService, TokenService>();
    builder.Services.AddScoped<IProjectAccessService, ProjectAccessService>();
    builder.Services.AddScoped<IBoardMutationService, BoardMutationService>();
    builder.Services.AddScoped<TagService>();

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

    // For a real deployment use EF Core migrations (`dotnet ef migrations add InitialCreate`,
    // `dotnet ef database update`) instead of EnsureCreatedAsync, so schema changes are
    // tracked and reversible. Left as EnsureCreatedAsync here since this is a first preview.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    app.UseSerilogRequestLogging();
    app.UseExceptionHandler();

    app.UseApiTransportSecurity();
    app.UseSecurityHeaders();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
    }

    app.UseCors("Default");
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", timeUtc = DateTime.UtcNow }))
       .AllowAnonymous()
       .WithTags("Health");

    app.MapAuthEndpoints();
    app.MapProjectEndpoints();
    app.MapBoardEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
