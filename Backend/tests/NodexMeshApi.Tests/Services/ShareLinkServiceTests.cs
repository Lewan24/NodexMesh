using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class ShareLinkServiceTests : IDisposable
{
    private readonly SqliteInMemoryDb _db = new();
    private readonly FakeTimeProvider _clock = new();

    public void Dispose() => _db.Dispose();

    private async Task<(Guid ProjectId, Guid OwnerId)> SeedProjectAsync(bool trashed = false)
    {
        var ownerId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        using var context = _db.CreateContext();
        context.Projects.Add(new Project
        {
            Id = projectId, OwnerId = ownerId, Name = "Shared project",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId,
            DeletedAt = trashed ? DateTimeOffset.UtcNow : null
        });
        await context.SaveChangesAsync();
        return (projectId, ownerId);
    }

    [Fact]
    public async Task CreateAsync_Throws403_WhenCallerIsNotOwner()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        using var context = _db.CreateContext();
        context.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = projectId, UserId = Guid.NewGuid(), Role = ProjectRole.Editor,
            CreatedAt = DateTimeOffset.UtcNow, InvitedBy = ownerId
        });
        await context.SaveChangesAsync();

        var editorId = await context.ProjectMembers.Select(m => m.UserId).FirstAsync();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);

        var act = () => service.CreateAsync(projectId, editorId, new CreateShareLinkRequest(null, null));

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task CreateAsync_Succeeds_AndTheRawTokenIsNeverPersisted()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);

        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest("Client review", null));

        created.Token.Should().NotBeNullOrWhiteSpace();
        created.Link.ProjectId.Should().Be(projectId);
        created.Link.IsActive.Should().BeTrue();

        var stored = await context.ProjectShareLinks.SingleAsync(l => l.Id == created.Link.Id);
        stored.TokenHash.Should().NotBe(created.Token);
        stored.TokenHash.Should().NotContain(created.Token);
    }

    [Fact]
    public async Task CreateAsync_Rejects_PastExpiry()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);

        var act = () => service.CreateAsync(projectId, ownerId,
            new CreateShareLinkRequest(null, _clock.GetUtcNow().AddMinutes(-1)));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_expiry");
    }

    [Fact]
    public async Task CreateAsync_Rejects_WhenTheActiveLinkLimitIsReached()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);

        for (var i = 0; i < 20; i++)
            await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest($"link-{i}", null));

        var act = () => service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest("one-too-many", null));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("share_link_limit");
    }

    [Fact]
    public async Task RevokeAsync_IsIdempotent()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest(null, null));

        await service.RevokeAsync(projectId, created.Link.Id, ownerId);
        var act = () => service.RevokeAsync(projectId, created.Link.Id, ownerId); // second call, already revoked

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task RevokeAsync_ScopedByProjectId_PreventsCrossProjectRevocation()
    {
        // Without the projectId scope, an owner of project A could revoke project B's link
        // just by guessing/observing its id (IDOR).
        var (projectAId, ownerAId) = await SeedProjectAsync();
        var (projectBId, _) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var linkOnB = await service.CreateAsync(projectBId, await OwnerOf(context, projectBId), new CreateShareLinkRequest(null, null));

        var act = () => service.RevokeAsync(projectAId, linkOnB.Link.Id, ownerAId);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    private static async Task<Guid> OwnerOf(AppDbContext context, Guid projectId) =>
        (await context.Projects.SingleAsync(p => p.Id == projectId)).OwnerId;

    [Fact]
    public async Task ResolveProjectIdAsync_Throws404_ForAnUnknownToken()
    {
        var (projectId, _) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        await service.CreateAsync(projectId, (await context.Projects.SingleAsync()).OwnerId, new CreateShareLinkRequest(null, null));

        var act = () => service.ResolveProjectIdAsync(new string('a', 43)); // right shape, wrong value

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_Throws404_ForObviouslyMalformedTokens_WithoutHittingTheDatabase()
    {
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);

        (await Assert.ThrowsAsync<ApiException>(() => service.ResolveProjectIdAsync(""))).StatusCode.Should().Be(404);
        (await Assert.ThrowsAsync<ApiException>(() => service.ResolveProjectIdAsync("short"))).StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_ReturnsTheProjectId_ForAValidActiveToken()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest(null, null));

        var resolved = await service.ResolveProjectIdAsync(created.Token);

        resolved.Should().Be(projectId);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_Throws404_ForARevokedToken()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest(null, null));
        await service.RevokeAsync(projectId, created.Link.Id, ownerId);

        var act = () => service.ResolveProjectIdAsync(created.Token);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_Throws404_ForAnExpiredToken()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId,
            new CreateShareLinkRequest(null, _clock.GetUtcNow().AddMinutes(5)));

        _clock.Advance(TimeSpan.FromMinutes(10));

        var act = () => service.ResolveProjectIdAsync(created.Token);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_Throws404_WhenTheProjectHasBeenTrashedSinceTheLinkWasCreated()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest(null, null));

        var project = await context.Projects.IgnoreQueryFilters().SingleAsync(p => p.Id == projectId);
        project.DeletedAt = _clock.GetUtcNow();
        await context.SaveChangesAsync();

        var act = () => service.ResolveProjectIdAsync(created.Token);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task ResolveProjectIdAsync_ThrottlesAccessCountingToOncePerMinute()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var created = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest(null, null));

        await service.ResolveProjectIdAsync(created.Token);
        await service.ResolveProjectIdAsync(created.Token);
        await service.ResolveProjectIdAsync(created.Token);

        var afterRapidHits = await context.ProjectShareLinks.SingleAsync(l => l.Id == created.Link.Id);
        afterRapidHits.AccessCount.Should().Be(1);

        _clock.Advance(TimeSpan.FromMinutes(2));
        await service.ResolveProjectIdAsync(created.Token);

        var afterDelayedHit = await context.ProjectShareLinks.SingleAsync(l => l.Id == created.Link.Id);
        afterDelayedHit.AccessCount.Should().Be(2);
    }

    [Fact]
    public async Task ListAsync_ExcludesRevokedLinks()
    {
        var (projectId, ownerId) = await SeedProjectAsync();
        var context = _db.CreateContext();
        var service = new ShareLinkService(context, new ProjectAccessService(context), _clock);
        var kept = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest("keep", null));
        var revoked = await service.CreateAsync(projectId, ownerId, new CreateShareLinkRequest("revoke-me", null));
        await service.RevokeAsync(projectId, revoked.Link.Id, ownerId);

        var links = await service.ListAsync(projectId, ownerId);

        links.Should().ContainSingle(l => l.Id == kept.Link.Id);
        links.Should().NotContain(l => l.Id == revoked.Link.Id);
    }
}
