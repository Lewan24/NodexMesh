using System.Text.Json;
using System.Text.Json.Serialization;

namespace NodexMeshApi.Models;

// ---- shared fragments --------------------------------------------------
public sealed record Entry(string Id, string Text, bool Done);
public sealed record Position(double X, double Y);
public sealed record GeoPoint(double X, double Y, double? Pressure);

public sealed record ItemAppearance(
    string? Color, string? ColorRole, GradientDto? Gradient, string? TopColor,
    TypographyDto? Typography, string? TextAlign, string? FontSize, bool? Bold, bool? Italic);
public sealed record GradientDto(string From, string To, string Kind, double Angle);
public sealed record TypographyDto(
    string? FontFamily, double? FontSize, bool? Bold, bool? Italic, string? TextAlign, string? VerticalAlign, TextSectionsDto? Sections = null);
public sealed record TextSectionStyleDto(string? Color, double? FontSize, bool? Bold, bool? Italic, string? TextAlign);
public sealed record TextSectionsDto(
    TextSectionStyleDto? Title, TextSectionStyleDto? Description, TextSectionStyleDto? Body,
    TextSectionStyleDto? Links, TextSectionStyleDto? Caption, TextSectionStyleDto? Labels);

// ---- the 20 item types, matching itemSchema.ts field-for-field --------
public sealed record SectionTitleData(string Content);
public sealed record BoardBlockData(Guid? BoardId, string Title, string Description, string Icon);
public sealed record NoteData(string Content);
public sealed record TextData(string Content, string Size); // 'sm'|'md'|'lg'|'xl'
public sealed record DocumentData(string Title, string Content, string ContentFormat, int ContentVersion, bool? AutoHeight);
public sealed record CodeData(string Content, string Language, bool? AutoHeight);
public sealed record IconData(string IconMode, string Source, string Label); // preset|emoji|svg|url
public sealed record ImageData(string Url, string Caption, string? Variant, double? ImgHeight);
public sealed record LinkData(string Url, string Title, string Description);
public sealed record EmbedData(string Url, string Title, bool ShowLabel);
public sealed record ChecklistData(string Title, IReadOnlyList<Entry> Entries);
public sealed record KanbanColumnData(string Id, string Title, string Color, double? Width, IReadOnlyList<Entry> Cards);
public sealed record KanbanData(string Title, IReadOnlyList<KanbanColumnData> Columns);
public sealed record TimelineTaskData(string Id, string Title, string Start, string End, bool Done, string Color, IReadOnlyList<Entry> Checklist);
public sealed record TimelineData(string Title, string Mode, double? TaskColumnWidth, IReadOnlyList<TimelineTaskData> Tasks);
public sealed record ColumnData(string Title, string? Layout, double? GridColumns, double? Gap);
public sealed record FrameData(string Title, double? Opacity);
public sealed record DispenserData(string Title);
public sealed record LineData(
    double X2, double Y2, bool ArrowStart, bool ArrowEnd, double StrokeWidth, double? Curve,
    string? LineCap, string? Label, string? LabelMode, double? LabelOffset, double? LabelFontSize, bool? Divider);
public sealed record DrawingStrokeData(IReadOnlyList<GeoPoint> Points, double X, double Y, double ScaleX, double ScaleY, string Color, double StrokeWidth);
public sealed record DrawingData(IReadOnlyList<GeoPoint> Points, double ViewWidth, double ViewHeight, double StrokeWidth, IReadOnlyList<DrawingStrokeData>? Strokes);
public sealed record MindmapNodeData(string Id, string? ParentId, string Label, string Side, string BranchColor, string Background, string TextColor);
public sealed record MindmapData(string Title, string Layout, string LineStyle, double LineWidth, bool Dashed, IReadOnlyList<MindmapNodeData> Nodes);
public sealed record DiagramNodeShapeData(string Label, string Shape, string Color);
public sealed record DiagramNodeData(string Id, Position Position, string Type, DiagramNodeShapeData Data);
public sealed record DiagramEdgeData(string Id, string Source, string Target, string? SourceHandle, string? TargetHandle, string? Label, string? Type);
public sealed record DiagramData(string Title, IReadOnlyList<DiagramNodeData> Nodes, IReadOnlyList<DiagramEdgeData> Edges);
public sealed record DbFieldData(string Id, string Name, string DataType, bool PrimaryKey, bool Nullable, bool Unique, string DefaultValue);
public sealed record DbTableData(string Id, string Name, Position Position, IReadOnlyList<DbFieldData> Fields);
public sealed record DbRelationData(string Id, string Source, string Target, string SourceField, string TargetField, string Cardinality);
public sealed record DatabaseData(string Title, IReadOnlyList<DbTableData> Tables, IReadOnlyList<DbRelationData> Relations);

/// <summary>
/// board_items.Type is the discriminator; this maps it to the CLR record so the
/// service layer can deserialize/validate without EF ever needing to know about
/// 20 different JSON shapes. Also carries `CanNest` (from itemSchema.ts's
/// `canNest` flag) used by BoardValidator for the column-nesting rule.
/// </summary>
public static class BoardItemTypes
{
    public static readonly IReadOnlyDictionary<string, Type> DataTypes = new Dictionary<string, Type>
    {
        ["board"] = typeof(BoardBlockData),
        ["section-title"] = typeof(SectionTitleData), ["note"] = typeof(NoteData),
        ["text"] = typeof(TextData), ["document"] = typeof(DocumentData),
        ["code"] = typeof(CodeData), ["icon"] = typeof(IconData),
        ["image"] = typeof(ImageData), ["link"] = typeof(LinkData),
        ["embed"] = typeof(EmbedData), ["checklist"] = typeof(ChecklistData),
        ["kanban"] = typeof(KanbanData), ["timeline"] = typeof(TimelineData),
        ["column"] = typeof(ColumnData), ["frame"] = typeof(FrameData),
        ["dispenser"] = typeof(DispenserData), ["line"] = typeof(LineData),
        ["drawing"] = typeof(DrawingData), ["mindmap"] = typeof(MindmapData),
        ["diagram"] = typeof(DiagramData), ["database"] = typeof(DatabaseData),
    };

    // Matches itemSchema.ts's canNest flags exactly.
    public static readonly IReadOnlySet<string> Nestable = new HashSet<string>
    {
        "note", "text", "document", "code", "image", "link", "embed", "checklist"
    };

    public static readonly IReadOnlySet<string> All = new HashSet<string>(DataTypes.Keys);

    /// <summary>Rejects unknown JSON properties — the C# analogue of itemSchema.ts's
    /// object() check, which only allows exactly the declared keys (mass-assignment guard).</summary>
    public static readonly JsonSerializerOptions StrictOptions = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static object Deserialize(string type, string json)
    {
        if (!DataTypes.TryGetValue(type, out var clrType))
            throw new Common.ApiException(422, "unsupported_schema", $"Unknown item type '{type}'.");

        try
        {
            return JsonSerializer.Deserialize(json, clrType, StrictOptions)
                ?? throw new Common.ApiException(422, "invalid_item", $"Empty {type} data.");
        }
        catch (JsonException)
        {
            throw new Common.ApiException(422, "invalid_item", $"Invalid {type} content.");
        }
    }
}
