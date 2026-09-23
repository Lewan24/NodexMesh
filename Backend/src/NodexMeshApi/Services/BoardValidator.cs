using System.Text.Json;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

/// <summary>
/// Server-side port of the frontend's itemSchema.ts / boardValidation.ts. The client
/// runs these too, but client-side validation is a UX feature, not a security control —
/// anything reaching the API is untrusted and revalidated here from scratch.
/// </summary>
public static class BoardValidator
{
    public const int MaxItemsPerBoard = 20_000;
    public const int MaxItemBytes = 2_000_000;
    public const int MaxUpsertsPerBatch = 2_000;

    // --- primitive checks, mirroring itemSchema.ts ---
    public static bool IsText(string? v) => v is not null && v.Length <= 200_000;
    public static bool IsNumber(double v) => double.IsFinite(v) && Math.Abs(v) <= 10_000_000;

    public static bool IsUrl(string v)
    {
        if (v.Length == 0) return true;
        if (v.Length > 4096 || !Uri.TryCreate(v, UriKind.Absolute, out var u)) return false;
        // http/https only, and no user:pass@host — matches the frontend's url() check.
        return (u.Scheme is "http" or "https") && string.IsNullOrEmpty(u.UserInfo);
    }

    public static bool IsDay(string v) =>
        DateOnly.TryParseExact(v, "yyyy-MM-dd", out var d) && d.ToString("yyyy-MM-dd") == v;

    /// <summary>Mirrors validateItem() in itemSchema.ts.</summary>
    public static void ValidateItem(ItemWriteDto item)
    {
        if (item.SchemaVersion != 1)
            throw new ApiException(422, "unsupported_schema",
                "This board needs a newer client. Editing has been stopped.");

        if (!BoardItemTypes.All.Contains(item.Type))
            throw new ApiException(422, "unsupported_schema", $"Unknown item type '{item.Type}'.");

        var geometryOk =
            IsNumber(item.X) && IsNumber(item.Y) && IsNumber(item.ZIndex) && IsNumber(item.SortOrder)
            && (item.Width is null || (IsNumber(item.Width.Value) && item.Width > 0))
            && (item.Height is null || (IsNumber(item.Height.Value) && item.Height > 0));

        if (!geometryOk)
            throw new ApiException(422, "invalid_item", $"Invalid {item.Type} content or geometry.");

        if (item.Data.ValueKind != JsonValueKind.Object || item.Appearance.ValueKind != JsonValueKind.Object)
            throw new ApiException(422, "invalid_item", "Item data and appearance must be JSON objects.");

        if (item.Data.GetRawText().Length + item.Appearance.GetRawText().Length > MaxItemBytes)
            throw new ApiException(422, "invalid_item", $"Invalid {item.Type} content or geometry.");

        // Strict deserialization: unknown/missing/wrong-typed fields throw (mass-assignment guard).
        BoardItemTypes.Deserialize(item.Type, item.Data.GetRawText());

        try
        {
            var appearance = JsonSerializer.Deserialize<ItemAppearance>(item.Appearance.GetRawText(), BoardItemTypes.StrictOptions);
            if (appearance?.CustomCss is { } customCss && (customCss.Source is null || customCss.Source.Length > 10_000))
                throw new ApiException(422, "invalid_item", "Custom CSS must contain at most 10,000 characters.");
        }
        catch (JsonException)
        {
            throw new ApiException(422, "invalid_item", $"Invalid {item.Type} appearance.");
        }

        ValidateUrlFields(item);
    }

    /// <summary>
    /// OWASP A10 (SSRF) / stored-XSS surface: image, link and embed items carry
    /// user-supplied URLs that the frontend renders into &lt;img&gt;/&lt;iframe&gt;. Reject
    /// anything that isn't plain http(s) before it is ever stored — javascript: and
    /// data: URIs must never reach the database.
    /// </summary>
    private static void ValidateUrlFields(ItemWriteDto item)
    {
        var raw = item.Data.GetRawText();
        var url = item.Type switch
        {
            "image" => JsonSerializer.Deserialize<ImageData>(raw, BoardItemTypes.StrictOptions)?.Url,
            "link" => JsonSerializer.Deserialize<LinkData>(raw, BoardItemTypes.StrictOptions)?.Url,
            "embed" => JsonSerializer.Deserialize<EmbedData>(raw, BoardItemTypes.StrictOptions)?.Url,
            _ => null
        };

        if (url is not null && !IsUrl(url))
            throw new ApiException(422, "invalid_item", $"Invalid {item.Type} URL.");
    }

