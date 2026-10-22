using System.Security.Claims;
using System.Text.Json.Serialization;
using NodexMeshApi.Dtos;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class StatusEndpoints
{
    public sealed record StatusesRequest([property: JsonConverter(typeof(RevisionJsonConverter))] long ExpectedRevision, List<ProjectStatus> Statuses);
    public sealed record StatusesResponse([property: JsonConverter(typeof(RevisionJsonConverter))] long Revision, IReadOnlyList<ProjectStatus> Statuses);

    public static void MapStatusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/projects/{projectId:guid}/statuses").RequireAuthorization().WithTags("Statuses");
        group.MapGet("", async (Guid projectId, ClaimsPrincipal principal, AppDbContext db, IProjectAccessService access, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, principal.GetUserId(), ProjectRole.Viewer, ct);
            var project = await db.Projects.AsNoTracking().SingleAsync(p => p.Id == projectId, ct);
            return Results.Ok(new StatusesResponse(project.Revision, ProjectStatusDefinitions.Read(project.ItemStatuses)));
        });
        group.MapPut("", async (Guid projectId, StatusesRequest request, ClaimsPrincipal principal, AppDbContext db, IProjectAccessService access, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
            ProjectStatusDefinitions.Validate(request.Statuses);
            var project = await db.Projects.SingleAsync(p => p.Id == projectId, ct);
            if (project.Revision != request.ExpectedRevision)
                throw new ApiException(409, "revision_mismatch", "Reload statuses before saving.");
            project.ItemStatuses = ProjectStatusDefinitions.Write(request.Statuses.Select(s => s with { Title = s.Title.Trim() }).ToList());
            project.Revision++;
            project.UpdatedAt = DateTimeOffset.UtcNow;
            project.UpdatedBy = userId;
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateConcurrencyException)
            {
                throw new ApiException(409, "revision_mismatch", "Reload statuses before saving.");
            }
            return Results.Ok(new StatusesResponse(project.Revision, ProjectStatusDefinitions.Read(project.ItemStatuses)));
        });
    }
}
