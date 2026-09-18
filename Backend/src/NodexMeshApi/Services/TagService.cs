using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public sealed class TagService(AppDbContext db, IProjectAccessService access)
{
    public async Task<TagRecordDto> GetOrCreateAsync(Guid projectId, Guid userId, string? name, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
        var displayName = name?.Trim() ?? "";
        var normalizedName = displayName.Normalize(NormalizationForm.FormKC).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedName) || displayName.Length > 64 || normalizedName.Length > 64)
            throw new ApiException(422, "invalid_tag", "Tag names must contain 1 to 64 characters.");

        var existing = await db.Tags.AsNoTracking()
            .SingleOrDefaultAsync(t => t.ProjectId == projectId && t.NormalizedName == normalizedName, ct);
        if (existing is not null) return ToDto(existing);

        var tag = new Tag { Id = Guid.CreateVersion7(), ProjectId = projectId, Name = displayName, NormalizedName = normalizedName };
        db.Tags.Add(tag);
        try
        {
            await db.SaveChangesAsync(ct);
            return ToDto(tag);
        }
        catch (DbUpdateException error) when (error.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Another editor (or a retried request) created this normalized name first.
            db.Entry(tag).State = EntityState.Detached;
            existing = await db.Tags.AsNoTracking()
                .SingleOrDefaultAsync(t => t.ProjectId == projectId && t.NormalizedName == normalizedName, ct);
            if (existing is null) throw;
            return ToDto(existing);
        }
    }

    private static TagRecordDto ToDto(Tag tag) => new(tag.Id, tag.ProjectId, tag.Name, tag.NormalizedName);
}
