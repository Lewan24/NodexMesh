using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class BoardValidatorTests
{
    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);
    private static JsonElement EmptyObject() => JsonDocument.Parse("{}").RootElement;

    private static ItemWriteDto NoteItem(
        Guid? id = null, Guid boardId = default, Guid? parentItemId = null, Guid? frameId = null,
        double x = 0, double y = 0, double? width = 100, double? height = 100,
        short schemaVersion = 1, string type = "note", JsonElement? data = null, JsonElement? appearance = null) =>
        new(
            id ?? Guid.NewGuid(), boardId, parentItemId, frameId, SortOrder: 0,
            X: x, Y: y, Width: width, Height: height, ZIndex: 0, Locked: false,
            Type: type, SchemaVersion: schemaVersion,
            Appearance: appearance ?? EmptyObject(),
            Data: data ?? Json(new { content = "hello" }));

    [Fact]
    public void ValidateItem_AcceptsOptionalCustomCss()
    {
        var item = NoteItem(appearance: Json(new { customCss = new { enabled = true, source = "border-radius: 24px;" } }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateItem_RejectsOversizedCustomCss()
    {
        var item = NoteItem(appearance: Json(new { customCss = new { enabled = true, source = new string('a', 10_001) } }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(error => error.Code == "invalid_item");
    }

    // ---------------- IsUrl (SSRF / stored-XSS guard) ----------------

    [Theory]
    [InlineData("https://example.com/image.png")]
    [InlineData("http://example.com")]
    [InlineData("")] // empty is explicitly allowed (no URL set yet)
    public void IsUrl_AcceptsPlainHttpAndHttps(string url) => BoardValidator.IsUrl(url).Should().BeTrue();

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("file:///etc/passwd")]
    [InlineData("ftp://example.com/file")]
    [InlineData("https://user:pass@example.com")] // credentials in URL rejected
    [InlineData("not a url at all")]
    public void IsUrl_RejectsDangerousSchemesAndCredentials(string url) => BoardValidator.IsUrl(url).Should().BeFalse();

    [Fact]
    public void IsUrl_RejectsOverlongUrls()
    {
        var url = "https://example.com/" + new string('a', 5000);
        BoardValidator.IsUrl(url).Should().BeFalse();
    }

    // ---------------- IsNumber / IsText / IsDay ----------------

    [Theory]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    [InlineData(double.NegativeInfinity)]
    [InlineData(10_000_001)]
    [InlineData(-10_000_001)]
    public void IsNumber_RejectsNonFiniteOrOutOfRange(double value) => BoardValidator.IsNumber(value).Should().BeFalse();

    [Fact]
    public void IsNumber_AcceptsOrdinaryFiniteValues() => BoardValidator.IsNumber(1234.5).Should().BeTrue();

    [Theory]
    [InlineData("2026-01-15", true)]
    [InlineData("2026-1-15", false)]   // not zero-padded
    [InlineData("01/15/2026", false)]
    [InlineData("not-a-date", false)]
    public void IsDay_RequiresExactIsoFormat(string value, bool expected) => BoardValidator.IsDay(value).Should().Be(expected);

    // ---------------- ValidateItem ----------------

    [Fact]
    public void ValidateItem_AcceptsWellFormedNote()
    {
        var act = () => BoardValidator.ValidateItem(NoteItem());
        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateItem_RejectsUnsupportedSchemaVersion()
    {
        var item = NoteItem(schemaVersion: 2);
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 422 && e.Code == "unsupported_schema");
    }

    [Fact]
    public void ValidateItem_RejectsUnknownItemType()
    {
        var item = NoteItem(type: "totally-not-a-type");
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 422 && e.Code == "unsupported_schema");
    }

    [Theory]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    public void ValidateItem_RejectsNonFiniteGeometry(double bad)
    {
        var item = NoteItem(x: bad);
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 422 && e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsNegativeWidth()
    {
        var item = NoteItem(width: -5);
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsNonObjectData()
    {
        var item = NoteItem(data: JsonSerializer.SerializeToElement("not an object"));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsOversizedPayload()
    {
        var huge = new string('x', 2_100_000);
        var item = NoteItem(data: Json(new { content = huge }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsMassAssignmentViaUnknownDataField()
    {
        // itemSchema mirrors strict deserialization: any field not declared on NoteData
        // (which only has Content) must be rejected outright, not silently dropped.
        var item = NoteItem(data: Json(new { content = "hi", isAdmin = true }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsUnknownAppearanceField()
    {
        var item = NoteItem(appearance: Json(new { color = "#fff", notAField = 1 }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_RejectsJavascriptUrlInImageItem()
    {
        var item = NoteItem(type: "image", data: Json(new { url = "javascript:alert(1)", caption = "" }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void ValidateItem_AcceptsHttpsUrlInImageItem()
    {
        var item = NoteItem(type: "image", data: Json(new { url = "https://example.com/a.png", caption = "" }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateItem_RejectsSsrfStyleUrlWithCredentialsInLink()
    {
        var item = NoteItem(type: "link",
            data: Json(new { url = "https://admin:pw@internal.example.com", title = "", description = "" }));
        var act = () => BoardValidator.ValidateItem(item);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    // ---------------- ValidateGraph ----------------

    [Fact]
    public void ValidateGraph_AllowsNoteNestedInsideTopLevelColumn()
    {
        var boardId = Guid.NewGuid();
        var columnId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [columnId] = new(columnId, "column", null)
        };
        var note = NoteItem(boardId: boardId, parentItemId: columnId);

        var act = () => BoardValidator.ValidateGraph(boardId, context, [note], []);
        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateGraph_RejectsNestingInsideNonColumnParent()
    {
        var boardId = Guid.NewGuid();
        var frameId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode> { [frameId] = new(frameId, "frame", null) };
        var note = NoteItem(boardId: boardId, parentItemId: frameId);

        var act = () => BoardValidator.ValidateGraph(boardId, context, [note], []);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_parent");
    }

    [Fact]
    public void ValidateGraph_RejectsTwoLevelsOfNesting()
    {
        // A column nested inside another column may not itself host children — one level only.
        var boardId = Guid.NewGuid();
        var outerColumnId = Guid.NewGuid();
        var innerColumnId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [outerColumnId] = new(outerColumnId, "column", null),
            [innerColumnId] = new(innerColumnId, "column", outerColumnId),
        };
        var note = NoteItem(boardId: boardId, parentItemId: innerColumnId);

        var act = () => BoardValidator.ValidateGraph(boardId, context, [note], []);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_parent");
    }

    [Fact]
    public void ValidateGraph_RejectsNonNestableTypeInsideColumn()
    {
        var boardId = Guid.NewGuid();
        var columnId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode> { [columnId] = new(columnId, "column", null) };
        // "frame" is not in BoardItemTypes.Nestable.
        var frame = new ItemWriteDto(Guid.NewGuid(), boardId, columnId, null, 0, 0, 0, 100, 100, 0, false,
            "frame", 1, EmptyObject(), Json(new { title = "F" }));

        var act = () => BoardValidator.ValidateGraph(boardId, context, [frame], []);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_parent");
    }

    [Fact]
    public void ValidateGraph_RejectsSelfReferencingFrame()
    {
        var boardId = Guid.NewGuid();
        var id = Guid.NewGuid();
        var item = new ItemWriteDto(id, boardId, null, id, 0, 0, 0, 100, 100, 0, false,
            "note", 1, EmptyObject(), Json(new { content = "x" }));

        var act = () => BoardValidator.ValidateGraph(boardId, new Dictionary<Guid, ItemGraphNode>(), [item], []);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_frame");
    }

    [Fact]
    public void ValidateGraph_RejectsItemFromAnotherBoard()
    {
        var boardId = Guid.NewGuid();
        var item = NoteItem(boardId: Guid.NewGuid()); // different board
        var act = () => BoardValidator.ValidateGraph(boardId, new Dictionary<Guid, ItemGraphNode>(), [item], []);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_scope");
    }

    [Fact]
    public void ValidateGraph_AllowsValidLineEndpointLink()
    {
        var boardId = Guid.NewGuid();
        var lineId = Guid.NewGuid();
        var targetId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [lineId] = new(lineId, "line", null),
            [targetId] = new(targetId, "note", null),
        };
        var link = new ItemLinkDto(lineId, targetId, "line_start");

        var act = () => BoardValidator.ValidateGraph(boardId, context, [], [link]);
        act.Should().NotThrow();
    }

    [Fact]
    public void ValidateGraph_RejectsLinkBetweenWrongTypesForKind()
    {
        var boardId = Guid.NewGuid();
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [a] = new(a, "note", null), // "line_start" requires source to be type "line"
            [b] = new(b, "note", null),
        };
        var link = new ItemLinkDto(a, b, "line_start");

        var act = () => BoardValidator.ValidateGraph(boardId, context, [], [link]);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_link");
    }

    [Fact]
    public void ValidateGraph_RejectsSelfLink()
    {
        var boardId = Guid.NewGuid();
        var id = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode> { [id] = new(id, "line", null) };
        var link = new ItemLinkDto(id, id, "line_start");

        var act = () => BoardValidator.ValidateGraph(boardId, context, [], [link]);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_link");
    }

    [Fact]
    public void ValidateGraph_RejectsDuplicateLinkKindPerSource()
    {
        var boardId = Guid.NewGuid();
        var lineId = Guid.NewGuid();
        var t1 = Guid.NewGuid();
        var t2 = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [lineId] = new(lineId, "line", null),
            [t1] = new(t1, "note", null),
            [t2] = new(t2, "note", null),
        };
        // Two "line_start" links from the same source — at most one per (source, kind).
        var links = new[] { new ItemLinkDto(lineId, t1, "line_start"), new ItemLinkDto(lineId, t2, "line_start") };

        var act = () => BoardValidator.ValidateGraph(boardId, context, [], links);
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_link");
    }

    [Fact]
    public void ValidateGraph_AllowsValidCreatedFromLink()
    {
        var boardId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var dispenserId = Guid.NewGuid();
        var context = new Dictionary<Guid, ItemGraphNode>
        {
            [noteId] = new(noteId, "note", null),
            [dispenserId] = new(dispenserId, "dispenser", null),
        };
        var link = new ItemLinkDto(noteId, dispenserId, "created_from");

        var act = () => BoardValidator.ValidateGraph(boardId, context, [], [link]);
        act.Should().NotThrow();
    }
}
