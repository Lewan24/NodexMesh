using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Tests.Infrastructure;

/// <summary>
/// Boots the real <c>NodexMeshApi</c> pipeline — real DI, real middleware order, real
/// rate limiter, real JWT validation — against a private SQLite in-memory database instead
/// of PostgreSQL. This is what every endpoint/integration/security test runs against.
/// </summary>
/// <remarks>
/// xUnit creates a fresh instance of the owning test class per [Fact], and each test class
/// constructs its own <see cref="TestWebApplicationFactory"/> — so every test gets an
/// isolated database AND an isolated rate limiter. Tests still use unique emails (a
/// <see cref="Guid"/> suffix) since <see cref="CreateAdminClientAsync"/>'s bootstrapped
/// admin aside, nothing else is pre-seeded.
/// </remarks>
public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public const string AdminEmail = "admin@nodexmesh.test";
    public const string AdminPassword = "Sup3rSecret!Admin#1";
    public const string AllowedOrigin = "https://app.nodexmesh.test";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();

        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", "Host=localhost;Database=unused;Username=unused;Password=unused");
        builder.UseSetting("Jwt:Key", "test-only-signing-key-not-used-anywhere-else-32chars+");
        builder.UseSetting("Jwt:Issuer", "https://nodexmesh.test");
        builder.UseSetting("Jwt:Audience", "nodexmesh-web");
        builder.UseSetting("Jwt:AccessTokenMinutes", "15");
        builder.UseSetting("Admin:Email", AdminEmail);
        builder.UseSetting("Admin:Password", AdminPassword);
        builder.UseSetting("Cors:AllowedOrigins:0", AllowedOrigin);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // A dummy value is enough: Program.cs only requires this to be non-empty
                // before Build(); the real DbContext registration is swapped out below.
                ["ConnectionStrings:Default"] = "Host=localhost;Database=unused;Username=unused;Password=unused",

                ["Jwt:Key"] = "test-only-signing-key-not-used-anywhere-else-32chars+",
                ["Jwt:Issuer"] = "https://nodexmesh.test",
                ["Jwt:Audience"] = "nodexmesh-web",
                ["Jwt:AccessTokenMinutes"] = "15",

                ["Admin:Email"] = AdminEmail,
                ["Admin:Password"] = AdminPassword,

                ["Cors:AllowedOrigins:0"] = AllowedOrigin,
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options
                .UseSqlite(_connection)
                .UseSnakeCaseNamingConvention());
        });
    }

    /// <summary>An <see cref="HttpClient"/> that does not auto-follow redirects, so a 3xx
    /// (e.g. an HSTS/HTTPS redirect bug) surfaces as a status code instead of being hidden.</summary>
    public HttpClient CreateClientNoRedirect() =>
        CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    /// <summary>
    /// Registers a brand-new user and returns a client already carrying that user's
    /// bearer token — the common starting point for most authenticated endpoint tests.
    /// </summary>
    public async Task<(HttpClient Client, Guid UserId, string Email, string Password)> CreateAuthenticatedUserAsync(
        string? displayName = null)
    {
        var client = CreateClientNoRedirect();
        var email = $"user-{Guid.NewGuid():N}@nodexmesh.test";
        const string password = "Correct#Horse9Battery";

        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(
            email, password, password, displayName ?? "Test User"));
        register.EnsureSuccessStatusCode();
        var registered = await register.Content.ReadFromJsonAsync<RegisteredUserResponse>();

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        return (client, registered!.Id, email, password);
    }

    /// <summary>
    /// Creates a user and an already-authenticated client WITHOUT going through the
    /// rate-limited register/login HTTP endpoints — for tests where the user is only
    /// setup fixture (e.g. "a second project member exists"), not the thing under test.
    /// Several such users can be created in a single test without tripping the
    /// "auth-strict" 5-req/min limiter, which the real register+login round trip would.
    /// </summary>
    public async Task<(HttpClient Client, Guid UserId, string Email, string Password)> CreateSeededUserAsync(
        string? displayName = null)
    {
        var email = $"seed-{Guid.NewGuid():N}@nodexmesh.test";
        const string password = "Correct#Horse9Battery";

        using (var scope = Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var user = new ApplicationUser
            {
                Id = Guid.CreateVersion7(),
                UserName = email,
                Email = email,
                DisplayName = displayName ?? "Seeded User"
            };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to seed test user: " + string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            // Mirrors AuthEndpoints.RegisterAsync, which always provisions a default
            // appearance profile — several endpoints assume one exists.
            db.AppearanceProfiles.Add(new AppearanceProfile
            {
                UserId = user.Id,
                LightTheme = "{}",
                DarkTheme = "{}",
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();

            var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
            var (accessToken, _) = tokenService.GenerateAccessToken(user);

            var client = CreateClientNoRedirect();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            return (client, user.Id, email, password);
        }
    }

    /// <summary>Logs in as the bootstrapped administrator and returns an authenticated client.</summary>
    public async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = CreateClientNoRedirect();
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(AdminEmail, AdminPassword));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