    /// <summary>
    /// Mirrors validateBoard() in boardValidation.ts: nesting, frame membership and link
    /// rules. `context` must contain every item referenced by the batch (the touched items
    /// plus their parents/frames/link endpoints), not necessarily the whole board.
    /// </summary>
    public static void ValidateGraph(
        Guid boardId,
        IReadOnlyDictionary<Guid, ItemGraphNode> context,
        IEnumerable<ItemWriteDto> touched,
        IEnumerable<ItemLinkDto> links)
    {
        foreach (var item in touched)
        {
            ValidateItem(item);

            if (item.BoardId != boardId)
                throw new ApiException(422, "invalid_scope", "Item belongs to another board.");

            if (item.ParentItemId is { } parentId)
            {
                // canNest, parent must be a column, and that column must itself be
                // top-level — one level of nesting only.
                var canNest = BoardItemTypes.Nestable.Contains(item.Type);
                if (!canNest
                    || !context.TryGetValue(parentId, out var parent)
                    || parent.Type != "column"
                    || parent.ParentItemId is not null)
                {
                    throw new ApiException(422, "invalid_parent", "Invalid column membership.");
                }
            }

            if (item.FrameId is { } frameId)
            {
                if (frameId == item.Id
                    || !context.TryGetValue(frameId, out var frame)
                    || frame.Type != "frame")
                {
                    throw new ApiException(422, "invalid_frame", "Invalid frame membership.");
                }

                var visitedFrames = new HashSet<Guid> { item.Id };
                Guid? currentFrameId = frameId;
                while (currentFrameId is { } current)
                {
                    if (!visitedFrames.Add(current))
                        throw new ApiException(422, "invalid_frame", "Invalid frame membership.");
                    currentFrameId = context.TryGetValue(current, out var currentFrame) ? currentFrame.FrameId : null;
                }
            }
        }

        var linkKeys = new HashSet<string>();
        var lineEndpoints = new Dictionary<Guid, (Guid? Start, Guid? End)>();
        foreach (var link in links)
        {
            context.TryGetValue(link.SourceItemId, out var source);
            context.TryGetValue(link.TargetItemId, out var target);

            var valid =
                source is not null
                && target is not null
                && link.SourceItemId != link.TargetItemId
                && linkKeys.Add($"{link.SourceItemId}:{link.Kind}")
                && (link.Kind == "created_from"
                    ? source.Type == "note" && target.Type == "dispenser"
                    : (link.Kind is "line_start" or "line_end") && source.Type == "line");

            if (!valid) throw new ApiException(422, "invalid_link", "Invalid item link.");

            if (link.Kind is "line_start" or "line_end")
            {
                lineEndpoints.TryGetValue(link.SourceItemId, out var endpoints);
                lineEndpoints[link.SourceItemId] = link.Kind == "line_start"
                    ? (link.TargetItemId, endpoints.End)
                    : (endpoints.Start, link.TargetItemId);
            }
        }

        var connections = new HashSet<string>();
        foreach (var endpoints in lineEndpoints.Values)
        {
            if (endpoints.Start is not { } start || endpoints.End is not { } end) continue;
            var first = start.CompareTo(end) < 0 ? start : end;
            var second = start.CompareTo(end) < 0 ? end : start;
            if (!connections.Add($"{first}:{second}"))
                throw new ApiException(422, "invalid_link", "Only one line can connect the same two items.");
        }
    }
}

/// <summary>Minimal projection of an item needed for graph validation.</summary>
public sealed record ItemGraphNode(Guid Id, string Type, Guid? ParentItemId, Guid? FrameId = null);
