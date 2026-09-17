using System.Net;
using NodexMeshApi.Common;

const string frontendOrigin = "http://localhost:8443";

foreach (var environment in new[] { "Development", "Production" })
{
    var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment });
    builder.Logging.ClearProviders();
    builder.WebHost.UseUrls("http://127.0.0.1:0");
    // Explicit HTTPS port reproduces the dual HTTP/HTTPS launch profile's redirect.
    builder.Services.AddHttpsRedirection(options => options.HttpsPort = 7215);
    builder.Services.AddApiCors([frontendOrigin]);
    await using var app = builder.Build();
    app.UseApiTransportSecurity();
    app.UseCors("Default");
    app.MapPost("/api/v1/auth/refresh", () => Results.Unauthorized());
    app.MapPut("/api/v1/appearance", () => Results.NoContent());
    app.MapGet("/limited", (HttpContext context) =>
    {
        context.Response.Headers.RetryAfter = "60";
        return Results.StatusCode(429);
    });
    await app.StartAsync();

    using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
    {
        BaseAddress = new Uri(app.Urls.Single())
    };
    using var refresh = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
    refresh.Headers.Add("X-Requested-With", "nodexmesh-web");
    using var response = await client.SendAsync(refresh);
    if (environment == "Development")
    {
        Require(response.StatusCode == HttpStatusCode.Unauthorized, "Development refresh must reach authentication without a redirect.");
        Require(response.Headers.Location is null, "Development refresh must not send Location.");

        using var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/v1/appearance");
        preflight.Headers.Add("Origin", frontendOrigin);
        preflight.Headers.Add("Access-Control-Request-Method", "PUT");
        preflight.Headers.Add("Access-Control-Request-Headers", "authorization,content-type,x-requested-with");
        using var cors = await client.SendAsync(preflight);
        Require(cors.StatusCode == HttpStatusCode.NoContent, "Appearance preflight must succeed.");
        Require(cors.Headers.GetValues("Access-Control-Allow-Methods").Single().Split(',').Select(value => value.Trim()).Contains("PUT"), "CORS must allow PUT.");
        Require(cors.Headers.GetValues("Access-Control-Allow-Origin").Single() == frontendOrigin, "CORS must allow the configured frontend.");
        Require(cors.Headers.GetValues("Access-Control-Allow-Credentials").Single() == "true", "CORS must allow refresh cookies.");

        using var denied = new HttpRequestMessage(HttpMethod.Options, "/api/v1/appearance");
        denied.Headers.Add("Origin", "https://unlisted.example");
        denied.Headers.Add("Access-Control-Request-Method", "PUT");
        using var deniedResponse = await client.SendAsync(denied);
        Require(!deniedResponse.Headers.Contains("Access-Control-Allow-Origin"), "Unlisted origins must remain blocked.");

        using var limited = new HttpRequestMessage(HttpMethod.Get, "/limited");
        limited.Headers.Add("Origin", frontendOrigin);
        using var limitedResponse = await client.SendAsync(limited);
        Require(limitedResponse.Headers.GetValues("Access-Control-Expose-Headers").Single().Contains("Retry-After", StringComparison.OrdinalIgnoreCase), "Browser clients must be able to read Retry-After.");
    }
    else
    {
        Require(response.StatusCode == HttpStatusCode.TemporaryRedirect, "Production must still require HTTPS.");
        Require(response.Headers.Location?.Scheme == "https", "Production redirect must target HTTPS.");
    }

    await app.StopAsync();
    Console.WriteLine($"PASS: {environment} transport policy");
}

static void Require(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
