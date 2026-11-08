using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class AppearanceAccentsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement;
    private static object Request(object gradients, object? palette = null) => new {
        font = "short-stack", uiFont = "sans", uiPrimary = "#087f8c", uiSecondary = "#c6532e",
        inheritanceVersion = 1, paletteVersion = 4, uiGradients = gradients,
        light = palette ?? new { primary = "#087f8c", secondary = "#c6532e" },
        dark = new { primary = "#087f8c", secondary = "#c6532e" }
    };

    [Fact]
    public async Task UiGradientsAndIndependentPaletteOverridesRoundTrip()
    {
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        var gradient = new { from = "#006a88", to = "#00735e", kind = "linear", angle = 120 };
        var request = Request(new { primary = gradient }, new {
            primary = "#123456", secondary = "#c6532e", overrides = new { primary = true, secondary = false }, gradients = new { secondary = gradient }
        });
        (await client.PutAsJsonAsync("/api/v1/appearance", request)).EnsureSuccessStatusCode();
        var saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        saved.GetProperty("uiGradients").GetProperty("primary").GetProperty("angle").GetInt32().Should().Be(120);
        saved.GetProperty("defaults").GetProperty("light").GetProperty("overrides").GetProperty("primary").GetBoolean().Should().BeTrue();
        (await client.PutAsJsonAsync("/api/v1/appearance", Request(new { }))).EnsureSuccessStatusCode();
        saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        saved.GetProperty("uiGradients").EnumerateObject().Should().BeEmpty();
    }

    [Theory]
    [InlineData("{\"primary\":{\"from\":\"url(https://example.com)\",\"to\":\"#123456\",\"kind\":\"linear\",\"angle\":20}}")]
    [InlineData("{\"primary\":{\"from\":\"#123456\",\"to\":\"#123456\",\"kind\":\"linear\",\"angle\":\"bad\"}}")]
    [InlineData("{\"primary\":{\"from\":\"#123456\",\"to\":\"#123456\",\"kind\":\"linear\",\"angle\":361}}")]
    [InlineData("{\"admin\":{}}")]
    [InlineData("[]")]
    public async Task InvalidGradientPayloadsAreRejectedWithoutSaving(string gradients)
    {
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        (await client.PutAsJsonAsync("/api/v1/appearance", Request(Json(gradients)))).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        saved.GetProperty("uiGradients").EnumerateObject().Should().BeEmpty();
    }

    [Fact]
    public async Task PaletteColorCannotBecomeAnExternalCssImage()
    {
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        var request = Request(new { }, new { primary = "url(https://tracker.invalid/pixel)" });
        (await client.PutAsJsonAsync("/api/v1/appearance", request)).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public void PublicPaletteResolvesGlobalRolesButKeepsExplicitOverrides()
    {
        var profile = new AppearanceProfile { UiPrimary = "#087f8c", UiSecondary = "#c6532e", UiGradients = """{"secondary":{"from":"#c6532e","to":"#a44432","kind":"radial","angle":0}}""" };
        var value = AppearanceAccentValidator.ResolveSharedPalette("""{"primary":"#123456","secondary":"#ffffff","overrides":{"primary":true,"secondary":false},"gradients":{}}""", profile);
        value.GetProperty("primary").GetString().Should().Be("#123456");
        value.GetProperty("secondary").GetString().Should().Be("#c6532e");
        value.GetProperty("gradients").GetProperty("secondary").GetProperty("kind").GetString().Should().Be("radial");
    }

    public void Dispose() => factory.Dispose();

    private static System.Text.Json.Nodes.JsonObject BackgroundRequest(string background)
    {
        var node = JsonSerializer.SerializeToNode(Request(new { }))!.AsObject();
        node["uiBackground"] = System.Text.Json.Nodes.JsonNode.Parse(background);
        return node;
    }

    [Fact]
    public async Task UiBackgroundPersistsIndependentlyAndOlderClientsDoNotEraseIt()
    {
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        const string background = """{"color":"#f3e8dc","gradient":{"from":"#f3e8dc","to":"#e9f0e7","kind":"radial","angle":135}}""";
        (await client.PutAsJsonAsync("/api/v1/appearance", BackgroundRequest(background))).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync("/api/v1/appearance", Request(new { }))).EnsureSuccessStatusCode();
        var saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        saved.GetProperty("uiBackground").GetProperty("gradient").GetProperty("kind").GetString().Should().Be("radial");
        (await client.PutAsJsonAsync("/api/v1/appearance", BackgroundRequest("{}"))).EnsureSuccessStatusCode();
        saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        saved.GetProperty("uiBackground").EnumerateObject().Should().BeEmpty();
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("{\"color\":\"url(https://tracker.invalid)\"}")]
    [InlineData("{\"color\":\"#123456\",\"extra\":true}")]
    [InlineData("{\"color\":\"#123456\",\"gradient\":{\"from\":\"#123456\",\"to\":\"#ffffff\",\"kind\":\"linear\",\"angle\":361}}")]
    public void UnsafeUiBackgroundsAreRejected(string background)
    {
        Action validate = () => AppearanceAccentValidator.ValidateBackground(Json(background));
        validate.Should().Throw<NodexMeshApi.Common.ApiException>();
    }
}
