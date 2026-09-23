using FluentAssertions;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class PresenceRegistryTests
{
    [Fact]
    public void TryAccept_ThrottlesRapidUpdatesFromTheSameConnection()
    {
        var registry = new PresenceRegistry();
        var connectionId = "conn-1";

        registry.TryAccept(connectionId).Should().BeTrue();       // first update always accepted
        registry.TryAccept(connectionId).Should().BeFalse();      // immediate retry throttled
    }

    [Fact]
    public void TryAccept_TracksEachConnectionIndependently()
    {
        var registry = new PresenceRegistry();

        registry.TryAccept("conn-a").Should().BeTrue();
        registry.TryAccept("conn-b").Should().BeTrue(); // a different connection isn't throttled by "a"'s update
    }

    [Fact]
    public void Set_ThenForProject_ReturnsThePresenceJustSet()
    {
        var registry = new PresenceRegistry();
        var projectId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var update = new PresenceUpdate(projectId, boardId, [Guid.NewGuid()], "editing");

        registry.Set("conn-1", update, userId, "Alice");

        var entries = registry.ForProject(projectId);
        entries.Should().ContainSingle(e => e.Presence.UserId == userId && e.Presence.Mode == "editing");
    }

    [Fact]
    public void Set_PreservesEphemeralCursorCoordinates()
    {
        var registry = new PresenceRegistry();
        var projectId = Guid.NewGuid();
        var update = new PresenceUpdate(projectId, Guid.NewGuid(), [], "selected", 123.5, -42.25);

        registry.Set("conn-1", update, Guid.NewGuid(), "Alice");

        var presence = registry.ForProject(projectId).Single().Presence;
        presence.CursorX.Should().Be(123.5);
        presence.CursorY.Should().Be(-42.25);
    }

    [Fact]
    public void Remove_ReturnsThePreviousValueAndClearsIt()
    {
        var registry = new PresenceRegistry();
        var update = new PresenceUpdate(Guid.NewGuid(), Guid.NewGuid(), [], "selected");
        registry.Set("conn-1", update, Guid.NewGuid(), "Bob");

        var removed = registry.Remove("conn-1", out var previous);

        removed.Should().BeTrue();
        previous.Should().NotBeNull();
        registry.Remove("conn-1", out _).Should().BeFalse(); // already gone
    }

    [Fact]
    public void LockedItems_ExcludesTheCallersOwnSelections()
    {
        var registry = new PresenceRegistry();
        var projectId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var sharedItem = Guid.NewGuid();

        registry.Set("conn-1", new PresenceUpdate(projectId, boardId, [sharedItem], "editing"), userId, "Self");

        // A user should never be blocked from editing what they themselves have selected.
        registry.LockedItems(projectId, boardId, userId).Should().NotContain(sharedItem);
    }

    [Fact]
    public void LockedItems_IncludesItemsSelectedByOtherCollaborators()
    {
        var registry = new PresenceRegistry();
        var projectId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var myUserId = Guid.NewGuid();
        var lockedItem = Guid.NewGuid();

        registry.Set("conn-other", new PresenceUpdate(projectId, boardId, [lockedItem], "editing"), otherUserId, "Other");

        registry.LockedItems(projectId, boardId, myUserId).Should().Contain(lockedItem);
    }

    [Fact]
    public void LockedItems_IgnoresPresenceFromADifferentBoard()
    {
        var registry = new PresenceRegistry();
        var projectId = Guid.NewGuid();
        var boardA = Guid.NewGuid();
        var boardB = Guid.NewGuid();
        var itemOnBoardA = Guid.NewGuid();

        registry.Set("conn-1", new PresenceUpdate(projectId, boardA, [itemOnBoardA], "editing"), Guid.NewGuid(), "Alice");

        registry.LockedItems(projectId, boardB, Guid.NewGuid()).Should().NotContain(itemOnBoardA);
    }
}
