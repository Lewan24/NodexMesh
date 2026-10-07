using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Services;
using NodexMeshApi.Dtos;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class TaskProjectionTests
{
    private static JsonElement Json(string source) => JsonDocument.Parse(source).RootElement;

    [Fact]
    public void HundredsOfCompletedTasksAreOmittedWhileProgressCountsRemainAccurate()
    {
        var data = JsonSerializer.SerializeToElement(new { title = "Tasks", entries = Enumerable.Range(0, 500)
            .Select(i => new { id = i.ToString(), text = new string('x', 100), done = i != 0 }).ToArray() });
        var now = DateTimeOffset.UtcNow;
        var item = new ItemRecordDto(Guid.NewGuid(), Guid.NewGuid(), null, null, 0, 0, 0, 100, 100, 0,
            false, "checklist", 1, Json("{}"), data, 1, now, now, null, null, null);
        TaskProjection.ForPreference(item).Data.GetProperty("entries").GetArrayLength().Should().Be(500);
        var optedIn = item with { Data = JsonSerializer.SerializeToElement(new { title = "Tasks", hideCompleted = true,
            entries = data.GetProperty("entries") }) };
        TaskProjection.ForPreference(optedIn).Data.GetProperty("entries").GetArrayLength().Should().Be(1);
        var partial = TaskProjection.Undone(item);
        partial.Data.GetProperty("entries").GetArrayLength().Should().Be(1);
        partial.TaskSummary!.CompletedCount.Should().Be(499);
        partial.Data.GetRawText().Length.Should().BeLessThan(data.GetRawText().Length / 100);
        item.Data.GetProperty("entries").GetArrayLength().Should().Be(500);
    }

    [Fact]
    public void MovingACompletedCardDoesNotDuplicateItAndDeletingAColumnRemovesHiddenCards()
    {
        var stored = Json("""
            {"title":"Tasks","columns":[
              {"id":"first","title":"First","color":"#fff","cards":[{"id":"moved","text":"Moved","done":true},{"id":"hidden","text":"Hidden","done":true}]},
              {"id":"removed","title":"Removed","color":"#fff","cards":[{"id":"deleted","text":"Deleted","done":true}]},
              {"id":"second","title":"Second","color":"#fff","cards":[]}]}
            """);
        var incoming = Json("""
            {"title":"Tasks","columns":[
              {"id":"first","title":"First","color":"#fff","cards":[]},
              {"id":"second","title":"Second","color":"#fff","cards":[{"id":"moved","text":"Reopened","done":false}]}]}
            """);
        var merged = TaskProjection.Merge("kanban", incoming, stored);
        var columns = merged.GetProperty("columns").EnumerateArray().ToList();
        columns[0].GetProperty("cards").GetArrayLength().Should().Be(1);
        columns[0].GetProperty("cards")[0].GetProperty("id").GetString().Should().Be("hidden");
        columns[1].GetProperty("cards").GetArrayLength().Should().Be(1);
        columns[1].GetProperty("cards")[0].GetProperty("done").GetBoolean().Should().BeFalse();
        merged.GetRawText().Should().NotContain("deleted");
    }

    [Fact]
    public void APartialEditCanReopenAStoredCompletedTaskWithoutLosingOtherHiddenTasks()
    {
        var stored = Json("""{"title":"Tasks","entries":[{"id":"first","text":"First","done":true},{"id":"second","text":"Second","done":true}]}""");
        var incoming = Json("""{"title":"Edited","entries":[{"id":"first","text":"Reopened","done":false}]}""");
        var merged = TaskProjection.Merge("checklist", incoming, stored);
        merged.GetProperty("entries").GetArrayLength().Should().Be(2);
        merged.GetProperty("entries")[0].GetProperty("text").GetString().Should().Be("Reopened");
        TaskProjection.Completed("checklist", merged).GetProperty("entries").GetArrayLength().Should().Be(1);
    }
}
