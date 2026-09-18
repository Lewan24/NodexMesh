using FluentAssertions;
using NodexMeshApi.Common;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class ProjectAccessServiceTests : IDisposable
{
    private readonly SqliteInMemoryDb _db = new();

    public void Dispose() => _db.Dispose();

    private async Task<Guid> SeedProjectAsync(Guid ownerId, IEnumerable<(Guid UserId, ProjectRole Role)>? members = null, bool trashed = false)
    {
        var projectId = Guid.NewGuid();
        using var context = _db.CreateContext();
        context.Projects.Add(new Project
        {
            Id = projectId, OwnerId = ownerId, Name = "Test project",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId,
            DeletedAt = trashed ? DateTimeOffset.UtcNow : null
        });
        foreach (var (userId, role) in members ?? [])
        {
            context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId, UserId = userId, Role = role,
                CreatedAt = DateTimeOffset.UtcNow, InvitedBy = ownerId
            });
        }
        await context.SaveChangesAsync();
        return projectId;
    }

    [Fact]
    public async Task GetRoleAsync_ReturnsOwner_ForTheProjectOwner()
    {
        var ownerId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId);

        var access = new ProjectAccessService(_db.CreateContext());
        var role = await access.GetRoleAsync(projectId, ownerId);

        role.Should().Be(ProjectRole.Owner);
    }

    [Fact]
    public async Task GetRoleAsync_ReturnsTheMembersAssignedRole()
    {
        var ownerId = Guid.NewGuid();
        var editorId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId, [(editorId, ProjectRole.Editor)]);

        var access = new ProjectAccessService(_db.CreateContext());
        var role = await access.GetRoleAsync(projectId, editorId);

        role.Should().Be(ProjectRole.Editor);
    }

    [Fact]
    public async Task GetRoleAsync_ReturnsNone_ForAnUnrelatedUser()
    {
        var projectId = await SeedProjectAsync(Guid.NewGuid());

        var access = new ProjectAccessService(_db.CreateContext());
        var role = await access.GetRoleAsync(projectId, Guid.NewGuid());

        role.Should().Be(ProjectRole.None);
    }

    [Fact]
    public async Task GetRoleAsync_ReturnsNone_ForANonexistentProject()
    {
        var access = new ProjectAccessService(_db.CreateContext());
        var role = await access.GetRoleAsync(Guid.NewGuid(), Guid.NewGuid());

        role.Should().Be(ProjectRole.None);
    }

    [Fact]
    public async Task GetRoleAsync_ReturnsNone_ForATrashedProject_EvenForItsOwner()
    {
        // The global soft-delete query filter must apply here too, or a "restore" bug could
        // leave a trashed project's owner with a working access token to it (OWASP A01).
        var ownerId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId, trashed: true);

        var access = new ProjectAccessService(_db.CreateContext());
        var role = await access.GetRoleAsync(projectId, ownerId);

        role.Should().Be(ProjectRole.None);
    }

    [Fact]
    public async Task RequireAsync_Throws404NotFound_ForAUserWithNoAccessAtAll()
    {
        // Deliberately 404, not 403 — a 403 would confirm the project exists (existence
        // oracle). This is the core anti-enumeration guarantee of the access layer.
        var projectId = await SeedProjectAsync(Guid.NewGuid());
        var access = new ProjectAccessService(_db.CreateContext());

        var act = () => access.RequireAsync(projectId, Guid.NewGuid(), ProjectRole.Viewer);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task RequireAsync_Throws403Forbidden_ForAUserWithInsufficientRole()
    {
        // A Viewer DOES have access (they already know the project exists), so insufficient
        // permission for a higher-privilege action is a real, honest 403.
        var ownerId = Guid.NewGuid();
        var viewerId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId, [(viewerId, ProjectRole.Viewer)]);
        var access = new ProjectAccessService(_db.CreateContext());

        var act = () => access.RequireAsync(projectId, viewerId, ProjectRole.Editor);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task RequireAsync_Succeeds_WhenRoleMeetsTheMinimum()
    {
        var ownerId = Guid.NewGuid();
        var editorId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId, [(editorId, ProjectRole.Editor)]);
        var access = new ProjectAccessService(_db.CreateContext());

        var act = () => access.RequireAsync(projectId, editorId, ProjectRole.Editor);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task RequireAsync_Succeeds_WhenOwnerActsAtAnyLevel()
    {
        var ownerId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId);
        var access = new ProjectAccessService(_db.CreateContext());

        var act = () => access.RequireAsync(projectId, ownerId, ProjectRole.Owner);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task RequireForBoardAsync_ResolvesTheBoardsProjectAndAppliesTheSameRule()
    {
        var ownerId = Guid.NewGuid();
        var commenterId = Guid.NewGuid();
        var projectId = await SeedProjectAsync(ownerId, [(commenterId, ProjectRole.Commenter)]);
        var boardId = Guid.NewGuid();
        using (var context = _db.CreateContext())
        {
            context.Boards.Add(new Board
            {
                Id = boardId, ProjectId = projectId, Name = "Board",
                CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
                CreatedBy = ownerId, UpdatedBy = ownerId
            });
            await context.SaveChangesAsync();
        }
        var access = new ProjectAccessService(_db.CreateContext());

        // Commenter is enough to view...
        var resolvedProjectId = await access.RequireForBoardAsync(boardId, commenterId, ProjectRole.Viewer);
        resolvedProjectId.Should().Be(projectId);

        // ...but not enough to edit.
        var act = () => access.RequireForBoardAsync(boardId, commenterId, ProjectRole.Editor);
        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task RequireForBoardAsync_Throws404_ForANonexistentBoard()
    {
        var access = new ProjectAccessService(_db.CreateContext());

        var act = () => access.RequireForBoardAsync(Guid.NewGuid(), Guid.NewGuid(), ProjectRole.Viewer);

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }
}
