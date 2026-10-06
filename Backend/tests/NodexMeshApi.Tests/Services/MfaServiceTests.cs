using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Moq;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public sealed class MfaServiceTests : IDisposable
{
    private readonly SqliteInMemoryDb database = new();
    private readonly FakeTimeProvider clock = new();
    private readonly IDataProtectionProvider protection = new EphemeralDataProtectionProvider();
    private readonly Mock<IEmailQueue> email = new();
    private string emailedCode = "";

    public MfaServiceTests()
    {
        email.Setup(x => x.IsEnabledAsync(It.IsAny<NodexMeshApi.Data.AppDbContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        email.Setup(x => x.QueueTemplateAsync(It.IsAny<NodexMeshApi.Data.AppDbContext>(), "account.mfa-code",
            It.IsAny<string>(), It.IsAny<IReadOnlyDictionary<string, string>>(), It.IsAny<CancellationToken>()))
            .Callback<NodexMeshApi.Data.AppDbContext, string, string, IReadOnlyDictionary<string, string>, CancellationToken>((_, _, _, values, _) => emailedCode = values["code"])
            .ReturnsAsync(true);
    }

    public void Dispose() => database.Dispose();
    private ApplicationUser User(string method = "email") => new()
    {
        Id = Guid.NewGuid(), Email = "mfa@example.test", UserName = "mfa@example.test",
        SecurityStamp = Guid.NewGuid().ToString(), ConcurrencyStamp = Guid.NewGuid().ToString(),
        TwoFactorEnabled = true, MfaPreferredMethod = method
    };

    [Theory]
    [InlineData(59, "287082")]
    [InlineData(1111111109, "081804")]
    [InlineData(1111111111, "050471")]
    [InlineData(1234567890, "005924")]
    [InlineData(2000000000, "279037")]
    [InlineData(20000000000, "353130")]
    public void Totp_MatchesRfc6238Vectors(long seconds, string expected)
    {
        var secret = MfaService.Base32(Encoding.ASCII.GetBytes("12345678901234567890"));
        MfaService.Totp(secret, seconds / 30).Should().Be(expected);
        MfaService.MatchStep(secret, expected, DateTimeOffset.FromUnixTimeSeconds(seconds), seconds / 30).Should().BeNull();
        MfaService.MatchStep(secret, "12345x", DateTimeOffset.FromUnixTimeSeconds(seconds), null).Should().BeNull();
    }

    [Fact]
    public async Task EmailCodes_AreProtected_Expire_AndAreSingleUse()
    {
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        var challenge = await service.StartAsync(user, "login");
        var code = emailedCode;
        var row = await db.MfaChallenges.SingleAsync();
        row.TokenHash.Should().NotBe(challenge.ChallengeToken);
        row.EmailCodeHash.Should().NotBe(MfaService.Hash(challenge.ChallengeToken + ":" + code));
        await service.VerifyAsync(new(challenge.ChallengeToken, code), "login");
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, code), "login")).Should().ThrowAsync<ApiException>();
        challenge = await service.StartAsync(user, "login");
        clock.Advance(TimeSpan.FromMinutes(5));
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, emailedCode), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task FailedAttempts_PersistAcrossContexts_AndExhaustChallenge()
    {
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        var challenge = await service.StartAsync(user, "login");
        var code = emailedCode;
        for (var i = 0; i < 5; i++)
        {
            await using var attemptDb = database.CreateContext();
            var attemptService = new MfaService(attemptDb, protection, email.Object, clock);
            await FluentActions.Awaiting(() => attemptService.VerifyAsync(new(challenge.ChallengeToken, "wrong"), "login")).Should().ThrowAsync<ApiException>();
        }
        db.ChangeTracker.Clear();
        (await db.MfaChallenges.SingleAsync()).Attempts.Should().Be(5);
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, code), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task Challenge_IsBoundToUserPurposeAndSecurityStamp_AndSuperseded()
    {
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        var first = await service.StartAsync(user, "login"); var firstCode = emailedCode;
        var next = await service.StartAsync(user, "login"); var code = emailedCode;
        await FluentActions.Awaiting(() => service.VerifyAsync(new(first.ChallengeToken, firstCode), "login")).Should().ThrowAsync<ApiException>();
        await FluentActions.Awaiting(() => service.VerifyAsync(new(next.ChallengeToken, code), "manage")).Should().ThrowAsync<ApiException>();
        await FluentActions.Awaiting(() => service.VerifyAsync(new(next.ChallengeToken, code), "login", Guid.NewGuid())).Should().ThrowAsync<ApiException>();
        user.SecurityStamp = "changed"; await db.SaveChangesAsync();
        await FluentActions.Awaiting(() => service.VerifyAsync(new(next.ChallengeToken, code), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task Authenticator_WorksWithoutEmail_AndRejectsReplayAcrossChallenges()
    {
        email.Setup(x => x.IsEnabledAsync(It.IsAny<NodexMeshApi.Data.AppDbContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        await using var db = database.CreateContext();
        var service = new MfaService(db, protection, email.Object, clock);
        var user = User("authenticator");
        var secret = MfaService.Base32(System.Security.Cryptography.RandomNumberGenerator.GetBytes(20));
        user.MfaSecretProtected = service.Protect(secret); db.Users.Add(user); await db.SaveChangesAsync();
        var challenge = await service.StartAsync(user, "login");
        var code = MfaService.Totp(secret, clock.GetUtcNow().ToUnixTimeSeconds() / 30);
        await service.VerifyAsync(new(challenge.ChallengeToken, code), "login");
        challenge = await service.StartAsync(user, "login");
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, code), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task RecoveryCodes_AreHashedSingleUse_AndWorkWhenMailDisabled()
    {
        email.Setup(x => x.IsEnabledAsync(It.IsAny<NodexMeshApi.Data.AppDbContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        var codes = await service.ReplaceRecoveryCodesAsync(user, default); await db.SaveChangesAsync();
        (await db.MfaRecoveryCodes.FirstAsync()).CodeHash.Should().NotBe(codes[0]);
        var challenge = await service.StartAsync(user, "login"); challenge.Method.Should().Be("recovery");
        await service.VerifyAsync(new(challenge.ChallengeToken, codes[0]), "login");
        challenge = await service.StartAsync(user, "login");
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, codes[0]), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task SwitchingToAuthenticator_RequiresOldAndNewFactors()
    {
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        var challenge = await service.StartAsync(user, "manage", true, "authenticator");
        var code = emailedCode;
        challenge.SetupSecret.Should().NotBeNull();
        var setupCode = MfaService.Totp(challenge.SetupSecret!, clock.GetUtcNow().ToUnixTimeSeconds() / 30);
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, code), "manage", user.Id)).Should().ThrowAsync<ApiException>();
        await service.VerifyAsync(new(challenge.ChallengeToken, code, setupCode), "manage", user.Id);
    }
    [Fact]
    public async Task ConcurrentVerification_OnlyOneContextConsumesTheChallenge()
    {
        await using var firstDb = database.CreateContext();
        var user = User(); firstDb.Users.Add(user); await firstDb.SaveChangesAsync();
        var first = new MfaService(firstDb, protection, email.Object, clock);
        var challenge = await first.StartAsync(user, "login"); var code = emailedCode;
        await using var secondDb = database.CreateContext();
        await secondDb.MfaChallenges.SingleAsync();
        await secondDb.Users.SingleAsync();
        var second = new MfaService(secondDb, protection, email.Object, clock);
        await first.VerifyAsync(new(challenge.ChallengeToken, code), "login");
        await FluentActions.Awaiting(() => second.VerifyAsync(new(challenge.ChallengeToken, code), "login")).Should().ThrowAsync<ApiException>();
    }

    [Fact]
    public async Task PartialEnrollmentProof_DoesNotConsumeTheOldTotp()
    {
        await using var db = database.CreateContext();
        var service = new MfaService(db, protection, email.Object, clock);
        var user = User("authenticator");
        var secret = MfaService.Base32(System.Security.Cryptography.RandomNumberGenerator.GetBytes(20));
        user.MfaSecretProtected = service.Protect(secret); db.Users.Add(user); await db.SaveChangesAsync();
        var challenge = await service.StartAsync(user, "manage", true, "email"); var newCode = emailedCode;
        var oldCode = MfaService.Totp(secret, clock.GetUtcNow().ToUnixTimeSeconds() / 30);
        await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, oldCode), "manage", user.Id)).Should().ThrowAsync<ApiException>();
        user.MfaLastAcceptedStep.Should().BeNull();
        await service.VerifyAsync(new(challenge.ChallengeToken, oldCode, newCode), "manage", user.Id);
    }

    [Fact]
    public async Task NewChallenges_DoNotResetAccountLockout()
    {
        await using var db = database.CreateContext();
        var user = User(); db.Users.Add(user); await db.SaveChangesAsync();
        var service = new MfaService(db, protection, email.Object, clock);
        for (var i = 0; i < 5; i++)
        {
            var challenge = await service.StartAsync(user, "login");
            await FluentActions.Awaiting(() => service.VerifyAsync(new(challenge.ChallengeToken, "wrong"), "login")).Should().ThrowAsync<ApiException>();
        }
        user.LockoutEnd.Should().BeAfter(clock.GetUtcNow());
        var last = await service.StartAsync(user, "login");
        await FluentActions.Awaiting(() => service.VerifyAsync(new(last.ChallengeToken, emailedCode), "login")).Should().ThrowAsync<ApiException>();
    }

}
