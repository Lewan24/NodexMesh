using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class IdentityMediaEndpoints
{
    public sealed record BrandingDto(string ApplicationName, Guid? LogoId);
    public sealed record BrandingRequest([property: Required, StringLength(100, MinimumLength = 1)] string ApplicationName);

    public static void MapIdentityMediaEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/branding", BrandingAsync).AllowAnonymous();
        app.MapGet("/api/v1/media/images/{id:guid}", ContentAsync).AllowAnonymous();
        app.MapPut("/api/v1/auth/profile/avatar", (HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) =>
            AvatarAsync(context.User.GetUserId(), context, db, storage, false, ct)).RequireAuthorization();
        app.MapDelete("/api/v1/auth/profile/avatar", (HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) =>
            AvatarAsync(context.User.GetUserId(), context, db, storage, true, ct)).RequireAuthorization();
        var admin = app.MapGroup("/api/v1/admin").RequireAuthorization("AdminOnly");
        admin.MapPut("/users/{userId:guid}/avatar", (Guid userId, HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) =>
            AvatarAsync(userId, context, db, storage, false, ct));
        admin.MapDelete("/users/{userId:guid}/avatar", (Guid userId, HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) =>
            AvatarAsync(userId, context, db, storage, true, ct));
        admin.MapPut("/settings/branding", async (BrandingRequest request, AppDbContext db, CancellationToken ct) =>
        {
            var name = request.ApplicationName.Trim();
            if (name.Length == 0 || name.Any(char.IsControl)) throw new ApiException(422, "invalid_name", "Application name is required.");
            await EnsureSettingsAsync(db, ct);
            await db.SystemSettings.Where(s => s.Id == 1).ExecuteUpdateAsync(s => s.SetProperty(v => v.ApplicationName, name), ct);
            return await BrandingAsync(db, ct);
        });
        admin.MapPut("/settings/branding/logo", (HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) => LogoAsync(context, db, storage, false, ct));
        admin.MapDelete("/settings/branding/logo", (HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct) => LogoAsync(context, db, storage, true, ct));
    }

    private static async Task<BrandingDto> BrandingAsync(AppDbContext db, CancellationToken ct) =>
        await db.SystemSettings.AsNoTracking().Select(s => new BrandingDto(s.ApplicationName, s.LogoId)).FirstOrDefaultAsync(ct)
            ?? new BrandingDto("NodexMesh", null);

    private static async Task EnsureSettingsAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.SystemSettings.AnyAsync(s => s.Id == 1, ct)) return;
        db.SystemSettings.Add(new SystemSettings { Id = 1 });
        await db.SaveChangesAsync(ct);
    }

    private static async Task<IResult> AvatarAsync(Guid userId, HttpContext context, AppDbContext db, PublicImageStorage storage, bool remove, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new ApiException(404, "not_found", "User not found.");
        var image = remove ? ((Guid Id, string ContentType)?)null : await storage.WriteAsync(context.Request, false, ct);
        var id = image?.Id;
        var concurrencyStamp = Guid.NewGuid().ToString();
        try
        {
            var changed = await db.Users.Where(u => u.Id == userId && u.AvatarId == user.AvatarId).ExecuteUpdateAsync(s => s
                .SetProperty(u => u.AvatarId, id).SetProperty(u => u.AvatarContentType, image == null ? null : image.Value.ContentType)
                .SetProperty(u => u.ConcurrencyStamp, concurrencyStamp), ct);
            if (changed != 1 && !await db.Users.AnyAsync(u => u.Id == userId && u.AvatarId == id, ct)) throw new ApiException(409, "image_changed", "The image changed in another session. Try again.");
        }
        catch (ApiException) { storage.Delete(id); throw; }
        storage.Delete(user.AvatarId);
        return Results.Ok(new { avatarId = id });
    }

    private static async Task<IResult> LogoAsync(HttpContext context, AppDbContext db, PublicImageStorage storage, bool remove, CancellationToken ct)
    {
        await EnsureSettingsAsync(db, ct);
        var previous = await db.SystemSettings.AsNoTracking().Where(s => s.Id == 1).Select(s => s.LogoId).SingleAsync(ct);
        var image = remove ? ((Guid Id, string ContentType)?)null : await storage.WriteAsync(context.Request, true, ct);
        var id = image?.Id;
        try
        {
            var changed = await db.SystemSettings.Where(s => s.Id == 1 && s.LogoId == previous).ExecuteUpdateAsync(s => s
                .SetProperty(v => v.LogoId, id).SetProperty(v => v.LogoContentType, image == null ? null : image.Value.ContentType), ct);
            if (changed != 1 && !await db.SystemSettings.AnyAsync(v => v.Id == 1 && v.LogoId == id, ct)) throw new ApiException(409, "image_changed", "The image changed in another session. Try again.");
        }
        catch (ApiException) { storage.Delete(id); throw; }
        storage.Delete(previous);
        return Results.Ok(await BrandingAsync(db, ct));
    }

    private static async Task<IResult> ContentAsync(Guid id, HttpContext context, AppDbContext db, PublicImageStorage storage, CancellationToken ct)
    {
        if (!File.Exists(storage.FilePath(id))) return Results.NotFound();
        var contentType = await db.Users.Where(u => u.AvatarId == id).Select(u => u.AvatarContentType).FirstOrDefaultAsync(ct)
            ?? await db.SystemSettings.Where(s => s.LogoId == id).Select(s => s.LogoContentType).FirstOrDefaultAsync(ct);
        if (contentType is null) return Results.NotFound();
        FileStream stream;
        try { stream = new FileStream(storage.FilePath(id), FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete); }
        catch (FileNotFoundException) { return Results.NotFound(); }
        catch (DirectoryNotFoundException) { return Results.NotFound(); }
        context.Response.Headers.CacheControl = "no-cache";
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.ContentSecurityPolicy = "sandbox; default-src 'none'";
        return Results.File(stream, contentType);
    }
}
