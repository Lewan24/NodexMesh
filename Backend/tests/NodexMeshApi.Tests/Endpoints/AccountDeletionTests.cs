using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Models;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public class AccountDeletionTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new(useNpgsqlRetryStrategy: true);
    public void Dispose() => factory.Dispose();

    [Fact]
    public async Task Registration_RequiresExplicitAcknowledgement()
    {
        var client = factory.CreateClientNoRedirect();
        var result = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest("notice@example.test", "Correct#Horse9Battery", "Correct#Horse9Battery", "Notice"));
        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_ResolvesProjectsRevokesAccessAndRestoreDoesNotUndoDecisions()
    {
        var (client, id, email, password) = await factory.CreateAuthenticatedUserAsync();
        var admin = await factory.CreateAdminClientAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var other = await db.Users.SingleAsync(u => u.IsAdmin);
        var transfer = new Project { Id = Guid.NewGuid(), OwnerId = id, Name = "Transfer", DeletedAt = DateTimeOffset.UtcNow };
        var delete = new Project { Id = Guid.NewGuid(), OwnerId = id, Name = "Delete" };
        var shared = new Project { Id = Guid.NewGuid(), OwnerId = other.Id, Name = "Shared" };
        db.Projects.AddRange(transfer, delete, shared);
        db.ProjectMembers.AddRange(new ProjectMember { ProjectId = transfer.Id, UserId = other.Id, Role = ProjectRole.Editor },
            new ProjectMember { ProjectId = shared.Id, UserId = id, Role = ProjectRole.Viewer });
        await db.SaveChangesAsync();
        (await client.GetAsync("/api/v1/auth/account-deletion")).StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await client.PostAsJsonAsync("/api/v1/auth/account-deletion", new DeleteAccountRequest(password,
            [new(transfer.Id, "transfer", other.Id), new(delete.Id, "delete", null)]));
        result.StatusCode.Should().Be(HttpStatusCode.NoContent);
        db.ChangeTracker.Clear();
        (await db.Users.FindAsync(id))!.IsBlocked.Should().BeTrue();
        (await db.Projects.IgnoreQueryFilters().SingleAsync(p => p.Id == transfer.Id)).OwnerId.Should().Be(other.Id);
        (await db.Projects.IgnoreQueryFilters().AnyAsync(p => p.Id == delete.Id)).Should().BeFalse();
        (await db.ProjectMembers.AnyAsync(m => m.UserId == id)).Should().BeFalse();
        (await client.GetAsync("/api/v1/auth/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await admin.PostAsync($"/api/v1/admin/users/{id}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync("/api/v1/auth/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password))).StatusCode.Should().Be(HttpStatusCode.OK);
        db.ChangeTracker.Clear();
        (await db.Users.FindAsync(id))!.DeletionRequestedAt.Should().BeNull();
        (await db.ProjectMembers.AnyAsync(m => m.UserId == id)).Should().BeFalse();
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("outsider")]
    [InlineData("password")]
    public async Task InvalidDecisions_LeaveAccountAndProjectsIntact(string scenario)
    {
        var (client, id, _, password) = await factory.CreateAuthenticatedUserAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var project = new Project { Id = Guid.NewGuid(), OwnerId = id, Name = "Keep" };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        var result = await client.PostAsJsonAsync("/api/v1/auth/account-deletion", new DeleteAccountRequest(
            scenario == "password" ? "wrong" : password, scenario == "missing" ? [] :
            [new(project.Id, "transfer", Guid.NewGuid())]));
        result.IsSuccessStatusCode.Should().BeFalse();
        db.ChangeTracker.Clear();
        (await db.Users.FindAsync(id))!.IsBlocked.Should().BeFalse();
        (await db.Projects.FindAsync(project.Id))!.OwnerId.Should().Be(id);
    }

    [Fact]
    public async Task AdminCanPurgePendingAccount_ButNotActiveAccount()
    {
        var (client, id, _, password) = await factory.CreateAuthenticatedUserAsync();
        var admin = await factory.CreateAdminClientAsync();
        (await admin.DeleteAsync($"/api/v1/admin/users/{id}/permanent")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await client.PostAsJsonAsync("/api/v1/auth/account-deletion", new DeleteAccountRequest(password, []))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.DeleteAsync($"/api/v1/admin/users/{id}/permanent")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.AnyAsync(u => u.Id == id)).Should().BeFalse();
        (await db.RefreshTokens.AnyAsync(t => t.UserId == id)).Should().BeFalse();
        (await db.AppearanceProfiles.AnyAsync(p => p.UserId == id)).Should().BeFalse();
    }

    [Fact]
    public async Task BlockedAccountPurgeRequiresResolvingOwnedProjects()
    {
        var (_, id, _, _) = await factory.CreateAuthenticatedUserAsync();
        var admin = await factory.CreateAdminClientAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(id);
        user!.IsBlocked = true;
        var project = new Project { Id = Guid.NewGuid(), OwnerId = id, Name = "Owned" };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        (await admin.DeleteAsync($"/api/v1/admin/users/{id}/permanent")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        (await admin.DeleteAsync($"/api/v1/admin/users/{id}/permanent")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        db.ChangeTracker.Clear();
        (await db.Users.AnyAsync(u => u.Id == id)).Should().BeFalse();
    }

    [Fact]
    public async Task LastAdministratorCannotDeleteAccount()
    {
        var admin = await factory.CreateAdminClientAsync();
        (await admin.PostAsJsonAsync("/api/v1/auth/account-deletion",
            new DeleteAccountRequest(TestWebApplicationFactory.AdminPassword, []))).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
