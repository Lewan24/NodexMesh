using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.TestHost;
using NodexMeshApi.Common;
using Xunit;

namespace NodexMeshApi.Tests.Smoke;

public sealed class TransportTests
{
    [Fact]
    public async Task DevelopmentTransport_AllowsApiTrafficAndConfiguredCors()
    {
        using var app = await BuildApp("Development");
        using var client = app.GetTestClient();
        using var refresh = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refresh.Headers.Add("X-Requested-With", "nodexmesh-web");
        using var response = await client.SendAsync(refresh);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Location"));

        using var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/v1/appearance");
        preflight.Headers.Add("Origin", "http://localhost:8443");
        preflight.Headers.Add("Access-Control-Request-Method", "PUT");
        preflight.Headers.Add("Access-Control-Request-Headers", "authorization,content-type,x-requested-with");
        using var cors = await client.SendAsync(preflight);
        Assert.Equal(HttpStatusCode.NoContent, cors.StatusCode);
        Assert.Contains("PUT", cors.Headers.GetValues("Access-Control-Allow-Methods").Single().Split(',').Select(value => value.Trim()));
        Assert.Equal("http://localhost:8443", cors.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Equal("true", cors.Headers.GetValues("Access-Control-Allow-Credentials").Single());

        using var denied = new HttpRequestMessage(HttpMethod.Options, "/api/v1/appearance");
        denied.Headers.Add("Origin", "https://unlisted.example");
        denied.Headers.Add("Access-Control-Request-Method", "PUT");
        using var deniedResponse = await client.SendAsync(denied);
        Assert.False(deniedResponse.Headers.Contains("Access-Control-Allow-Origin"));

        using var limited = new HttpRequestMessage(HttpMethod.Get, "/limited");
        limited.Headers.Add("Origin", "http://localhost:8443");
        using var limitedResponse = await client.SendAsync(limited);
        Assert.Contains("Retry-After", limitedResponse.Headers.GetValues("Access-Control-Expose-Headers").Single(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ProductionTransport_RedirectsToHttps()
    {
        using var app = await BuildApp("Production");
        using var client = app.GetTestClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        request.Headers.Add("X-Requested-With", "nodexmesh-web");
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.TemporaryRedirect, response.StatusCode);
        Assert.Equal("https", response.Headers.Location?.Scheme);
    }

    private static async Task<WebApplication> BuildApp(string environment)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment });
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.WebHost.UseSetting("https_port", "7215");
        builder.Services.AddHttpsRedirection(options => options.HttpsPort = 7215);
        builder.Services.AddApiCors(["http://localhost:8443"]);
        var app = builder.Build();
        app.UseApiTransportSecurity();
        app.UseCors("Default");
        app.MapPost("/api/v1/auth/refresh", () => Results.Unauthorized());
        app.MapPut("/api/v1/appearance", () => Results.NoContent());
        app.MapGet("/limited", (HttpContext context) =>
        {
            context.Response.Headers.RetryAfter = "60";
            return Results.StatusCode(StatusCodes.Status429TooManyRequests);
        });
        await app.StartAsync();
        return app;
    }
}
