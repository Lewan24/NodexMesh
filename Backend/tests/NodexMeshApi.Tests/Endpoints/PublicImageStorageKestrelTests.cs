using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

// TestServer does not enforce Kestrel body limits. Exercise a real HTTP listener
// with the production 5 MB default and the image-specific override.
public sealed class PublicImageStorageKestrelTests
{
    [Fact]
    public async Task GifUploadsBelowAndAboveTheGlobalLimitWorkAndOversizeRemains413()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nodex-kestrel-media-" + Guid.NewGuid());
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing" });
        builder.WebHost.UseKestrel(options => options.Limits.MaxRequestBodySize = 5_000_000)
            .UseUrls("http://127.0.0.1:0");
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddProblemDetails();
        builder.Services.Configure<PublicImageOptions>(options => options.Path = directory);
        builder.Services.AddSingleton<PublicImageStorage>();
        await using var app = builder.Build();
        app.UseExceptionHandler();
        app.MapPut("/avatar", async (HttpContext context, PublicImageStorage storage) =>
        {
            var result = await storage.WriteAsync(context.Request, false, context.RequestAborted);
            return Results.Ok(new { result.Id });
        });
        await app.StartAsync();
        try
        {
            using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
            foreach (var size in new[] { 4 * 1024 * 1024, 6 * 1024 * 1024, (int)PublicImageStorage.MaxBytes })
            {
                var gif = new byte[size];
                Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7").CopyTo(gif, 0);
                using var content = new ByteArrayContent(gif);
                var response = await client.PutAsync("/avatar?name=image.gif", content);
                response.EnsureSuccessStatusCode();
                var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
                new FileInfo(Path.Combine(directory, id.ToString("N"))).Length.Should().Be(size);
            }
            using var oversized = new ByteArrayContent(new byte[PublicImageStorage.MaxBytes + 1]);
            (await client.PutAsync("/avatar?name=image.gif", oversized)).StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
            Directory.GetFiles(directory).Should().HaveCount(3);
        }
        finally
        {
            await app.StopAsync();
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }

    [Fact]
    public async Task UnwritableStorageReturnsRecognizable503WithoutExposingPaths()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nodex-media-file-" + Guid.NewGuid());
        await File.WriteAllTextAsync(directory, "a file cannot be used as an upload directory");
        try
        {
            var environment = new Moq.Mock<IWebHostEnvironment>();
            environment.SetupGet(value => value.ContentRootPath).Returns(Path.GetTempPath());
            var storage = new PublicImageStorage(Microsoft.Extensions.Options.Options.Create(new PublicImageOptions { Path = directory }), environment.Object,
                NullLogger<PublicImageStorage>.Instance);
            var http = new DefaultHttpContext();
            http.Request.QueryString = new QueryString("?name=image.gif");
            http.Request.Body = new MemoryStream("GIF89a"u8.ToArray());
            var action = () => storage.WriteAsync(http.Request, false, default);
            var error = (await action.Should().ThrowAsync<ApiException>()).Which;
            error.StatusCode.Should().Be(503);
            error.Code.Should().Be("image_storage_unavailable");
            error.Message.Should().NotContain(directory);
        }
        finally { File.Delete(directory); }
    }
}
