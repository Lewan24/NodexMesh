using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Validation;

namespace NodexMeshApi.Dtos;

/// <summary>
/// records.ts declares Revision as a decimal *string*: "Decimal strings map to .NET
/// Int64 without losing precision in JavaScript." A bare JSON number would silently
/// lose precision past 2^53 on the client, so every revision crosses the wire as a
/// string and is converted here.
/// </summary>
public sealed class RevisionJsonConverter : JsonConverter<long>
{
    public override long Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => long.Parse(reader.GetString()!),
            JsonTokenType.Number => reader.GetInt64(),
            _ => throw new JsonException("Expected a revision string.")
        };

    public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}

public sealed class NullableRevisionJsonConverter : JsonConverter<long?>
{
    public override long? Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options) =>
        reader.TokenType == JsonTokenType.Null ? null : long.Parse(reader.GetString()!);

    public override void Write(Utf8JsonWriter writer, long? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteStringValue(value.Value.ToString());
    }
}

// ---------------- writes ----------------

// JsonElement is validated by BoardValidator, not by traversing its CLR indexer.
// Positional records need the annotation on both constructor parameter and property.
#pragma warning disable ASP0029 // SkipValidation is experimental in .NET 10.
public sealed record ItemWriteDto(
    Guid Id,
    Guid BoardId,
    Guid? ParentItemId,
    Guid? FrameId,
    long SortOrder,
    double X,
    double Y,
    double? Width,
    double? Height,
    int ZIndex,
    bool Locked,
    [property: Required] string Type,
    short SchemaVersion,
    [SkipValidation] [property: SkipValidation] JsonElement Appearance,
    [SkipValidation] [property: SkipValidation] JsonElement Data);
#pragma warning restore ASP0029

public sealed record ItemLinkDto(Guid SourceItemId, Guid TargetItemId, string Kind);

public sealed record CommentUpsertDto(Guid Id, [property: MaxLength(10_000)] string Text, string Status);

public sealed record ItemMutationDto(
    [property: Required] ItemWriteDto Item,
    [property: JsonConverter(typeof(NullableRevisionJsonConverter))] long? ExpectedRevision,
    IReadOnlyList<ItemLinkDto> Links,
    IReadOnlyList<CommentUpsertDto> Comments,
    IReadOnlyList<string> Tags);

public sealed record ItemDeleteDto(
    Guid Id,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long ExpectedRevision);

public sealed record BoardMutationDto(
    Guid ClientMutationId,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long ExpectedBoardRevision,
    IReadOnlyList<ItemMutationDto> Upserts,
    IReadOnlyList<ItemDeleteDto> Deletes) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (ClientMutationId == Guid.Empty)
            yield return new ValidationResult("clientMutationId is required.", [nameof(ClientMutationId)]);

        var total = (Upserts?.Count ?? 0) + (Deletes?.Count ?? 0);
        if (total == 0)
            yield return new ValidationResult("A mutation must contain at least one change.");

        // Bounded batch size — an unbounded list is a cheap DoS vector (OWASP API4).
        if (total > Services.BoardValidator.MaxUpsertsPerBatch)
            yield return new ValidationResult(
                $"A mutation may contain at most {Services.BoardValidator.MaxUpsertsPerBatch} changes.");

        var ids = (Upserts ?? []).Select(u => u.Item.Id)
            .Concat((Deletes ?? []).Select(d => d.Id)).ToList();
        if (ids.Count != ids.Distinct().Count())
            yield return new ValidationResult("Duplicate item ID in mutation.");
    }
}

// ---------------- reads ----------------

public sealed record ItemRecordDto(
    Guid Id, Guid BoardId, Guid? ParentItemId, Guid? FrameId, long SortOrder,
    double X, double Y, double? Width, double? Height, int ZIndex, bool Locked,
    string Type, short SchemaVersion, JsonElement Appearance, JsonElement Data,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long Revision,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    Guid? CreatedBy, Guid? UpdatedBy, DateTimeOffset? DeletedAt);

public sealed record BoardRecordDto(
    Guid Id, Guid ProjectId, string Name, int SortOrder,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long Revision,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    Guid? CreatedBy, Guid? UpdatedBy, DateTimeOffset? DeletedAt);

public sealed record CommentRecordDto(
    Guid Id, Guid ItemId, string Text, string Status,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long Revision,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    Guid? CreatedBy, Guid? UpdatedBy, DateTimeOffset? DeletedAt);

public sealed record TagRecordDto(Guid Id, Guid ProjectId, string Name, string NormalizedName);

public sealed record ItemTagDto(Guid ItemId, Guid TagId);

/// <summary>Mirrors BoardSnapshot in records.ts.</summary>
public sealed record BoardSnapshotDto(
    BoardRecordDto Board,
    IReadOnlyList<ItemRecordDto> Items,
    IReadOnlyList<ItemLinkDto> Links,
    IReadOnlyList<CommentRecordDto> Comments,
    IReadOnlyList<TagRecordDto> Tags,
    IReadOnlyList<ItemTagDto> ItemTags);

/// <summary>Returned with 409 so the client can reconcile against current server state.</summary>
public sealed record ConflictDto(
    Guid Id,
    [property: JsonConverter(typeof(NullableRevisionJsonConverter))] long? CurrentRevision,
    string Reason); // 'revision_mismatch' | 'not_found'

public sealed record BoardMutationResultDto(
    [property: JsonConverter(typeof(RevisionJsonConverter))] long BoardRevision,
    IReadOnlyList<ItemRecordDto> Items,
    IReadOnlyList<ConflictDto> Conflicts);
