using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Moq;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Auditing;
using NodexMeshApi.Tests.Infrastructure;

namespace NodexMeshApi.Tests.Services;

public sealed class MfaPostgresTests
{
    [PostgresFact]
    public async Task MigrationsAndConcurrentTotpConsumption_WorkOnPostgres()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES"))
            .UseSnakeCaseNamingConvention().Options;
        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();
        db.Database.HasPendingModelChanges().Should().BeFalse();
        var protection = new EphemeralDataProtectionProvider();
        var email = new Mock<IEmailQueue>();
        var clock = new FakeTimeProvider();
        var service = new MfaService(db, protection, email.Object, clock);
        var secret = MfaService.Base32(System.Security.Cryptography.RandomNumberGenerator.GetBytes(20));
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(), Email = "mfa-postgres@example.test", UserName = Guid.NewGuid().ToString(),
            SecurityStamp = Guid.NewGuid().ToString(), ConcurrencyStamp = Guid.NewGuid().ToString(),
            TwoFactorEnabled = true, MfaPreferredMethod = "authenticator", MfaSecretProtected = service.Protect(secret)
        };
        db.Users.Add(user); await db.SaveChangesAsync();
        try
        {
            var login = await service.StartAsync(user, "login");
            var manage = await service.StartAsync(user, "manage", false, "authenticator");
            await using var staleDb = new AppDbContext(options);
            await staleDb.Users.SingleAsync(x => x.Id == user.Id);
            await staleDb.MfaChallenges.SingleAsync(x => x.TokenHash == MfaService.Hash(manage.ChallengeToken));
            var staleService = new MfaService(staleDb, protection, email.Object, clock);
            var code = MfaService.Totp(secret, clock.GetUtcNow().ToUnixTimeSeconds() / 30);
            await service.VerifyAsync(new(login.ChallengeToken, code), "login");
            await FluentActions.Awaiting(() => staleService.VerifyAsync(new(manage.ChallengeToken, code), "manage", user.Id)).Should().ThrowAsync<ApiException>();
            await using var check = new AppDbContext(options);
            (await check.Users.SingleAsync(x => x.Id == user.Id)).MfaLastAcceptedStep.Should().Be(clock.GetUtcNow().ToUnixTimeSeconds() / 30);
            (await check.MfaChallenges.SingleAsync(x => x.TokenHash == MfaService.Hash(manage.ChallengeToken))).Consumed.Should().BeFalse();
        }
        finally
        {
            await db.Users.Where(x => x.Id == user.Id).ExecuteDeleteAsync();
        }
    }
    [PostgresFact]
    public async Task SidebarDefaultMigration_UpgradesFormerDefaultAndPreservesCustomWidths()
    {
        var connectionString = Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES");
        var schema = $"sidebar_default_{Guid.NewGuid():N}";
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", connection))
            await create.ExecuteNonQueryAsync();
        try
        {
            var scopedConnection = new NpgsqlConnectionStringBuilder(connectionString) { SearchPath = schema };
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(scopedConnection.ConnectionString).UseSnakeCaseNamingConvention().Options;
            await using var db = new AppDbContext(options);
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261006073236_BindRefreshTokensToSecurityStamp");
            var formerDefault = Guid.NewGuid();
            var customWidth = Guid.NewGuid();
            db.AppearanceProfiles.AddRange(
                new AppearanceProfile { UserId = formerDefault, SidebarWidth = 184, UpdatedAt = DateTimeOffset.UtcNow },
                new AppearanceProfile { UserId = customWidth, SidebarWidth = 320, UpdatedAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            await migrator.MigrateAsync();
            db.Database.HasPendingModelChanges().Should().BeFalse();
            (await db.AppearanceProfiles.SingleAsync(x => x.UserId == formerDefault)).SidebarWidth.Should().Be(235);
            (await db.AppearanceProfiles.SingleAsync(x => x.UserId == customWidth)).SidebarWidth.Should().Be(320);
            var script = migrator.GenerateScript();
            script.Should().Contain("SET DEFAULT 235");
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }

}
