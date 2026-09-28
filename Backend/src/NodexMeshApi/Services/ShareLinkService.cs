using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public interface IShareLinkService
{
    Task<CreatedShareLinkDto> CreateAsync(Guid projectId, Guid userId, CreateShareLinkRequest request, CancellationToken ct = default);
    Task<List<ShareLinkDto>> ListAsync(Guid projectId, Guid userId, CancellationToken ct = default);
    Task RevokeAsync(Guid projectId, Guid linkId, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Resolves a raw token to its project. Returns 404 for every failure mode
    /// (unknown, revoked, expired, project trashed) so the endpoint can't be used
    /// to probe which tokens exist or ever existed.
    /// </summary>
    Task<Guid> ResolveProjectIdAsync(string token, CancellationToken ct = default);
}

public sealed class ShareLinkService(
    AppDbContext db,
    IProjectAccessService access,
    TimeProvider clock,
    IDataProtectionProvider? dataProtection = null)
    : IShareLinkService
{
    private readonly IDataProtector tokenProtector =
        (dataProtection ?? new EphemeralDataProtectionProvider())
        .CreateProtector("NodexMesh.ProjectShareLinkToken.v1");

    /// <summary>Max links per project — an unbounded list is both a UX mess and a DoS vector.</summary>
    private const int MaxActiveLinksPerProject = 20;

    /// <summary>
    /// Minimum gap between access-counter writes for a single link. AccessCount is
    /// therefore "distinct minutes in which the link was used", not a request count.
    /// </summary>
    private static readonly TimeSpan AccessStampInterval = TimeSpan.FromMinutes(1);

    public async Task<CreatedShareLinkDto> CreateAsync(
        Guid projectId, Guid userId, CreateShareLinkRequest request, CancellationToken ct = default)
    {
        // Owner only. Letting an Editor mint public links would mean sharing a board with a
        // collaborator implicitly grants them the power to publish it to the world.
        await access.RequireAsync(projectId, userId, ProjectRole.Owner, ct);

        var now = clock.GetUtcNow();

        var activeShareLinks = db.ProjectShareLinks.Where(l => l.ProjectId == projectId &&
                                                          l.RevokedAt == null).ToList();
        var activeCount = activeShareLinks.Count(l => l.ExpiresAt == null || l.ExpiresAt > now);
        
        if (activeCount >= MaxActiveLinksPerProject)
            throw new ApiException(422, "share_link_limit",
                $"A project may have at most {MaxActiveLinksPerProject} active share links.");

        if (request.ExpiresAt is { } expiry && expiry <= now)
            throw new ApiException(422, "invalid_expiry", "Expiry must be in the future.");

        var (token, hash) = GenerateToken();

        var link = new ProjectShareLink
        {
            Id = Guid.CreateVersion7(),
            ProjectId = projectId,
            TokenHash = hash,
            TokenProtected = tokenProtector.Protect(token),
            Label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label.Trim(),
            CreatedAt = now,
            CreatedBy = userId,
            ExpiresAt = request.ExpiresAt
        };

        db.ProjectShareLinks.Add(link);
        await db.SaveChangesAsync(ct);

        return new CreatedShareLinkDto(ToDto(link, now), token);
    }

    public async Task<List<ShareLinkDto>> ListAsync(Guid projectId, Guid userId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectRole.Owner, ct);
        var now = clock.GetUtcNow();

        var links = await db.ProjectShareLinks.AsNoTracking()
            .Where(l => l.ProjectId == projectId && l.RevokedAt == null)
            .ToListAsync(ct);
        
        return links.OrderByDescending(l => l.CreatedAt).Select(l => ToDto(l, now)).ToList();
    }

    public async Task RevokeAsync(Guid projectId, Guid linkId, Guid userId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectRole.Owner, ct);

        // Scoped by projectId as well as linkId: without it, any owner could revoke any
        // other project's link by guessing an id (IDOR).
        var link = await db.ProjectShareLinks
            .FirstOrDefaultAsync(l => l.Id == linkId && l.ProjectId == projectId, ct)
            ?? throw new ApiException(404, "not_found", "Share link not found.");

        if (link.RevokedAt is not null) return; // idempotent

        link.RevokedAt = clock.GetUtcNow();
        link.RevokedBy = userId;
        await db.SaveChangesAsync(ct);
    }

    public async Task<Guid> ResolveProjectIdAsync(string token, CancellationToken ct = default)
    {
        // Cheap shape check before hitting the database — keeps junk tokens from costing a query.
        if (string.IsNullOrWhiteSpace(token) || token.Length is < 32 or > 128)
            throw new ApiException(404, "not_found", "Share link not found.");

        var hash = HashToken(token);
        var now = clock.GetUtcNow();

        var link = await db.ProjectShareLinks.FirstOrDefaultAsync(l => l.TokenHash == hash, ct);

        // Identical 404 for unknown / revoked / expired: distinguishing them would confirm
        // that a given token was once valid.
        if (link is null || !link.IsActive(now))
            throw new ApiException(404, "not_found", "Share link not found.");

        // The project's global query filter excludes trashed projects, so trashing a project
        // silently kills its public links too — which is the behaviour you want.
        var projectExists = await db.Projects.AnyAsync(p => p.Id == link.ProjectId, ct);
        if (!projectExists)
            throw new ApiException(404, "not_found", "Share link not found.");

        // Usage counter, throttled to at most one write per minute per link.
        //
        // Updating on every request would let anyone holding a public URL force a database
        // write per GET — a cheap amplification vector on an endpoint with no account
        // behind it, and a row-level write contention point if a board goes viral. The
        // counter is only ever a rough "is this link being used?" signal for the owner, so
        // approximate counting is the right trade.
        if (link.LastAccessedAt is null || now - link.LastAccessedAt >= AccessStampInterval)
        {
            link.LastAccessedAt = now;
            link.AccessCount += 1;
            await db.SaveChangesAsync(ct);
        }

        return link.ProjectId;
    }

    /// <summary>
    /// 256 bits of CSPRNG output, base64url-encoded so it is URL-safe without escaping.
    /// This token is a bearer credential in a URL — entropy is the only thing standing
    /// between a stranger and the board, so it must not be shortened for prettier links.
    /// </summary>
    private static (string Token, string Hash) GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var token = Base64UrlEncode(bytes);
        return (token, HashToken(token));
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private ShareLinkDto ToDto(ProjectShareLink l, DateTimeOffset now) => new(
        l.Id, l.ProjectId, l.Label, l.CreatedAt, l.ExpiresAt,
        l.LastAccessedAt, l.AccessCount, l.IsActive(now), UnprotectToken(l.TokenProtected));

    private string? UnprotectToken(string? protectedToken)
    {
        if (protectedToken is null) return null;

        try
        {
            return tokenProtector.Unprotect(protectedToken);
        }
        catch (CryptographicException)
        {
            // A missing/rotated key should not prevent the owner from managing or revoking
            // the link. Treat it like a legacy link whose raw token cannot be recovered.
            return null;
        }
    }
}
