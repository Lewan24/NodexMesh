using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Auditing;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Auditing;

public sealed class IpProtectionTests : IDisposable
{
    private readonly SqliteInMemoryDb database = new();
    private readonly IpProtectionOptions options = new() { FailedLoginThreshold = 3, UnauthorizedThreshold = 3, NotFoundThreshold = 3, RateLimitThreshold = 3, BanOnRateLimit = true };
    public void Dispose() => database.Dispose();

    [Theory]
    [InlineData("http.unauthenticated", "/api/v1/auth/refresh")]
    [InlineData("http.unauthenticated", "/api/v1/auth/profile")]
    [InlineData("http.not_found", "/api/v1/projects/deleted")]
    [InlineData("http.unmatched", "/assets/old-deployment.js")]
    [InlineData("http.unmatched", "/favicon.ico")]
    public async Task NormalReloadFailuresRemainAuditableButDoNotCountTowardBans(string eventType, string route)
    {
        await using var db = database.CreateContext();
        var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
        for (var i = 0; i < 10; i++)
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = eventType, Route = route }, default);
        (await db.IpAccessStates.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task FailedProfilePasswordVerificationStillCountsAsUnauthorized()
    {
        await using var db = database.CreateContext();
        var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
        for (var i = 0; i < 3; i++)
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = "http.unauthenticated",
                Route = "/api/v1/auth/profile", Method = "PUT" }, default);
        (await service.IsBannedAsync("192.0.2.1", default)).Should().BeTrue();
    }

    [Fact]
    public async Task RateLimitFailuresAreCountersOnlyByDefaultAndCannotBanNormalTraffic()
    {
        options.BanOnRateLimit = false;
        await using var db = database.CreateContext();
        var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
        for (var i = 0; i < 10; i++)
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = "http.rate_limited" }, default);
        (await service.IsBannedAsync("192.0.2.1", default)).Should().BeFalse();
        (await db.IpAccessStates.SingleAsync()).RateLimited.Should().Be(10);
    }

    [Fact]
    public async Task BanImmediatelyAbortsMatchingLiveSocketsAndRetainsOtherClients()
    {
        await using var db = database.CreateContext();
        var registry = new IpConnectionRegistry();
        var banned = new Moq.Mock<Microsoft.AspNetCore.SignalR.HubCallerContext>();
        banned.SetupGet(x => x.ConnectionId).Returns("banned-connection");
        var allowed = new Moq.Mock<Microsoft.AspNetCore.SignalR.HubCallerContext>();
        allowed.SetupGet(x => x.ConnectionId).Returns("allowed-connection");
        registry.Add(banned.Object, "192.0.2.1");
        registry.Add(allowed.Object, "192.0.2.2");
        options.FailedLoginThreshold = 1;
        await new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options), registry)
            .RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = "auth.login_failed" }, default);
        banned.Verify(x => x.Abort(), Moq.Times.Once);
        allowed.Verify(x => x.Abort(), Moq.Times.Never);
        registry.Remove("banned-connection");
        registry.Ips.Should().Equal("192.0.2.2");
    }

    [Theory]
    [InlineData("auth.login_failed")]
    [InlineData("auth.mfa_failed")]
    [InlineData("http.unauthenticated")]
    [InlineData("http.forbidden")]
    [InlineData("http.unmatched")]
    [InlineData("http.rate_limited")]
    public async Task ThresholdBansPersistAcrossScopesAndStopEveryRequest(string eventType)
    {
        for (var i = 0; i < 3; i++)
        {
            await using var db = database.CreateContext();
            var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
            (await service.IsBannedAsync("192.0.2.1", default)).Should().BeFalse();
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = eventType }, default);
        }
        await using var reader = database.CreateContext();
        var protection = new IpProtectionService(reader, Microsoft.Extensions.Options.Options.Create(options));
        (await protection.IsBannedAsync("192.0.2.1", default)).Should().BeTrue();
        (await protection.IsBannedAsync("192.0.2.2", default)).Should().BeFalse();
        foreach (var path in new[] { "/", "/assets/app.js", "/api/v1/auth/login", "/hubs/collaboration", "/api/v1/admin/security/ips", "/api/v1/security/ip-check" })
        {
            var http = new DefaultHttpContext();
            http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.1");
            http.Request.Path = path;
            http.Response.Body = new MemoryStream();
            var reached = false;
            await new IpProtectionMiddleware(_ => { reached = true; return Task.CompletedTask; }).InvokeAsync(http, protection);
            reached.Should().BeFalse();
            http.Response.StatusCode.Should().Be(403);
        }
        (await reader.AuditEvents.CountAsync(x => x.EventType == "security.ip_banned")).Should().Be(1);
    }

    [Fact]
    public async Task ExpiredBansAndOldWindowsStartWithFreshCounters()
    {
        await using var db = database.CreateContext();
        db.IpAccessStates.Add(new IpAccessState { Ip = "192.0.2.1", BannedUntil = DateTime.UtcNow.AddSeconds(-1), WindowStart = DateTime.UtcNow, FailedLogins = 100 });
        db.IpAccessStates.Add(new IpAccessState { Ip = "192.0.2.2", WindowStart = DateTime.UtcNow.AddMinutes(-11), FailedLogins = 100 });
        await db.SaveChangesAsync();
        var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
        foreach (var ip in new[] { "192.0.2.1", "192.0.2.2" })
        {
            await service.RecordAsync(new AuditEvent { ClientIp = ip, EventType = "auth.login_failed" }, default);
            (await service.IsBannedAsync(ip, default)).Should().BeFalse();
            (await db.IpAccessStates.SingleAsync(x => x.Ip == ip)).FailedLogins.Should().Be(1);
        }
    }

    [Fact]
    public async Task AllowlistedDisabledSuccessfulAndDelayedReleasedEventsDoNotBan()
    {
        options.Allowlist = ["::ffff:192.0.2.1"];
        await using var db = database.CreateContext();
        var service = new IpProtectionService(db, Microsoft.Extensions.Options.Options.Create(options));
        for (var i = 0; i < 6; i++)
        {
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.1", EventType = "http.unmatched" }, default);
            await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.2", EventType = "http.request" }, default);
        }
        (await db.IpAccessStates.CountAsync()).Should().Be(0);
        db.IpAccessStates.Add(new IpAccessState { Ip = "192.0.2.3", ReleasedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.3", EventType = "http.unmatched", OccurredAt = DateTime.UtcNow.AddMinutes(-1) }, default);
        (await db.IpAccessStates.SingleAsync()).NotFound.Should().Be(0);
        options.Enabled = false;
        await service.RecordAsync(new AuditEvent { ClientIp = "192.0.2.4", EventType = "http.unmatched" }, default);
        (await db.IpAccessStates.CountAsync()).Should().Be(1);
    }
}
