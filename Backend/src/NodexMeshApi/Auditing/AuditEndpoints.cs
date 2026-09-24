using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;

namespace NodexMeshApi.Auditing;

public sealed class AuditQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Category { get; set; }
    public string? Severity { get; set; }
    public string? EventType { get; set; }
    public string? Outcome { get; set; }
    public Guid? ActorId { get; set; }
    public Guid? TargetUserId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ClientIp { get; set; }
    public int? StatusCode { get; set; }
    public string? RequestId { get; set; }
    public string? Search { get; set; }
    public string? Sort { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

public static class AuditEndpoints
{
    public static void MapAuditEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/audit").RequireAuthorization("AdminOnly").WithTags("Administration");
        group.MapGet("/events", async ([AsParameters] AuditQuery filter, AppDbContext db, CancellationToken ct) =>
        {
            var query = Filter(db.AuditEvents.AsNoTracking(), filter);
            var count = await query.CountAsync(ct);
            var ordered = filter.Sort == "oldest" ? query.OrderBy(e => e.OccurredAt).ThenBy(e => e.Id)
                : query.OrderByDescending(e => e.OccurredAt).ThenByDescending(e => e.Id);
            var page = Math.Clamp(filter.Page ?? 1, 1, 10000);
            var size = Math.Clamp(filter.PageSize ?? 50, 1, 100);
            var items = await ordered.Skip((page - 1) * size).Take(size).Select(e => new
            {
                e.Id, e.OccurredAt, e.Category, e.EventType, e.Severity, e.Outcome,
                e.ActorId, e.TargetUserId, e.ProjectId, e.StatusCode, e.RequestId
            }).ToListAsync(ct);
            return Results.Ok(new { items, total = count, page, pageSize = size });
        });
        group.MapGet("/events/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var audit = await db.AuditEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);
            return audit is null ? Results.NotFound() : Results.Ok(audit);
        });
        group.MapGet("/statistics", async (AppDbContext db, AuditHealth health, CancellationToken ct) =>
        {
            var since = DateTime.UtcNow.AddHours(-24);
            var counts = await db.AuditEvents.Where(e => e.OccurredAt >= since).GroupBy(e => e.EventType)
                .Select(g => new { eventType = g.Key, count = g.Count() }).ToListAsync(ct);
            var detectionProcessedThrough = await db.AuditDetectionCheckpoints.Select(c => (DateTime?)c.ProcessedThrough).SingleOrDefaultAsync(ct);
            return Results.Ok(new { since, counts, persistenceFailuresSinceStartup = health.Failures, detectionProcessedThrough });
        });
        group.MapGet("/incidents", async (string? status, int? page, AppDbContext db, CancellationToken ct) =>
        {
            var query = db.SecurityIncidents.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status == status);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(i => i.WindowStart).ThenByDescending(i => i.Id)
                .Skip((Math.Clamp(page ?? 1, 1, 10000) - 1) * 50).Take(50).ToListAsync(ct);
            return Results.Ok(new { items, total });
        });
        group.MapPatch("/incidents/{id:guid}", async (Guid id, ReviewIncident request, HttpContext http,
            AppDbContext db, CancellationToken ct) =>
        {
            if (request.Status is not ("open" or "investigating" or "resolved")) return Results.BadRequest();
            var incident = await db.SecurityIncidents.FirstOrDefaultAsync(i => i.Id == id, ct);
            if (incident is null) return Results.NotFound();
            if (incident.Status == request.Status) return Results.NoContent();
            incident.Status = request.Status;
            incident.ReviewedAt = DateTime.UtcNow;
            incident.ReviewedBy = http.User.GetUserId();
            var audit = AuditCapture.Create(http, "incident.reviewed");
            audit.ResourceId = id.ToString();
            audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new { status = request.Status });
            db.AuditEvents.Add(audit);
            await db.SaveChangesAsync(ct);
            http.Items[AuditCapture.ExplicitEvent] = true;
            AuditWriter.Log(http.RequestServices.GetRequiredService<ILogger<AuditWriter>>(), audit);
            return Results.NoContent();
        });
    }

    public sealed record ReviewIncident(string Status);

    public static IQueryable<AuditEvent> Filter(IQueryable<AuditEvent> query, AuditQuery filter)
    {
        if (filter.From is { } from) query = query.Where(e => e.OccurredAt >= from.ToUniversalTime());
        if (filter.To is { } to) query = query.Where(e => e.OccurredAt <= to.ToUniversalTime());
        if (!string.IsNullOrEmpty(filter.Category)) query = query.Where(e => e.Category == filter.Category);
        if (!string.IsNullOrEmpty(filter.Severity)) query = query.Where(e => e.Severity == filter.Severity);
        if (!string.IsNullOrEmpty(filter.EventType)) query = query.Where(e => e.EventType == filter.EventType);
        if (!string.IsNullOrEmpty(filter.Outcome)) query = query.Where(e => e.Outcome == filter.Outcome);
        if (filter.ActorId.HasValue) query = query.Where(e => e.ActorId == filter.ActorId);
        if (filter.TargetUserId.HasValue) query = query.Where(e => e.TargetUserId == filter.TargetUserId);
        if (filter.ProjectId.HasValue) query = query.Where(e => e.ProjectId == filter.ProjectId);
        if (filter.StatusCode.HasValue) query = query.Where(e => e.StatusCode == filter.StatusCode);
        if (!string.IsNullOrEmpty(filter.RequestId)) query = query.Where(e => e.RequestId == filter.RequestId);
        if (!string.IsNullOrEmpty(filter.ClientIp))
        {
            if (!System.Net.IPAddress.TryParse(filter.ClientIp, out var address))
                throw new ApiException(400, "invalid_ip", "Provide a valid IP address.");
            var ip = (address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address).ToString();
            query = query.Where(e => e.ClientIp == ip);
        }
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = AuditCapture.Clean(filter.Search.Trim(), 100)!;
            query = query.Where(e => e.EventType.Contains(term) || (e.ResourceId != null && e.ResourceId.Contains(term)));
        }
        return query;
    }
}
