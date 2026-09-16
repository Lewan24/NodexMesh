using System.Text.Json;
using Microsoft.Extensions.Validation;

namespace NodexMeshApi.Dtos;

// Palettes are JSON payloads, not CLR object graphs for automatic validation.
// Positional records need the annotation on both constructor parameter and property.
#pragma warning disable ASP0029 // SkipValidation is experimental in .NET 10.

public sealed record AppearanceUpdateDto(
    string Font, string UiFont, string UiPrimary, string UiSecondary,
    int InheritanceVersion, int PaletteVersion,
    [SkipValidation] [property: SkipValidation] JsonElement Light,
    [SkipValidation] [property: SkipValidation] JsonElement Dark);

public sealed record ProjectAppearanceUpdateDto(
    string? Font,
    [SkipValidation] [property: SkipValidation] JsonElement? Light,
    [SkipValidation] [property: SkipValidation] JsonElement? Dark);

#pragma warning restore ASP0029
