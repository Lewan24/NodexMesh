using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;

namespace NodexMeshApi.Services;

public sealed record PresenceUpdate(Guid ProjectId, Guid BoardId, IReadOnlyList<Guid> ItemIds, string Mode);

public sealed record CollaboratorPresence(
    Guid ProjectId,
    Guid BoardId,
    Guid UserId,
    string DisplayName,
    IReadOnlyList<Guid> ItemIds,
    string Mode,
    DateTimeOffset ExpiresAt);

public interface ICollaborationClient
{
    Task PresenceChanged(CollaboratorPresence presence);
    Task PresenceCleared(Guid userId, string connectionId);
}

public sealed class PresenceRegistry
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromSeconds(15);
    private readonly ConcurrentDictionary<string, CollaboratorPresence> states = new();
    private readonly ConcurrentDictionary<string, long> lastUpdate = new();

    public DateTimeOffset Expiry => DateTimeOffset.UtcNow.Add(Lifetime);

    public bool TryAccept(string connectionId)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var previous = lastUpdate.GetOrAdd(connectionId, 0);
        if (now - previous < 200) return false;
        lastUpdate[connectionId] = now;
        return true;
    }

    public CollaboratorPresence Set(string connectionId, PresenceUpdate request, Guid userId, string displayName)
    {
        var value = new CollaboratorPresence(
            request.ProjectId,
            request.BoardId,
            userId,
            displayName,
            request.ItemIds,
            request.Mode,
            Expiry);
        states[connectionId] = value;
        return value;
    }

    public bool Remove(string connectionId, out CollaboratorPresence? previous)
    {
        lastUpdate.TryRemove(connectionId, out _);
        return states.TryRemove(connectionId, out previous);
    }

    public IReadOnlyList<(string ConnectionId, CollaboratorPresence Presence)> RemoveExpired()
    {
        var now = DateTimeOffset.UtcNow;
        var removed = new List<(string, CollaboratorPresence)>();
        foreach (var entry in states)
        {
            if (entry.Value.ExpiresAt <= now && states.TryRemove(entry.Key, out var value))
                removed.Add((entry.Key, value));
        }
        return removed;
    }

    public IReadOnlyList<(string ConnectionId, CollaboratorPresence Presence)> ForProject(Guid projectId)
    {
        RemoveExpired();
        return states.Where(entry => entry.Value.ProjectId == projectId)
            .Select(entry => (entry.Key, entry.Value))
            .ToList();
    }

    public IReadOnlySet<Guid> LockedItems(Guid projectId, Guid boardId, Guid userId)
    {
        RemoveExpired();
        return states.Values
            .Where(value => value.ProjectId == projectId && value.BoardId == boardId && value.UserId != userId)
            .SelectMany(value => value.ItemIds)
            .ToHashSet();
    }
}

[Authorize]
public sealed class CollaborationHub(
    IProjectAccessService access,
    AppDbContext db,
    PresenceRegistry presence) : Hub<ICollaborationClient>
{
    private const int MaxItems = 50;
    private static readonly HashSet<string> Modes = ["selected", "editing"];

    public async Task JoinProject(Guid projectId)
    {
        var userId = CurrentUserId();
        await access.RequireAsync(projectId, userId, Common.ProjectRole.Viewer, Context.ConnectionAborted);
        var group = Group(projectId);
        await Groups.AddToGroupAsync(Context.ConnectionId, group, Context.ConnectionAborted);
        Context.Items[ProjectKey] = projectId;

        foreach (var entry in presence.ForProject(projectId))
            if (entry.ConnectionId != Context.ConnectionId)
                await Clients.Caller.PresenceChanged(entry.Presence);
    }

    public async Task LeaveProject(Guid projectId)
    {
        if (Context.Items.TryGetValue(ProjectKey, out var value) && value is Guid joined && joined == projectId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(projectId), Context.ConnectionAborted);
            Context.Items.Remove(ProjectKey);
            if (presence.Remove(Context.ConnectionId, out var previous) && previous is not null)
                await Clients.OthersInGroup(Group(projectId)).PresenceCleared(previous.UserId, Context.ConnectionId);
        }
    }

    public async Task UpdatePresence(PresenceUpdate request)
    {
        if (request.ItemIds is null || request.ItemIds.Count > MaxItems || !Modes.Contains(request.Mode))
            throw new HubException("Invalid presence payload.");
        if (!presence.TryAccept(Context.ConnectionId)) //Presence update rate limit exceeded for connection
            return;
        if (Context.Items[ProjectKey] is not Guid joined || joined != request.ProjectId)
            throw new HubException("Join the project before publishing presence.");

        var userId = CurrentUserId();
        await access.RequireAsync(request.ProjectId, userId, Common.ProjectRole.Viewer, Context.ConnectionAborted);
        var displayName = await db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.DisplayName)
            .SingleOrDefaultAsync(Context.ConnectionAborted) ?? "Collaborator";
        var safeName = displayName.Length > 80 ? displayName[..80] : displayName;
        var value = presence.Set(Context.ConnectionId, request with { ItemIds = request.ItemIds.Distinct().Take(MaxItems).ToArray() }, userId, safeName);
        await Clients.OthersInGroup(Group(request.ProjectId)).PresenceChanged(value);
        await ClearExpired(request.ProjectId);
    }

    public async Task ClearPresence(Guid projectId)
    {
        if (Context.Items[ProjectKey] is Guid joined && joined == projectId)
        {
            if (presence.Remove(Context.ConnectionId, out var previous) && previous is not null)
                await Clients.OthersInGroup(Group(projectId)).PresenceCleared(previous.UserId, Context.ConnectionId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Remove(Context.ConnectionId, out var previous) && previous is not null)
            await Clients.OthersInGroup(Group(previous.ProjectId)).PresenceCleared(previous.UserId, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task ClearExpired(Guid projectId)
    {
        foreach (var entry in presence.RemoveExpired().Where(entry => entry.Presence.ProjectId == projectId))
            await Clients.Group(Group(projectId)).PresenceCleared(entry.Presence.UserId, entry.ConnectionId);
    }

    private Guid CurrentUserId()
    {
        var raw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? Context.User?.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id) ? id : throw new HubException("Invalid user identity.");
    }

    private static string Group(Guid projectId) => $"project:{projectId:N}";
    private const string ProjectKey = "collaboration-project";
}
