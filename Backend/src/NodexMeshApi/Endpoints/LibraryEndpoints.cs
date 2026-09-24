using NodexMeshApi.Auditing;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class LibraryEndpoints
{
    public sealed record RenameRequest([Required, StringLength(200, MinimumLength = 1)] string Name);
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static object Dto(LibraryAsset asset, bool includeShareLink = false) => new
    {
        asset.Id, asset.ProjectId, asset.Name, asset.ContentType, asset.Size, asset.CreatedAt,
        shared = asset.ShareTokenHash != null || asset.ShareToken != null,
        sharePath = includeShareLink && asset.ShareToken != null ? SharePath(asset) : null
    };

    public static void MapLibraryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/projects/{projectId:guid}/library").RequireAuthorization().WithTags("Library");
        group.MapGet("", async (Guid projectId, HttpContext context, IProjectAccessService access, AppDbContext db, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Viewer, ct);
            var assets = await db.LibraryAssets.Where(a => a.ProjectId == projectId).ToListAsync(ct);
            var role = await access.GetRoleAsync(projectId, context.User.GetUserId(), ct);
            return Results.Ok(new { canManage = role >= ProjectRole.Editor, canShare = role == ProjectRole.Owner, assets = assets.OrderByDescending(a => a.CreatedAt).Select(a => Dto(a, role == ProjectRole.Owner)) });
        });
        group.MapPost("", UploadAsync);
        group.MapGet("/{id:guid}/content", async (Guid projectId, Guid id, HttpContext context, IProjectAccessService access, AppDbContext db, LibraryStorage storage, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Viewer, ct);
            var asset = await Find(db, projectId, id, ct);
            return Content(asset, storage, context);
        });
        group.MapPatch("/{id:guid}", async (Guid projectId, Guid id, RenameRequest request, HttpContext context, IProjectAccessService access, AppDbContext db, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Editor, ct);
            var asset = await Find(db, projectId, id, ct);
            if (string.IsNullOrWhiteSpace(request.Name)) throw new ApiException(422, "invalid_name", "Name is required.");
            asset.Name = request.Name.Trim();
            await db.SaveChangesAsync(ct);
            return Results.Ok(Dto(asset));
        });
        group.MapDelete("/{id:guid}", async (Guid projectId, Guid id, HttpContext context, IProjectAccessService access, AppDbContext db, LibraryStorage storage, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Editor, ct);
            var asset = await Find(db, projectId, id, ct);
            db.LibraryAssets.Remove(asset);
            await db.SaveChangesAsync(ct);
            File.Delete(storage.FilePath(id));
            return Results.NoContent();
        });
        group.MapPost("/{id:guid}/share", async (Guid projectId, Guid id, HttpContext context, IProjectAccessService access, AppDbContext db, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Owner, ct);
            var asset = await Find(db, projectId, id, ct);
            // Set once, including concurrent requests. Keep any old hash-only link alive:
            // its original token cannot be recovered, so this adds a stable alias.
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                var changed = await db.LibraryAssets.Where(a => a.Id == id && a.ProjectId == projectId && a.ShareToken == null)
                    .ExecuteUpdateAsync(update => update.SetProperty(a => a.ShareToken, token), ct);
                if (changed > 0)
                {
                    var audit = AuditCapture.Create(context, "library.share_created", "activity");
                    audit.ResourceType = "LibraryAsset";
                    audit.ResourceId = id.ToString();
                    db.AuditEvents.Add(audit);
                    await db.SaveChangesAsync(ct);
                }
                await transaction.CommitAsync(ct);
            });
            await db.LibraryAssets.Where(a => a.Id == id && a.ProjectId == projectId && a.ShareToken == null)
                .ExecuteUpdateAsync(update => update.SetProperty(a => a.ShareToken, token), ct);
            await db.Entry(asset).ReloadAsync(ct);
            if (asset.ShareToken is null)
                throw new ApiException(409, "share_changed", "Public access changed. Please try again.");
            return Results.Ok(new { path = SharePath(asset) });
        });
        group.MapDelete("/{id:guid}/share", async (Guid projectId, Guid id, HttpContext context, IProjectAccessService access, AppDbContext db, CancellationToken ct) =>
        {
            await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Owner, ct);
            var asset = await Find(db, projectId, id, ct);
            asset.ShareTokenHash = null;
            asset.ShareToken = null;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        app.MapGet("/api/v1/library/shared/{token}", async (string token, AppDbContext db, LibraryStorage storage, HttpContext context, CancellationToken ct) =>
        {
            if (token.Length != 64) return Results.NotFound();
            var hash = Hash(token);
            var asset = await db.LibraryAssets.FirstOrDefaultAsync(a => (a.ShareTokenHash == hash || a.ShareToken == token) && db.Projects.Any(p => p.Id == a.ProjectId), ct);
            return asset is null ? Results.NotFound() : Content(asset, storage, context);
        }).AllowAnonymous().RequireRateLimiting("public-share");
    }

    private static string SharePath(LibraryAsset asset) =>
        $"/library/shared/{asset.ShareToken}" + (asset.ContentType.StartsWith("video/") ? "?type=video" : "");

    private static async Task<LibraryAsset> Find(AppDbContext db, Guid projectId, Guid id, CancellationToken ct) =>
        await db.LibraryAssets.FirstOrDefaultAsync(a => a.ProjectId == projectId && a.Id == id, ct)
        ?? throw new ApiException(404, "not_found", "Library file not found.");

    private static IResult Content(LibraryAsset asset, LibraryStorage storage, HttpContext context)
    {
        var path = storage.FilePath(asset.Id);
        if (!File.Exists(path)) return Results.NotFound();
        context.Response.Headers.CacheControl = "no-store";
        context.Response.Headers.ContentSecurityPolicy = "sandbox; default-src 'none'; style-src 'none'";
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers["Cross-Origin-Resource-Policy"] = asset.ShareTokenHash is null && asset.ShareToken is null ? "same-origin" : "cross-origin";
        return Results.File(path, asset.ContentType, enableRangeProcessing: true);
    }

    private static async Task<IResult> UploadAsync(Guid projectId, string name, HttpContext context,
        IProjectAccessService access, AppDbContext db, LibraryStorage storage, IOptions<LibraryOptions> options, CancellationToken ct)
    {
        await access.RequireAsync(projectId, context.User.GetUserId(), ProjectRole.Editor, ct);
        if (string.IsNullOrWhiteSpace(name) || name.Length > 200) throw new ApiException(422, "invalid_name", "File name must contain 1–200 characters.");
        var usedBytes = await db.LibraryAssets.Where(a => a.ProjectId == projectId).SumAsync(a => (long?)a.Size, ct) ?? 0;
        var remainingBytes = options.Value.MaxProjectBytes - usedBytes;
        if (remainingBytes <= 0) throw new ApiException(413, "library_full", "Project library storage limit reached.");
        var limit = Math.Min(options.Value.MaxFileBytes, remainingBytes);
        var feature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (feature is { IsReadOnly: false }) feature.MaxRequestBodySize = limit;
        if (context.Request.ContentLength > limit) throw new ApiException(413, "file_too_large", "File exceeds the upload limit.");
        Directory.CreateDirectory(storage.Root);
        var asset = new LibraryAsset { Id = Guid.NewGuid(), ProjectId = projectId, Name = name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
        var path = storage.FilePath(asset.Id);
        try
        {
            await using (var file = new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 65536, true))
            {
                var buffer = new byte[65536];
                int read;
                while ((read = await context.Request.Body.ReadAsync(buffer, ct)) > 0)
                {
                    asset.Size += read;
                    if (asset.Size > limit) throw new ApiException(413, "file_too_large", "File exceeds the upload limit.");
                    await file.WriteAsync(buffer.AsMemory(0, read), ct);
                }
                if (asset.Size < 12) throw new ApiException(422, "invalid_media", "File is empty or invalid.");
                file.Position = 0;
                var header = new byte[12];
                await file.ReadExactlyAsync(header, ct);
                asset.ContentType = LibraryStorage.Validate(header, System.IO.Path.GetExtension(name), file);
            }
            // Serialize quota checks across API replicas. Retrying the DB work never rereads the upload.
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                if (await db.LibraryAssets.AnyAsync(a => a.Id == asset.Id, ct)) return;
                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                if (db.Database.IsNpgsql())
                    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({BitConverter.ToInt64(projectId.ToByteArray())})", ct);
                var used = await db.LibraryAssets.Where(a => a.ProjectId == projectId).SumAsync(a => (long?)a.Size, ct) ?? 0;
                if (used + asset.Size > options.Value.MaxProjectBytes) throw new ApiException(413, "library_full", "Project library storage limit reached.");
                db.LibraryAssets.Add(asset);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            });
            return Results.Ok(Dto(asset));
        }
        catch
        {
            File.Delete(path);
            throw;
        }
    }
}
