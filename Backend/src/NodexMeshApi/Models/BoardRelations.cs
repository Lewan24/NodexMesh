namespace NodexMeshApi.Models;

public enum ItemLinkKind { LineStart, LineEnd, CreatedFrom }

/// <summary>
/// Line/arrow attachment ('line_start'/'line_end') or dispenser provenance
/// ('created_from'). boardValidation.ts enforces at most one link per
/// (sourceItemId, kind) — see the unique index in AppDbContext.
/// </summary>
public sealed class ItemLink
{
    public Guid Id { get; set; }
    public Guid SourceItemId { get; set; }
    public Guid TargetItemId { get; set; }
    public ItemLinkKind Kind { get; set; }
}

public sealed class Tag
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;

    public List<ItemTag> ItemTags { get; set; } = [];
}

public sealed class ItemTag
{
    public Guid ItemId { get; set; }
    public Guid TagId { get; set; }
}
