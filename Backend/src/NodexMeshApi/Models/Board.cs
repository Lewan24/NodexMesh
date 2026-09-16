namespace NodexMeshApi.Models;

public sealed class Board
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = "Board";
    public int SortOrder { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public List<BoardItem> Items { get; set; } = [];
}

/// <summary>
/// One row per canvas item. Type is the discriminator for what CLR shape `Data`
/// deserializes to — see BoardItemData.cs. Appearance/Data are stored as jsonb text;
/// EF just moves the string, the service layer (de)serializes with strict options.
/// </summary>
public sealed class BoardItem
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public Guid? ParentItemId { get; set; } // only valid when Type.CanNest() and parent is a Column
    public Guid? FrameId { get; set; }      // must reference an item of type Frame
    public string Type { get; set; } = string.Empty; // one of BoardItemTypes.All
    public short SchemaVersion { get; set; } = 1;
    public long SortOrder { get; set; }
    public double PosX { get; set; }
    public double PosY { get; set; }
    public double? Width { get; set; }
    public double? Height { get; set; }
    public int ZIndex { get; set; }
    public bool Locked { get; set; }
    public string Appearance { get; set; } = "{}";
    public string Data { get; set; } = "{}";
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public List<ItemTag> ItemTags { get; set; } = [];
    public List<Comment> Comments { get; set; } = [];
}
