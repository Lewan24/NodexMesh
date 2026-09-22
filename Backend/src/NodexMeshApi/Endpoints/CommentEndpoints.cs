using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class CommentEndpoints
{
    public sealed record CommentWrite(Guid Id, string Text, string Status);
    public sealed record UpdateCommentsRequest(
        [property: JsonConverter(typeof(RevisionJsonConverter))] long ExpectedBoardRevision,
        IReadOnlyList<CommentWrite> Upserts, IReadOnlyList<Guid> Deletes);

    public static void MapCommentEndpoints(this IEndpointRouteBuilder app) => app
        .MapPut("/api/v1/boards/{boardId:guid}/items/{itemId:guid}/comments", UpdateAsync)
        .RequireAuthorization().WithTags("Comments");

    private static async Task<Ok<BoardSnapshotDto>> UpdateAsync(
        Guid boardId, Guid itemId, UpdateCommentsRequest request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, IBoardMutationService boards, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");
        await access.RequireAsync(board.ProjectId, userId, ProjectRole.Commenter, ct);
        var role = await access.GetRoleAsync(board.ProjectId, userId, ct);
        var item = await db.BoardItems.FirstOrDefaultAsync(i => i.Id == itemId && i.BoardId == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Item not found.");
        if (board.Revision != request.ExpectedBoardRevision)
            throw new ApiException(409, "revision_mismatch", "Comments changed. Refresh the board and try again.");
        if (request.Upserts is null || request.Deletes is null || request.Upserts.Count + request.Deletes.Count is < 1 or > 100)
            throw new ApiException(422, "invalid_comments", "Submit between 1 and 100 comment changes.");
        var ids = request.Upserts.Select(c => c.Id).Concat(request.Deletes).ToList();
        if (ids.Contains(Guid.Empty) || ids.Distinct().Count() != ids.Count)
            throw new ApiException(422, "invalid_comments", "Comment IDs must be unique and nonempty.");
        var existing = await db.Comments.IgnoreQueryFilters().Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id, ct);
        foreach (var comment in existing.Values)
        {
            if (comment.ItemId != itemId || comment.DeletedAt is not null)
                throw new ApiException(404, "not_found", "Comment not found.");
            if (role == ProjectRole.Commenter && comment.AuthorId != userId)
                throw new ApiException(403, "forbidden", "You can only change your own comments.");
        }
        var now = DateTimeOffset.UtcNow;
        foreach (var value in request.Upserts)
        {
            if (string.IsNullOrWhiteSpace(value.Text) || value.Text.Length > 10000)
                throw new ApiException(422, "invalid_comment", "Comments must contain 1–10,000 characters.");
            var status = value.Status switch
            {
                "open" => CommentStatus.Open, "todo" => CommentStatus.Todo,
                "in-progress" => CommentStatus.InProgress, "resolved" => CommentStatus.Resolved,
                _ => throw new ApiException(422, "invalid_comment", "Invalid comment status.")
            };
            if (!existing.TryGetValue(value.Id, out var comment))
            {
                comment = new Comment { Id = value.Id, ItemId = itemId, AuthorId = userId, CreatedBy = userId, CreatedAt = now };
                db.Comments.Add(comment);
            }
            else comment.Revision++;
            comment.Text = value.Text.Trim();
            comment.Status = status;
            comment.UpdatedAt = now;
            comment.UpdatedBy = userId;
        }
        foreach (var id in request.Deletes)
        {
            if (!existing.TryGetValue(id, out var comment))
                throw new ApiException(404, "not_found", "Comment not found.");
            comment.DeletedAt = now;
            comment.UpdatedAt = now;
            comment.UpdatedBy = userId;
            comment.Revision++;
        }
        board.Revision++;
        board.UpdatedAt = now;
        board.UpdatedBy = userId;
        item.Revision++;
        item.UpdatedAt = now;
        item.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(await boards.GetSnapshotAsync(boardId, ct));
    }
}
