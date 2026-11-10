using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Auditing;
using NodexMeshApi.Tests.Infrastructure;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class IdentityMediaPostgresTests
{
    [PostgresFact]
    public async Task ProductionProviderSavesAndReplacesFourMiBGifsWithRetryStrategyEnabled()
    {
        var connection = Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")!;
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection, pg => pg.EnableRetryOnFailure())
            .UseSnakeCaseNamingConvention().Options;
        await using (var db = new AppDbContext(options)) await db.Database.MigrateAsync();
        using var original = new TestWebApplicationFactory();
        using var factory = original.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(builder => builder.UseNpgsql(connection, pg => pg.EnableRetryOnFailure())
                .UseSnakeCaseNamingConvention());
        }));
        var directory = Path.Combine(Path.GetTempPath(), "nodex-pg-avatar-" + Guid.NewGuid());
        try
        {
            using var client = factory.CreateClient();
            factory.Services.GetRequiredService<IOptions<PublicImageOptions>>().Value.Path = directory;
            var email = $"avatar-{Guid.NewGuid():N}@nodexmesh.test";
            const string password = "Correct#Horse9Battery";
            (await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, password, password, "Avatar regression", true)))
                .EnsureSuccessStatusCode();
            var auth = await (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password)))
                .Content.ReadFromJsonAsync<AuthResponse>();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
            Guid? previous = null;
            for (var i = 0; i < 2; i++)
            {
                var gif = new byte[4 * 1024 * 1024];
                Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7").CopyTo(gif, 0);
                using var content = new ByteArrayContent(gif);
                var response = await client.PutAsync("/api/v1/auth/profile/avatar?name=image.gif", content);
                response.EnsureSuccessStatusCode();
                var image = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("avatarId").GetGuid();
                var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile");
                profile!.AvatarId.Should().Be(image);
                File.Exists(Path.Combine(directory, image.ToString("N"))).Should().BeTrue();
                if (previous is { } old) File.Exists(Path.Combine(directory, old.ToString("N"))).Should().BeFalse();
                previous = image;
            }
            (await client.DeleteAsync("/api/v1/auth/profile/avatar")).EnsureSuccessStatusCode();
            Directory.GetFiles(directory).Should().BeEmpty();
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }
}
