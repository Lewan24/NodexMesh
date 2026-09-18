using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Validation;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Smoke;

public sealed class MutationValidationTests
{
    [Fact]
    public async Task MutationAndAppearanceValidation_RejectsInvalidPayloads()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing" });
        builder.WebHost.UseTestServer();
        builder.Logging.ClearProviders();
        builder.Services.AddValidation();

        await using var app = builder.Build();
        app.Use(async (context, next) =>
        {
            try
            {
                await next();
            }
            catch (ApiException error)
            {
                context.Response.StatusCode = error.StatusCode;
            }
            catch (Exception error)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync(error.ToString());
            }
        });
        app.MapPost("/mutations", (BoardMutationDto mutation) =>
        {
            foreach (var upsert in mutation.Upserts)
                BoardValidator.ValidateItem(upsert.Item);
            return Results.Ok(new { mutation.ClientMutationId });
        });
        app.MapPut("/appearance", (AppearanceUpdateDto request) => Results.Ok(request));
        app.MapPut("/project-appearance", (ProjectAppearanceUpdateDto request) => Results.Ok(request));

        await app.StartAsync();
        using var client = app.GetTestClient();
        var item = new ItemWriteDto(Guid.NewGuid(), Guid.NewGuid(), null, null, 0, 10, 20, null, null, 0, false,
            "note", 1, JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { content = "Hello" }));
        var mutation = new BoardMutationDto(Guid.NewGuid(), 1, [new ItemMutationDto(item, null, [], [], [])], []);

        await Check(client, mutation, HttpStatusCode.OK, "valid note insert");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { ExpectedRevision = 1, Item = item with { X = 42 } }] }, HttpStatusCode.OK, "move/update");
        await Check(client, mutation with { Upserts = [], Deletes = [new ItemDeleteDto(item.Id, 1)] }, HttpStatusCode.OK, "delete");
        await Check(client, mutation with { ClientMutationId = Guid.Empty }, HttpStatusCode.BadRequest, "required mutation ID");
        await Check(client, mutation with { Upserts = [], Deletes = [] }, HttpStatusCode.BadRequest, "empty batch");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0], mutation.Upserts[0]] }, HttpStatusCode.BadRequest, "duplicate IDs");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Type = "" } }] }, HttpStatusCode.BadRequest, "required item type");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Width = -1 } }] }, HttpStatusCode.UnprocessableEntity, "invalid geometry");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Data = JsonSerializer.SerializeToElement(new { content = "Hello", unexpected = true }) } }] }, HttpStatusCode.UnprocessableEntity, "unknown data property");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Data = JsonSerializer.SerializeToElement((object?)null) } }] }, HttpStatusCode.UnprocessableEntity, "null item data");
        await Check(client, mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Appearance = JsonSerializer.SerializeToElement(new[] { 1 }) } }] }, HttpStatusCode.UnprocessableEntity, "non-object appearance");

        (await client.PutAsJsonAsync("/appearance", new
        {
            font = "sans", uiFont = "sans", uiPrimary = "#000000", uiSecondary = "#ffffff",
            inheritanceVersion = 1, paletteVersion = 2, light = new { primary = "#000000" }, dark = new { primary = "#ffffff" }
        })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.PutAsJsonAsync("/project-appearance", new { font = (string?)null, light = (object?)null, dark = new { primary = "#ffffff" } }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        foreach (var mode in new string?[] { "light", "dark", null, "invalid" })
        {
            var expected = mode == "invalid" ? HttpStatusCode.BadRequest : HttpStatusCode.OK;
            var value = new AppearanceUpdateDto("sans", "sans", "#000000", "#ffffff", 1, 2,
                JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { }), mode);
            using var result = await client.PutAsJsonAsync("/appearance", value);
            result.StatusCode.Should().Be(expected);
            using var projectResult = await client.PutAsJsonAsync("/project-appearance", new ProjectAppearanceUpdateDto(null, null, null, mode));
            projectResult.StatusCode.Should().Be(expected);
            if (expected == HttpStatusCode.OK)
            {
                (await result.Content.ReadFromJsonAsync<AppearanceUpdateDto>())!.Mode.Should().Be(mode);
                (await projectResult.Content.ReadFromJsonAsync<ProjectAppearanceUpdateDto>())!.Mode.Should().Be(mode);
            }
        }
    }

    private static async Task Check(HttpClient client, BoardMutationDto value, HttpStatusCode expected, string name)
    {
        using var response = await client.PostAsJsonAsync("/mutations", value);
        response.StatusCode.Should().Be(expected, name);
    }
}
