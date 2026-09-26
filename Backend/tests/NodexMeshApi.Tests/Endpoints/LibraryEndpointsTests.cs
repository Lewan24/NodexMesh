using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.IO.Compression;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class LibraryEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    private readonly string directory = Path.Combine(Path.GetTempPath(), "nodex-library-" + Guid.NewGuid());
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");

    private async Task<(HttpClient Client, Guid ProjectId)> Setup()
    {
        var options = factory.Services.GetRequiredService<IOptions<LibraryOptions>>().Value;
        options.Path = directory;
        options.MaxFileBytes = 1024;
        options.MaxProjectBytes = 1500;
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        var response = await client.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Library", null));
        return (client, (await response.Content.ReadFromJsonAsync<ProjectRecordDto>())!.Id);
    }

    [Fact]
    public async Task PrivateFiles_RequireProjectMembership_AndPublicLinksCanBeRevoked()
    {
        var (owner, project) = await Setup();
        var path = $"/api/v1/projects/{project}/library";
        var upload = await owner.PostAsync(path + "?name=pixel.png", new ByteArrayContent(Png));
        upload.EnsureSuccessStatusCode();
        var id = (await upload.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var content = $"{path}/{id}/content";
        using var anonymous = factory.CreateClientNoRedirect();
        (await anonymous.GetAsync(content)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var (stranger, _, _, _) = await factory.CreateSeededUserAsync();
        (await stranger.GetAsync(content)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var otherProjectResponse = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Other", null));
        var otherProject = (await otherProjectResponse.Content.ReadFromJsonAsync<ProjectRecordDto>())!.Id;
        (await owner.GetAsync($"/api/v1/projects/{otherProject}/library/{id}/content")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var privateFile = await owner.GetAsync(content);
        (await privateFile.Content.ReadAsByteArrayAsync()).Should().Equal(Png);
        privateFile.Headers.CacheControl!.NoStore.Should().BeTrue();
        var list = await owner.GetAsync(path);
        list.EnsureSuccessStatusCode();
        (await owner.PatchAsJsonAsync($"{path}/{id}", new { name = "New name" })).EnsureSuccessStatusCode();
        var share = await owner.PostAsync($"{path}/{id}/share", null);
        share.EnsureSuccessStatusCode();
        var link = "/api/v1" + (await share.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString();
        (await anonymous.GetAsync(link)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await owner.DeleteAsync($"{path}/{id}/share")).EnsureSuccessStatusCode();
        (await anonymous.GetAsync(link)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.DeleteAsync($"{path}/{id}")).EnsureSuccessStatusCode();
        File.Exists(Path.Combine(directory, id.ToString("N"))).Should().BeFalse();
        (await owner.GetAsync(content)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ViewerCannotManage_EditorCannotShare_AndTrashedProjectDeniesPublicAccess()
    {
        var (owner, project) = await Setup();
        var (viewer, viewerId, _, _) = await factory.CreateSeededUserAsync();
        var (editor, editorId, _, _) = await factory.CreateSeededUserAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.ProjectMembers.AddRange(
                new ProjectMember { ProjectId = project, UserId = viewerId, Role = ProjectRole.Viewer },
                new ProjectMember { ProjectId = project, UserId = editorId, Role = ProjectRole.Editor });
            await db.SaveChangesAsync();
        }
        var path = $"/api/v1/projects/{project}/library";
        (await viewer.PostAsync(path + "?name=pixel.png", new ByteArrayContent(Png))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var upload = await editor.PostAsync(path + "?name=pixel.png", new ByteArrayContent(Png));
        upload.EnsureSuccessStatusCode();
        var id = (await upload.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await viewer.GetAsync($"{path}/{id}/content")).EnsureSuccessStatusCode();
        (await editor.PostAsync($"{path}/{id}/share", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await viewer.DeleteAsync($"{path}/{id}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var share = await owner.PostAsync($"{path}/{id}/share", null);
        var link = "/api/v1" + (await share.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString();
        var ownerListing = await owner.GetFromJsonAsync<JsonElement>(path);
        ownerListing.GetProperty("assets")[0].GetProperty("sharePath").GetString().Should().NotBeNullOrWhiteSpace();
        var viewerListing = await viewer.GetFromJsonAsync<JsonElement>(path);
        viewerListing.GetProperty("assets")[0].GetProperty("sharePath").ValueKind.Should().Be(JsonValueKind.Null);
        var editorListing = await editor.GetFromJsonAsync<JsonElement>(path);
        editorListing.GetProperty("assets")[0].GetProperty("sharePath").ValueKind.Should().Be(JsonValueKind.Null);
        (await owner.DeleteAsync($"/api/v1/projects/{project}")).EnsureSuccessStatusCode();
        (await factory.CreateClientNoRedirect().GetAsync(link)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("bad.png", "<html>not an image</html>")]
    [InlineData("bad.docx", "not an office package")]
    [InlineData("bad.svg", "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")]
    [InlineData("bad.svg", "<svg xmlns='http://www.w3.org/2000/svg'><use href='https://evil.test/x'/></svg>")]
    [InlineData("bad.svg", "<!DOCTYPE svg [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><svg xmlns='http://www.w3.org/2000/svg'>&x;</svg>")]
    public async Task InvalidOrActiveFiles_AreRejectedWithoutLeavingFiles(string name, string body)
    {
        var (client, project) = await Setup();
        (await client.PostAsync($"/api/v1/projects/{project}/library?name={name}", new ByteArrayContent(Encoding.UTF8.GetBytes(body))))
            .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        Directory.GetFiles(directory).Should().BeEmpty();
    }

    [Fact]
    public async Task Documents_AreValidatedPreviewedAndDownloadedWithTheirStoredName()
    {
        var (client, project) = await Setup();
        var path = $"/api/v1/projects/{project}/library";
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Model.FindEntityType(typeof(LibraryAsset))!
                .FindProperty(nameof(LibraryAsset.ContentType))!
                .GetMaxLength().Should().Be(255);
        }
        var text = await client.PostAsync(path + "?name=notes.txt", new ByteArrayContent("hello"u8.ToArray()));
        text.EnsureSuccessStatusCode();
        (await text.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("contentType").GetString().Should().Be("text/plain");

        var package = new MemoryStream();
        using (var archive = new ZipArchive(package, ZipArchiveMode.Create, leaveOpen: true))
        {
            archive.CreateEntry("[Content_Types].xml");
            archive.CreateEntry("word/document.xml");
        }
        var docx = await client.PostAsync(path + "?name=proposal.docx", new ByteArrayContent(package.ToArray()));
        docx.EnsureSuccessStatusCode();
        var docxAsset = await docx.Content.ReadFromJsonAsync<JsonElement>();
        docxAsset.GetProperty("contentType").GetString().Should()
            .Be("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        var id = docxAsset.GetProperty("id").GetGuid();
        var download = await client.GetAsync($"{path}/{id}/content?download=true");
        download.Content.Headers.ContentDisposition!.FileNameStar.Should().Be("proposal.docx");

        package = new MemoryStream();
        using (var archive = new ZipArchive(package, ZipArchiveMode.Create, leaveOpen: true))
        {
            archive.CreateEntry("[Content_Types].xml");
            archive.CreateEntry("xl/workbook.xml");
        }
        var xlsx = await client.PostAsync(path + "?name=budget.xlsx", new ByteArrayContent(package.ToArray()));
        xlsx.EnsureSuccessStatusCode();
        (await xlsx.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("contentType").GetString().Should()
            .Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    [Fact]
    public async Task LimitsAndStaticSvg_AreEnforced()
    {
        var (client, project) = await Setup();
        var path = $"/api/v1/projects/{project}/library";
        var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><path d='M0 0L10 10' stroke='red'/></svg>";
        var uploadedSvg = await client.PostAsync(path + "?name=icon.svg", new ByteArrayContent(Encoding.UTF8.GetBytes(svg)));
        uploadedSvg.EnsureSuccessStatusCode();
        var id = (await uploadedSvg.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var svgResponse = await client.GetAsync($"{path}/{id}/content");
        svgResponse.Content.Headers.ContentType!.MediaType.Should().Be("image/svg+xml");
        svgResponse.Headers.GetValues("Content-Security-Policy").Single().Should().Contain("sandbox");
        (await client.PostAsync(path + "?name=huge.png", new ByteArrayContent(new byte[1025]))).StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
        var large = new byte[800];
        Png.CopyTo(large, 0);
        (await client.PostAsync(path + "?name=one.png", new ByteArrayContent(large))).EnsureSuccessStatusCode();
        (await client.PostAsync(path + "?name=two.png", new ByteArrayContent(large))).StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
        Directory.GetFiles(directory).Should().HaveCount(2);
    }

    [Fact]
    public async Task PublicLink_IsStableAndRetrievable_AndLegacyLinksSurviveRetrieval()
    {
        var (owner, project) = await Setup();
        var path = $"/api/v1/projects/{project}/library";
        var upload = await owner.PostAsync(path + "?name=photo.png", new ByteArrayContent(Png));
        var id = (await upload.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var legacyToken = new string('a', 64);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var asset = await db.LibraryAssets.FindAsync(id);
            asset!.ShareTokenHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(legacyToken)));
            await db.SaveChangesAsync();
        }
        using var anonymous = factory.CreateClientNoRedirect();
        var legacyPath = "/api/v1/library/shared/" + legacyToken;
        (await anonymous.GetAsync(legacyPath)).EnsureSuccessStatusCode();
        var first = await owner.PostAsync($"{path}/{id}/share", null);
        first.EnsureSuccessStatusCode();
        var publicPath = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString();
        var second = await owner.PostAsync($"{path}/{id}/share", null);
        (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString().Should().Be(publicPath);
        var listing = await owner.GetFromJsonAsync<JsonElement>(path);
        listing.GetProperty("assets")[0].GetProperty("sharePath").GetString().Should().Be(publicPath);
        (await anonymous.GetAsync("/api/v1" + publicPath)).EnsureSuccessStatusCode();
        (await anonymous.GetAsync(legacyPath)).EnsureSuccessStatusCode();
        (await owner.DeleteAsync($"{path}/{id}/share")).EnsureSuccessStatusCode();
        (await anonymous.GetAsync("/api/v1" + publicPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await anonymous.GetAsync(legacyPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var next = await owner.PostAsync($"{path}/{id}/share", null);
        (await next.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("path").GetString().Should().NotBe(publicPath);
    }

    [Theory]
    [InlineData("image")]
    [InlineData("icon")]
    [InlineData("file")]
    public async Task LibrarySelection_SavesThroughBoardMutation_AndSurvivesAnotherUpdate(string type)
    {
        var (owner, project) = await Setup();
        var upload = await owner.PostAsync($"/api/v1/projects/{project}/library?name=photo.png", new ByteArrayContent(Png));
        var assetId = (await upload.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var source = $"library://{project}/{assetId}";
        var boards = await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project}/boards");
        var board = boards!.Single();
        var data = type switch
        {
            "image" => JsonSerializer.SerializeToElement(new { url = source, caption = "Library image", variant = "card", imgHeight = 150 }),
            "file" => JsonSerializer.SerializeToElement(new { title = "File", source, fileName = "photo.png", contentType = "image/png", size = Png.Length }),
            _ => JsonSerializer.SerializeToElement(new { iconMode = "library", source, label = "Library icon" })
        };
        var item = new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 0, 0, 200, 200, 0, false,
            type, 1, JsonSerializer.SerializeToElement(new { }), data);
        var mutationPath = $"/api/v1/boards/{board.Id}/mutations";
        var inserted = await owner.PostAsJsonAsync(mutationPath, new BoardMutationDto(Guid.NewGuid(), board.Revision,
            [new ItemMutationDto(item, null, [], [], [])], []));
        inserted.EnsureSuccessStatusCode();
        var snapshot = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        snapshot.Items.Single().Data.GetProperty(type == "image" ? "url" : "source").GetString().Should().Be(source);
        var updated = await owner.PostAsJsonAsync(mutationPath, new BoardMutationDto(Guid.NewGuid(), snapshot.Board.Revision,
            [new ItemMutationDto(item with { X = 240 }, snapshot.Items.Single().Revision, [], [], [])], []));
        updated.EnsureSuccessStatusCode();
        var reloaded = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        reloaded.Items.Single().X.Should().Be(240);
        reloaded.Items.Single().Data.GetProperty(type == "image" ? "url" : "source").GetString().Should().Be(source);
    }

    public void Dispose()
    {
        factory.Dispose();
        if (Directory.Exists(directory)) Directory.Delete(directory, true);
    }
}
