using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NodexMeshApi.Auditing;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Auditing;

public class AuditTests
{
    [Fact]
    public async Task LoginAndFailure_ArePersistedWithoutCredentialsOrDuplicateHttpFailures()
    {
        await using var factory = new TestWebApplicationFactory();
        var (client, id, email, password) = await factory.CreateAuthenticatedUserAsync();
        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "WrongSecret!123")))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db.AuditEvents.ToListAsync();
        rows.Should().Contain(e => e.EventType == "auth.login_succeeded" && e.ActorId == id);
        rows.Should().ContainSingle(e => e.EventType == "auth.login_failed" && e.TargetUserId == id);
        rows.Should().NotContain(e => e.EventType == "http.unauthenticated");
        var json = JsonSerializer.Serialize(rows);
        json.Should().NotContain(password).And.NotContain("WrongSecret!123").And.NotContain("Bearer ");
        rows.Single(e => e.EventType == "auth.login_failed").AccountKey.Should().Be(AuditCapture.AccountKey(email));
    }

    [Fact]
    public async Task AdminQueries_AreProtectedPaginatedAndAudited()
    {
        await using var factory = new TestWebApplicationFactory();
        var anonymous = factory.CreateClientNoRedirect();
        (await anonymous.GetAsync("/api/v1/admin/audit/events")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var (user, _, _, _) = await factory.CreateSeededUserAsync();
        (await user.GetAsync("/api/v1/admin/audit/events")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var admin = await factory.CreateAdminClientAsync();
        var result = await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/audit/events?eventType=auth.login_succeeded&pageSize=1");
        result.GetProperty("items").GetArrayLength().Should().Be(1);
        result.GetProperty("items")[0].GetProperty("eventType").GetString().Should().Be("auth.login_succeeded");
        (await admin.GetAsync("/api/v1/admin/audit/events?clientIp=invalid")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.AuditEvents.AnyAsync(e => e.EventType == "admin.access")).Should().BeTrue();
    }

    [Fact]
    public async Task BusinessChanges_CommitWithAuditAndRollbackTogether()
    {
        using var store = new SqliteInMemoryDb();
        using var db = store.CreateContext();
        var project = new Project { Id = Guid.NewGuid(), OwnerId = Guid.NewGuid(), Name = "Confidential contents" };
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            db.Projects.Add(project);
            await db.SaveChangesAsync();
            (await db.AuditEvents.CountAsync()).Should().Be(1);
            await transaction.RollbackAsync();
        }
        db.ChangeTracker.Clear();
        (await db.AuditEvents.CountAsync()).Should().Be(0);
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = Guid.NewGuid(), Role = ProjectRole.Editor });
        db.ProjectShareLinks.Add(new ProjectShareLink { Id = Guid.NewGuid(), ProjectId = project.Id, TokenHash = "private-share-secret" });
        await db.SaveChangesAsync();
        project.DeletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        var rows = await db.AuditEvents.ToListAsync();
        rows.Select(e => e.EventType).Should().Contain(new[] { "project.added", "project.modified", "projectmember.added", "projectsharelink.added" });
        JsonSerializer.Serialize(rows).Should().NotContain(project.Name).And.NotContain("private-share-secret");
        var count = rows.Count;
        await db.SaveChangesAsync();
        (await db.AuditEvents.CountAsync()).Should().Be(count);
    }

    [Fact]
    public async Task ConcurrentTokenConsumption_OnlyOneSaveCommits()
    {
        using var store = new SqliteInMemoryDb();
        using var first = store.CreateContext();
        first.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), TokenHash = "hash", ExpiresAtUtc = DateTime.UtcNow.AddDays(1) });
        await first.SaveChangesAsync();
        using var second = store.CreateContext();
        var a = await first.RefreshTokens.SingleAsync();
        var b = await second.RefreshTokens.SingleAsync();
        a.RevokedAtUtc = DateTime.UtcNow;
        b.RevokedAtUtc = DateTime.UtcNow;
        await first.SaveChangesAsync();
        await second.Invoking(d => d.SaveChangesAsync()).Should().ThrowAsync<DbUpdateConcurrencyException>();
        (await first.AuditEvents.CountAsync()).Should().Be(1);
    }

    [Theory]
    [InlineData("192.0.2.20", "203.0.113.5", true, "203.0.113.5")]
    [InlineData("192.0.2.21", "203.0.113.5", true, "192.0.2.21")]
    [InlineData("192.0.2.20", "203.0.113.5", false, "192.0.2.20")]
    [InlineData("::ffff:192.0.2.21", "203.0.113.5", true, "192.0.2.21")]
    [InlineData("2001:db8::1", "203.0.113.5", true, "2001:db8::1")]
    public async Task Forwarding_OnlyExplicitTrustedPeersCanSupplyClientIp(string peer, string forwarded, bool trustedConfigured, string expected)
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse(peer);
        http.Request.Headers["X-Forwarded-For"] = forwarded;
        http.Request.Headers["X-Forwarded-Proto"] = "https";
        var config = new ConfigurationBuilder().AddInMemoryCollection(trustedConfigured
            ? new Dictionary<string, string?> { ["ReverseProxy:KnownProxies:0"] = "192.0.2.20" }
            : new Dictionary<string, string?>()).Build();
        var options = new ForwardedHeadersOptions();
        ClientIpResolver.Configure(options, config);
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Microsoft.Extensions.Options.Options.Create(options));
        await middleware.Invoke(http);
        ClientIpResolver.Resolve(http).Should().Be(expected);
    }

    [Fact]
    public async Task Incidents_RespectThresholdAndDeduplicate()
    {
        using var store = new SqliteInMemoryDb();
        using var db = store.CreateContext();
        var now = DateTime.UtcNow;
        var options = new AuditOptions { FailedLoginThreshold = 3 };
        for (var i = 0; i < 2; i++) db.AuditEvents.Add(new AuditEvent
        { EventType = "auth.login_failed", ClientIp = "192.0.2.1", AccountKey = "account", OccurredAt = now.AddSeconds(-1) });
        await db.SaveChangesAsync();
        await AuditMaintenanceService.DetectAsync(db, options, now, default);
        (await db.SecurityIncidents.CountAsync()).Should().Be(0);
        db.AuditEvents.Add(new AuditEvent { EventType = "auth.login_failed", ClientIp = "192.0.2.1", AccountKey = "account", OccurredAt = now });
        await db.SaveChangesAsync();
        await AuditMaintenanceService.DetectAsync(db, options, now, default);
        await AuditMaintenanceService.DetectAsync(db, options, now, default);
        (await db.SecurityIncidents.CountAsync()).Should().Be(1);
    }

    [Theory]
    [InlineData(400, "http.validation_failed")]
    [InlineData(401, "http.unauthenticated")]
    [InlineData(403, "http.forbidden")]
    [InlineData(404, "http.unmatched")]
    [InlineData(405, "http.method_rejected")]
    [InlineData(429, "http.rate_limited")]
    [InlineData(500, "http.server_error")]
    public async Task HttpFailures_AreClassifiedWithoutRetainingRawPaths(int status, string type)
    {
        await using var factory = new TestWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var http = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        http.Request.Path = "/secret-token/do-not-store";
        var middleware = new AuditMiddleware(context => { context.Response.StatusCode = status; return Task.CompletedTask; });
        await middleware.InvokeAsync(http, scope.ServiceProvider.GetRequiredService<AuditWriter>(), NullLogger<AuditMiddleware>.Instance);
        var row = await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync(e => e.EventType == type);
        row.Route.Should().Be("[unmatched]");
        row.ActorId.Should().BeNull();
        row.StatusCode.Should().Be(status);
    }

    [Fact]
    public async Task PersistenceFailure_ReportsHealthAndDoesNotFlushUnrelatedChanges()
    {
        await using var factory = new TestWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.NewGuid();
        db.AuditEvents.Add(new AuditEvent { Id = id, EventType = "test" });
        await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<AuditWriter>().WriteAsync(new AuditEvent { Id = id, EventType = "duplicate" });
        scope.ServiceProvider.GetRequiredService<AuditHealth>().Failures.Should().Be(1);
    }
    [Fact]
    public async Task IntentionalNotFound_IsNotReportedAsPathEnumeration()
    {
        await using var factory = new TestWebApplicationFactory();
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        (await client.GetAsync($"/api/v1/projects/{Guid.NewGuid()}"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.AuditEvents.AnyAsync(e => e.EventType == "http.unmatched")).Should().BeFalse();
    }

    [Fact]
    public async Task Retention_PreservesOpenIncidentEvidenceAndDeletesExpiredCategories()
    {
        using var store = new SqliteInMemoryDb();
        using var db = store.CreateContext();
        var old = new AuditEvent { EventType = "old", OccurredAt = DateTime.UtcNow.AddDays(-200) };
        var evidence = new AuditEvent { EventType = "evidence", OccurredAt = old.OccurredAt };
        db.AuditEvents.AddRange(old, evidence);
        db.SecurityIncidents.Add(new SecurityIncident { Rule = "test", Subject = "subject", EventId = evidence.Id, WindowStart = old.OccurredAt });
        await db.SaveChangesAsync();
        await AuditMaintenanceService.PruneAsync(db, new AuditOptions(), DateTime.UtcNow, default);
        (await db.AuditEvents.Select(e => e.EventType).ToListAsync()).Should().Equal("evidence");
    }

    [Fact]
    public async Task ReviewIncident_PersistsReviewerAndAuditTogether()
    {
        await using var factory = new TestWebApplicationFactory();
        var admin = await factory.CreateAdminClientAsync();
        var incident = new SecurityIncident { Rule = "test", Subject = "test", WindowStart = DateTime.UtcNow };
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.SecurityIncidents.Add(incident);
            await db.SaveChangesAsync();
        }
        var response = await admin.PatchAsJsonAsync($"/api/v1/admin/audit/incidents/{incident.Id}", new { status = "resolved" });
        response.EnsureSuccessStatusCode();
        using var verify = factory.Services.CreateScope();
        var stored = verify.ServiceProvider.GetRequiredService<AppDbContext>();
        var reviewed = await stored.SecurityIncidents.SingleAsync();
        reviewed.Status.Should().Be("resolved");
        reviewed.ReviewedBy.Should().NotBeNull();
        (await stored.AuditEvents.SingleAsync(e => e.EventType == "incident.reviewed")).ResourceId.Should().Be(incident.Id.ToString());
    }

    [Fact]
    public async Task MultiProxyChain_StopsBeforeSpoofedLeftmostAddress()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.20");
        http.Request.Headers["X-Forwarded-For"] = "198.51.100.99, 203.0.113.5, 192.0.2.30";
        http.Request.Headers["X-Forwarded-Proto"] = "https, https, http";
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ReverseProxy:KnownProxies:0"] = "192.0.2.20", ["ReverseProxy:KnownProxies:1"] = "192.0.2.30",
            ["ReverseProxy:ForwardLimit"] = "2"
        }).Build();
        var options = new ForwardedHeadersOptions();
        ClientIpResolver.Configure(options, config);
        await new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance,
            Microsoft.Extensions.Options.Options.Create(options)).Invoke(http);
        ClientIpResolver.Resolve(http).Should().Be("203.0.113.5");
        http.Request.Scheme.Should().Be("https");
    }

    [Theory]
    [InlineData("expired", "auth.refresh_expired")]
    [InlineData("revoked", "auth.refresh_revoked")]
    [InlineData("replay", "auth.refresh_reuse")]
    public async Task RefreshFailures_ProduceSpecificEventsAndReplayRevokesActiveSessions(string scenario, string expected)
    {
        await using var factory = new TestWebApplicationFactory();
        var (_, userId, _, _) = await factory.CreateSeededUserAsync();
        var raw = "audit-refresh-" + Guid.NewGuid().ToString("N");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tokens = scope.ServiceProvider.GetRequiredService<NodexMeshApi.Services.ITokenService>();
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(), UserId = userId, TokenHash = tokens.HashToken(raw), CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(scenario == "expired" ? -1 : 1),
                RevokedAtUtc = scenario == "revoked" ? DateTime.UtcNow : null
            });
            await db.SaveChangesAsync();
        }
        async Task<HttpResponseMessage> Send()
        {
            var client = factory.CreateClientNoRedirect();
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
            request.Headers.Add("X-Requested-With", "nodexmesh-web");
            request.Headers.Add("Cookie", "nodexmesh_refresh_token=" + raw);
            return await client.SendAsync(request);
        }
        if (scenario == "replay") (await Send()).StatusCode.Should().Be(HttpStatusCode.OK);
        (await Send()).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var verify = factory.Services.CreateScope();
        var stored = verify.ServiceProvider.GetRequiredService<AppDbContext>();
        var audit = await stored.AuditEvents.SingleAsync(e => e.EventType == expected);
        audit.TargetUserId.Should().Be(userId);
        JsonSerializer.Serialize(await stored.AuditEvents.ToListAsync()).Should().NotContain(raw);
        if (scenario == "replay")
        {
            audit.Severity.Should().Be("Critical");
            (await stored.RefreshTokens.AnyAsync(t => t.UserId == userId && t.RevokedAtUtc == null)).Should().BeFalse();
        }
    }

}
