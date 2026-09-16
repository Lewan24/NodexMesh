using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;

var builder = WebApplication.CreateBuilder();
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddValidation();
await using var app = builder.Build();
app.Use(async (context, next) =>
{
    try { await next(); }
    catch (ApiException error) { context.Response.StatusCode = error.StatusCode; }
    catch (Exception error)
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync(error.ToString());
    }
});
app.MapPost("/mutations", (BoardMutationDto mutation) =>
{
    foreach (var upsert in mutation.Upserts) BoardValidator.ValidateItem(upsert.Item);
    return Results.Ok(new { mutation.ClientMutationId });
});
app.MapPut("/appearance", (AppearanceUpdateDto request) => Results.Ok(request));
app.MapPut("/project-appearance", (ProjectAppearanceUpdateDto request) => Results.Ok(request));
await app.StartAsync();
using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
var item = new ItemWriteDto(Guid.NewGuid(), Guid.NewGuid(), null, null, 0, 10, 20, null, null, 0, false,
    "note", 1, JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { content = "Hello" }));
var mutation = new BoardMutationDto(Guid.NewGuid(), 1, [new ItemMutationDto(item, null, [], [], [])], []);
await Check(mutation, HttpStatusCode.OK, "valid note insert");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { ExpectedRevision = 1, Item = item with { X = 42 } }] }, HttpStatusCode.OK, "move/update");
await Check(mutation with { Upserts = [], Deletes = [new ItemDeleteDto(item.Id, 1)] }, HttpStatusCode.OK, "delete");
await Check(mutation with { ClientMutationId = Guid.Empty }, HttpStatusCode.BadRequest, "required mutation ID");
await Check(mutation with { Upserts = [], Deletes = [] }, HttpStatusCode.BadRequest, "empty batch");
await Check(mutation with { Upserts = [mutation.Upserts[0], mutation.Upserts[0]] }, HttpStatusCode.BadRequest, "duplicate IDs");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Type = "" } }] }, HttpStatusCode.BadRequest, "required item type");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Width = -1 } }] }, HttpStatusCode.UnprocessableEntity, "invalid geometry");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Data = JsonSerializer.SerializeToElement(new { content = "Hello", unexpected = true }) } }] }, HttpStatusCode.UnprocessableEntity, "unknown data property");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Data = JsonSerializer.SerializeToElement((object?)null) } }] }, HttpStatusCode.UnprocessableEntity, "null item data");
await Check(mutation with { Upserts = [mutation.Upserts[0] with { Item = item with { Appearance = JsonSerializer.SerializeToElement(new[] { 1 }) } }] }, HttpStatusCode.UnprocessableEntity, "non-object appearance");
using var palette = await client.PutAsJsonAsync("/appearance", new { font = "sans", uiFont = "sans", uiPrimary = "#000000", uiSecondary = "#ffffff", inheritanceVersion = 1, paletteVersion = 2, light = new { primary = "#000000" }, dark = new { primary = "#ffffff" } });
if (palette.StatusCode != HttpStatusCode.OK) throw new InvalidOperationException(await palette.Content.ReadAsStringAsync());
using var inherit = await client.PutAsJsonAsync("/project-appearance", new { font = (string?)null, light = (object?)null, dark = new { primary = "#ffffff" } });
if (inherit.StatusCode != HttpStatusCode.OK) throw new InvalidOperationException(await inherit.Content.ReadAsStringAsync());
Console.WriteLine("PASS: appearance JSON and nullable overrides");
await app.StopAsync();

async Task Check(BoardMutationDto value, HttpStatusCode expected, string name)
{
    using var response = await client.PostAsJsonAsync("/mutations", value);
    if (response.StatusCode != expected)
        throw new InvalidOperationException($"{name}: expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    Console.WriteLine($"PASS: {name}");
}
