using FluentAssertions;
using NodexMeshApi.Common;
using NodexMeshApi.Models;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class BoardItemTypesTests
{
    [Fact]
    public void Appearance_SectionTypography_RoundTripsWithStrictOptions()
    {
        const string json = """{"typography":{"fontFamily":"serif","sections":{"title":{"color":"#ffffff","fontSize":24},"description":{"fontSize":14,"bold":false}}}}""";
        var appearance = System.Text.Json.JsonSerializer.Deserialize<ItemAppearance>(json, BoardItemTypes.StrictOptions)!;
        appearance.Typography!.Sections!.Title!.Color.Should().Be("#ffffff");
        appearance.Typography.Sections.Description!.FontSize.Should().Be(14);
        var saved = System.Text.Json.JsonSerializer.Serialize(appearance, BoardItemTypes.StrictOptions);
        var restored = System.Text.Json.JsonSerializer.Deserialize<ItemAppearance>(saved, BoardItemTypes.StrictOptions)!;
        restored.Should().BeEquivalentTo(appearance);
    }

    [Fact]
    public void Deserialize_ThrowsForUnknownType()
    {
        var act = () => BoardItemTypes.Deserialize("not-a-real-type", "{}");
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 422 && e.Code == "unsupported_schema");
    }

    [Fact]
    public void Deserialize_ThrowsOnMalformedJson()
    {
        var act = () => BoardItemTypes.Deserialize("note", "{ not json");
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 422 && e.Code == "invalid_item");
    }

    [Fact]
    public void Deserialize_ThrowsOnUnknownProperty_MassAssignmentGuard()
    {
        // The strict JsonSerializerOptions (UnmappedMemberHandling.Disallow) is the entire
        // defense against a client smuggling extra fields into stored item data.
        var act = () => BoardItemTypes.Deserialize("note", """{"content":"hi","role":"admin"}""");
        act.Should().Throw<ApiException>().Where(e => e.Code == "invalid_item");
    }

    [Fact]
    public void Deserialize_ThrowsOnMissingRequiredProperty()
    {
        // NoteData requires Content; an empty object can't satisfy a non-nullable string
        // constructor parameter under strict deserialization.
        var act = () => BoardItemTypes.Deserialize("note", "");
        act.Should().Throw<ApiException>();
    }

    [Fact]
    public void Deserialize_SucceedsForWellFormedNote()
    {
        var result = BoardItemTypes.Deserialize("note", """{"content":"hello world"}""");
        result.Should().BeOfType<NoteData>().Which.Content.Should().Be("hello world");
    }

    [Theory]
    [InlineData("board")]
    [InlineData("section-title")]
    [InlineData("text")]
    [InlineData("document")]
    [InlineData("code")]
    [InlineData("icon")]
    [InlineData("image")]
    [InlineData("link")]
    [InlineData("embed")]
    [InlineData("checklist")]
    [InlineData("kanban")]
    [InlineData("timeline")]
    [InlineData("column")]
    [InlineData("frame")]
    [InlineData("dispenser")]
    [InlineData("line")]
    [InlineData("drawing")]
    [InlineData("mindmap")]
    [InlineData("diagram")]
    [InlineData("database")]
    public void All_KnownTypes_HaveARegisteredClrShape(string type)
    {
        BoardItemTypes.DataTypes.Should().ContainKey(type);
        BoardItemTypes.All.Should().Contain(type);
    }

    [Fact]
    public void Nestable_IsASubsetOfAllTypes()
    {
        // Every nestable type must also be a recognised item type — otherwise the
        // graph-validation "canNest" check could pass for a type with no CLR shape.
        BoardItemTypes.Nestable.Should().BeSubsetOf(BoardItemTypes.All);
    }

    [Fact]
    public void Nestable_ExcludesStructuralTypes()
    {
        // Columns, frames and dispensers organise the canvas; nesting them into each
        // other would break the "one level of nesting" invariant BoardValidator enforces.
        BoardItemTypes.Nestable.Should().NotContain(["column", "frame", "dispenser", "line", "board"]);
    }
}
