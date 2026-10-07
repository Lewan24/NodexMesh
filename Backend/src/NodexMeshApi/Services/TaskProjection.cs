using System.Text.Json;
using System.Text.Json.Nodes;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;

namespace NodexMeshApi.Services;

/// <summary>Projects task payloads without changing stored data; merges partial edits before validation.</summary>
public static class TaskProjection
{
    public static BoardSnapshotDto Project(BoardSnapshotDto snapshot, bool? includeCompleted, string? includeCompletedFor)
    {
        var expanded = ExpandedIds(includeCompleted, includeCompletedFor);
        if (includeCompleted != false) return snapshot;
        return snapshot with { Items = snapshot.Items.Select(i => expanded.Contains(i.Id) || !HidesCompleted(i) ? i : Undone(i)).ToList() };
    }

    public static ItemRecordDto ForPreference(ItemRecordDto item) => HidesCompleted(item) ? Undone(item) : item;

    private static bool HidesCompleted(ItemRecordDto item) => (item.Type is "checklist" or "kanban")
        && item.Data.TryGetProperty("hideCompleted", out var value) && value.ValueKind == JsonValueKind.True;

    public static HashSet<Guid> ExpandedIds(bool? includeCompleted, string? includeCompletedFor)
    {
        var expanded = new HashSet<Guid>();
        if (includeCompleted != false) return expanded;
        if (!string.IsNullOrEmpty(includeCompletedFor))
        {
            var ids = includeCompletedFor.Split(',');
            if (ids.Length > 100 || ids.Any(id => !Guid.TryParse(id, out _)))
                throw new ApiException(422, "invalid_page", "Supply at most 100 task block IDs.");
            expanded.UnionWith(ids.Select(Guid.Parse));
        }
        return expanded;
    }

    public static ItemRecordDto Undone(ItemRecordDto item)
    {
        if (item.Type is not ("checklist" or "kanban")) return item;
        var data = JsonNode.Parse(item.Data.GetRawText())!.AsObject();
        var counts = new Dictionary<string, int>();
        var completed = 0;
        void Filter(JsonObject container, string key, string? columnId)
        {
            var entries = container[key]!.AsArray();
            var doneCount = entries.Count(IsDone);
            completed += doneCount;
            if (columnId is not null) counts[columnId] = doneCount;
            container[key] = new JsonArray(entries.Where(e => !IsDone(e)).Select(e => e!.DeepClone()).ToArray());
        }
        if (item.Type == "checklist") Filter(data, "entries", null);
        else foreach (var column in data["columns"]!.AsArray())
            Filter(column!.AsObject(), "cards", column["id"]!.GetValue<string>());
        return item with { Data = JsonSerializer.SerializeToElement(data), TaskSummary = completed > 0 ? new(completed, counts) : null };
    }

    public static BoardSnapshotDto Undone(BoardSnapshotDto board) => board with { Items = board.Items.Select(Undone).ToList() };

    public static JsonElement Completed(string type, JsonElement source)
    {
        var data = JsonNode.Parse(source.GetRawText())!.AsObject();
        void Filter(JsonObject container, string key)
        {
            var entries = container[key]!.AsArray();
            container[key] = new JsonArray(entries.Where(IsDone).Select(e => e!.DeepClone()).ToArray());
        }
        if (type == "checklist") Filter(data, "entries");
        else foreach (var column in data["columns"]!.AsArray()) Filter(column!.AsObject(), "cards");
        return JsonSerializer.SerializeToElement(data);
    }

    public static JsonElement Merge(string type, JsonElement incoming, JsonElement stored)
    {
        if (type is not ("checklist" or "kanban"))
            throw new ApiException(422, "invalid_item", "Partial tasks are supported only for checklists and kanbans.");
        var next = JsonNode.Parse(incoming.GetRawText())!.AsObject();
        var previous = JsonNode.Parse(stored.GetRawText())!.AsObject();
        var submittedIds = type == "kanban"
            ? next["columns"]!.AsArray().SelectMany(c => c!["cards"]!.AsArray()).Select(e => e!["id"]!.GetValue<string>()).ToHashSet()
            : next["entries"]!.AsArray().Select(e => e!["id"]!.GetValue<string>()).ToHashSet();
        void MergeEntries(JsonObject target, JsonObject source, string key)
        {
            var entries = target[key]?.AsArray() ?? throw new ApiException(422, "invalid_item", "Missing task array.");
            foreach (var entry in source[key]!.AsArray().Where(IsDone))
                if (!submittedIds.Contains(entry!["id"]!.GetValue<string>())) entries.Add(entry.DeepClone());
        }
        if (type == "checklist") MergeEntries(next, previous, "entries");
        else
        {
            // Removing a column explicitly removes its tasks, including hidden completed tasks.
            foreach (var column in next["columns"]!.AsArray())
            {
                var old = previous["columns"]!.AsArray().FirstOrDefault(c => c!["id"]!.GetValue<string>() == column!["id"]!.GetValue<string>());
                if (old is not null) MergeEntries(column!.AsObject(), old.AsObject(), "cards");
            }
        }
        return JsonSerializer.SerializeToElement(next);
    }

    private static bool IsDone(JsonNode? entry) => entry?["done"]?.GetValue<bool>() == true;
}
