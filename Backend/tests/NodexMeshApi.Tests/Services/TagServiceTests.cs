using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class TagServiceTests : IDisposable
{
    private readonly SqliteInMemoryDb _db = new();

    public void Dispose() => _db.Dispose();

    private async Task<(Guid ProjectId, Guid OwnerId, Guid ViewerId)> SeedProjectAsync()
    {
        var ownerId = Guid.NewGuid();
        var viewerId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        using var context = _db.CreateContext();
        context.Projects.Add(new Project
        {
            Id = projectId, OwnerId = ownerId, Name = "Tag project",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId
        });
        context.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = projectId, UserId = viewerId, Role = ProjectRole.Viewer,
            CreatedAt = DateTimeOffset.UtcNow, InvitedBy = ownerId
        });
        await context.SaveChangesAsync();
        return (projectId, ownerId, viewerId);
    }

    private TagService CreateService(out AppDbContext context)
    {
        context = _db.CreateContext();
        return new TagService(context, new ProjectAccessService(context));
    }

    [Fact]
    public async Task GetOrCreateAsync_CreatesANewTagWithANormalizedName()
    {
        var (projectId, ownerId, _) = await SeedProjectAsync();
        var service = CreateService(out _);

        var tag = await service.GetOrCreateAsync(projectId, ownerId, "  Roadmap  ");

        tag.Name.Should().Be("Roadmap");
        tag.NormalizedName.Should().Be("roadmap");
        tag.ProjectId.Should().Be(projectId);
    }

    [Fact]
    public async Task GetOrCreateAsync_ReusesAnExistingTagForTheSameNormalizedName()
    {
        var (projectId, ownerId, _) = await SeedProjectAsync();
        var service = CreateService(out var context);

        var first = await service.GetOrCreateAsync(projectId, ownerId, "Roadmap");
        var second = await service.GetOrCreateAsync(projectId, ownerId, "ROADMAP"); // different case

        second.Id.Should().Be(first.Id);
        (await context.Tags.CountAsync(t => t.ProjectId == projectId)).Should().Be(1);
    }

    [Fact]
    public async Task GetOrCreateAsync_TreatsSameNameInDifferentProjectsAsDistinctTags()
    {
        var (projectAId, ownerAId, _) = await SeedProjectAsync();
        var (projectBId, ownerBId, _) = await SeedProjectAsync();
        var service = CreateService(out _);

        var tagA = await service.GetOrCreateAsync(projectAId, ownerAId, "Urgent");
        var tagB = await service.GetOrCreateAsync(projectBId, ownerBId, "Urgent");

        tagA.Id.Should().NotBe(tagB.Id);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetOrCreateAsync_RejectsBlankNames(string name)
    {
        var (projectId, ownerId, _) = await SeedProjectAsync();
        var service = CreateService(out _);

        var act = () => service.GetOrCreateAsync(projectId, ownerId, name);

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_tag");
    }

    [Fact]
    public async Task GetOrCreateAsync_RejectsNamesLongerThan64Characters()
    {
        var (projectId, ownerId, _) = await SeedProjectAsync();
        var service = CreateService(out _);

        var act = () => service.GetOrCreateAsync(projectId, ownerId, new string('a', 65));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_tag");
    }

    [Fact]
    public async Task GetOrCreateAsync_RequiresAtLeastEditorRole()
    {
        var (projectId, _, viewerId) = await SeedProjectAsync();
        var service = CreateService(out _);

        var act = () => service.GetOrCreateAsync(projectId, viewerId, "Roadmap");

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task GetOrCreateAsync_Throws404_ForAUserWithNoAccessToTheProject()
    {
        var (projectId, _, _) = await SeedProjectAsync();
        var service = CreateService(out _);

        var act = () => service.GetOrCreateAsync(projectId, Guid.NewGuid(), "Roadmap");

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }
}
