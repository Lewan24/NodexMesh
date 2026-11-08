using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Dtos;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class IdentityMediaEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    private readonly string directory = Path.Combine(Path.GetTempPath(), "nodex-images-" + Guid.NewGuid());
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
    private static readonly byte[] Gif = Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    private void Configure() => factory.Services.GetRequiredService<IOptions<PublicImageOptions>>().Value.Path = directory;
    private string FilePath(Guid id) => Path.Combine(directory, id.ToString("N"));
    private static async Task<Guid> Upload(HttpClient client, string path, byte[] bytes, string filename, string property = "avatarId")
    {
        var response = await client.PutAsync(path + "?name=" + Uri.EscapeDataString(filename), new ByteArrayContent(bytes));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty(property).GetGuid();
    }

    [Fact]
    public async Task AvatarUpdateCannotBeOverwrittenByAStaleIdentityProfileUpdate()
    {
        Configure();
        var (client, userId, _, _) = await factory.CreateSeededUserAsync();
        using var scope = factory.Services.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var stale = (await manager.FindByIdAsync(userId.ToString()))!;
        var image = await Upload(client, "/api/v1/auth/profile/avatar", Png, "current.png");
        stale.DisplayName = "Concurrent rename";
        var update = await manager.UpdateAsync(stale);
        update.Succeeded.Should().BeFalse();
        update.Errors.Should().Contain(error => error.Code == "ConcurrencyFailure");
        using var check = factory.Services.CreateScope();
        var current = await check.ServiceProvider.GetRequiredService<AppDbContext>().Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        current.AvatarId.Should().Be(image);
        File.Exists(FilePath(image)).Should().BeTrue();
    }

    [Fact]
    public async Task ImageCleanupKeepsReferencedFilesAndRetriesOnlyOldOrphans()
    {
        Configure();
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        var current = await Upload(client, "/api/v1/auth/profile/avatar", Png, "current.png");
        var orphan = Guid.NewGuid();
        var uploading = Guid.NewGuid();
        await File.WriteAllBytesAsync(FilePath(orphan), Png);
        await File.WriteAllBytesAsync(FilePath(uploading), Png);
        File.SetLastWriteTimeUtc(FilePath(current), DateTime.UtcNow.AddDays(-3));
        File.SetLastWriteTimeUtc(FilePath(orphan), DateTime.UtcNow.AddDays(-3));
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<PublicImageStorage>().CleanUnreferencedAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), default);
        File.Exists(FilePath(current)).Should().BeTrue();
        File.Exists(FilePath(uploading)).Should().BeTrue();
        File.Exists(FilePath(orphan)).Should().BeFalse();
    }

    [Fact]
    public async Task AvatarReplacement_RemovesOldFile_AndServesGifToOtherUsers()
    {
        Configure();
        var (client, userId, _, _) = await factory.CreateSeededUserAsync();
        using var viewer = factory.CreateClientNoRedirect();
        const string path = "/api/v1/auth/profile/avatar";
        var first = await Upload(client, path, Png, "photo.png");
        File.Exists(FilePath(first)).Should().BeTrue();
        var second = await Upload(client, path, Gif, "animation.gif");
        second.Should().NotBe(first);
        File.Exists(FilePath(first)).Should().BeFalse();
        File.ReadAllBytes(FilePath(second)).Should().Equal(Gif);
        (await viewer.GetAsync($"/api/v1/media/images/{first}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var content = await viewer.GetAsync($"/api/v1/media/images/{second}");
        content.Content.Headers.ContentType!.MediaType.Should().Be("image/gif");
        content.Headers.GetValues("X-Content-Type-Options").Should().Contain("nosniff");
        (await content.Content.ReadAsByteArrayAsync()).Should().Equal(Gif);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile");
        profile!.Id.Should().Be(userId);
        profile.AvatarId.Should().Be(second);
        (await client.DeleteAsync(path)).EnsureSuccessStatusCode();
        File.Exists(FilePath(second)).Should().BeFalse();
        (await viewer.GetAsync($"/api/v1/media/images/{second}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InvalidAndOversizedUploads_KeepPreviousAvatarAndRejectUnauthorizedChanges()
    {
        Configure();
        var (client, userId, _, _) = await factory.CreateSeededUserAsync();
        var (other, _, _, _) = await factory.CreateSeededUserAsync();
        using var anonymous = factory.CreateClientNoRedirect();
        const string path = "/api/v1/auth/profile/avatar";
        var id = await Upload(client, path, Png, "safe.png");
        foreach (var name in new[] { "fake.gif", "payload.svg", "image.html" })
            (await client.PutAsync(path + "?name=" + name, new ByteArrayContent(Png))).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await client.PutAsync(path + "?name=large.png", new ByteArrayContent(new byte[PublicImageStorage.MaxBytes + 1]))).StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
        (await anonymous.PutAsync(path + "?name=photo.png", new ByteArrayContent(Png))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await other.DeleteAsync($"/api/v1/admin/users/{userId}/avatar")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile"))!.AvatarId.Should().Be(id);
        Directory.GetFiles(directory).Should().HaveCount(1);
    }

    [Fact]
    public async Task AdminCanReplaceAndRemoveAvatar_AndSharingResponsesExposeTheCurrentImage()
    {
        Configure();
        var admin = await factory.CreateAdminClientAsync();
        var (owner, _, _, _) = await factory.CreateSeededUserAsync();
        var (member, memberId, email, _) = await factory.CreateSeededUserAsync();
        var first = await Upload(member, "/api/v1/auth/profile/avatar", Png, "old.png");
        var replacement = await Upload(admin, $"/api/v1/admin/users/{memberId}/avatar", Gif, "moderated.gif");
        File.Exists(FilePath(first)).Should().BeFalse();
        var users = await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/users");
        users.EnumerateArray().Single(u => u.GetProperty("id").GetGuid() == memberId).GetProperty("avatarId").GetGuid().Should().Be(replacement);
        var projectResponse = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Images", null));
        var projectId = (await projectResponse.Content.ReadFromJsonAsync<ProjectRecordDto>())!.Id;
        (await owner.PostAsJsonAsync($"/api/v1/projects/{projectId}/members", new { email, role = "Viewer" })).EnsureSuccessStatusCode();
        var members = await owner.GetFromJsonAsync<List<ProjectMemberDto>>($"/api/v1/projects/{projectId}/members");
        members!.Single().AvatarId.Should().Be(replacement);
        var participants = await member.GetFromJsonAsync<List<ProjectParticipantDto>>($"/api/v1/projects/{projectId}/participants");
        participants!.Single(u => u.UserId == memberId).AvatarId.Should().Be(replacement);
        (await admin.DeleteAsync($"/api/v1/admin/users/{memberId}/avatar")).EnsureSuccessStatusCode();
        File.Exists(FilePath(replacement)).Should().BeFalse();
    }

    [Fact]
    public async Task BrandingIsPublic_AdminOnlyWrites_AndOldLogoIsDeleted()
    {
        Configure();
        var admin = await factory.CreateAdminClientAsync();
        var (user, _, _, _) = await factory.CreateSeededUserAsync();
        using var anonymous = factory.CreateClientNoRedirect();
        (await anonymous.GetFromJsonAsync<IdentityMediaEndpoints.BrandingDto>("/api/v1/branding"))!.ApplicationName.Should().Be("NodexMesh");
        (await user.PutAsJsonAsync("/api/v1/admin/settings/branding", new { applicationName = "Wrong" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.PutAsJsonAsync("/api/v1/admin/settings/branding", new { applicationName = "Example company" })).EnsureSuccessStatusCode();
        const string path = "/api/v1/admin/settings/branding/logo";
        var first = await Upload(admin, path, Png, "brand.png", "logoId");
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8\"/></svg>");
        var second = await Upload(admin, path, svg, "brand.svg", "logoId");
        File.Exists(FilePath(first)).Should().BeFalse();
        var branding = await anonymous.GetFromJsonAsync<IdentityMediaEndpoints.BrandingDto>("/api/v1/branding");
        branding!.ApplicationName.Should().Be("Example company");
        branding.LogoId.Should().Be(second);
        (await anonymous.GetAsync($"/api/v1/media/images/{second}")).Content.Headers.ContentType!.MediaType.Should().Be("image/svg+xml");
        var unsafeSvg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
        (await admin.PutAsync(path + "?name=unsafe.svg", new ByteArrayContent(unsafeSvg))).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        File.Exists(FilePath(second)).Should().BeTrue();
        (await admin.DeleteAsync(path)).EnsureSuccessStatusCode();
        File.Exists(FilePath(second)).Should().BeFalse();
    }

    public void Dispose()
    {
        factory.Dispose();
        if (Directory.Exists(directory)) Directory.Delete(directory, true);
    }
}
