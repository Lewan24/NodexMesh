using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Features;

namespace NodexMeshApi.Services;

public sealed class PublicImageOptions
{
    public string Path { get; set; } = "App_Data/media";
}

/// <summary>Opaque filenames, outside the web root. Only current DB references are served.</summary>
public sealed class PublicImageStorage(IOptions<PublicImageOptions> options, IWebHostEnvironment environment,
    ILogger<PublicImageStorage> logger)
{
    public const long MaxBytes = 10 * 1024 * 1024;
    public string Root => Path.GetFullPath(options.Value.Path, environment.ContentRootPath);
    public string FilePath(Guid id) => Path.Combine(Root, id.ToString("N"));

    public async Task<(Guid Id, string ContentType)> WriteAsync(HttpRequest request, bool logo, CancellationToken ct)
    {
        // Kestrel defaults to 5 MB for JSON requests. Image uploads have their own
        // bounded 10 MiB limit, just like the library sets its separate file limit.
        var bodyLimit = request.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (bodyLimit is { IsReadOnly: false }) bodyLimit.MaxRequestBodySize = MaxBytes;
        if (request.ContentLength is > MaxBytes) throw new ApiException(413, "image_too_large", "Image must be smaller than 10 MB.");
        using var input = new MemoryStream();
        var buffer = new byte[81920];
        int read;
        while ((read = await request.Body.ReadAsync(buffer, ct)) > 0)
        {
            if (input.Length + read > MaxBytes) throw new ApiException(413, "image_too_large", "Image must be smaller than 10 MB.");
            input.Write(buffer, 0, read);
        }
        var extension = Path.GetExtension(request.Query["name"].ToString()).ToLowerInvariant();
        if (!(new[] { ".png", ".jpg", ".jpeg", ".gif", ".webp" }.Contains(extension) || logo && extension == ".svg"))
            throw new ApiException(422, "invalid_image", "Use PNG, JPEG, GIF or WebP. Logos also support static SVG.");
        var contentType = LibraryStorage.Validate(input.GetBuffer().AsSpan(0, (int)Math.Min(input.Length, 32)).ToArray(), extension, input);
        var id = Guid.NewGuid();
        try
        {
            Directory.CreateDirectory(Root);
            await using var output = new FileStream(FilePath(id), FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
            input.Position = 0;
            await input.CopyToAsync(output, ct);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            Delete(id);
            logger.LogError("Public image storage is unavailable; classification={ExceptionType}. Verify Media:Path, volume permissions and available disk space.", error.GetType().Name);
            throw new ApiException(503, "image_storage_unavailable", "Image storage is unavailable. Contact the administrator.");
        }
        catch { Delete(id); throw; }
        return (id, contentType);
    }

    public void Delete(Guid? id)
    {
        if (id is null) return;
        try { File.Delete(FilePath(id.Value)); }
        catch (IOException error) { logger.LogWarning(error, "Image cleanup deferred for {ImageId}", id); }
        catch (UnauthorizedAccessException error) { logger.LogWarning(error, "Image cleanup deferred for {ImageId}", id); }
    }

    public async Task CleanUnreferencedAsync(AppDbContext db, CancellationToken ct)
    {
        if (!Directory.Exists(Root)) return;
        var referenced = (await db.Users.Where(u => u.AvatarId != null).Select(u => u.AvatarId!.Value).ToListAsync(ct)).ToHashSet();
        var logo = await db.SystemSettings.Select(s => s.LogoId).FirstOrDefaultAsync(ct);
        if (logo is { } logoId) referenced.Add(logoId);
        foreach (var path in Directory.EnumerateFiles(Root))
        {
            ct.ThrowIfCancellationRequested();
            if (Guid.TryParseExact(Path.GetFileName(path), "N", out var id) && !referenced.Contains(id) &&
                File.GetLastWriteTimeUtc(path) < DateTime.UtcNow.AddDays(-1)) Delete(id);
        }
    }
}
