namespace NodexMeshApi.Models;

public sealed class LibraryAsset
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    // Retrievable public capability, returned only to the project owner.
    public string? ShareToken { get; set; }
    public string? ShareTokenHash { get; set; }
}
