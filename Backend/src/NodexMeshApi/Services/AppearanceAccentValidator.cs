using System.Text.Json;
using System.Text.RegularExpressions;
using NodexMeshApi.Common;

namespace NodexMeshApi.Services;

public static class AppearanceAccentValidator
{
    public static JsonElement ResolveSharedPalette(string json, NodexMeshApi.Models.AppearanceProfile profile)
    {
        var palette = System.Text.Json.Nodes.JsonNode.Parse(json) as System.Text.Json.Nodes.JsonObject ?? new();
        var ui = System.Text.Json.Nodes.JsonNode.Parse(profile.UiGradients) as System.Text.Json.Nodes.JsonObject;
        foreach (var role in new[] { "primary", "secondary" })
        {
            if (palette["overrides"] is not System.Text.Json.Nodes.JsonObject flags || flags[role] is not System.Text.Json.Nodes.JsonValue flag || !flag.TryGetValue<bool>(out var enabled) || enabled) continue;
            palette[role] = role == "primary" ? profile.UiPrimary : profile.UiSecondary;
            if (palette["gradients"] is not System.Text.Json.Nodes.JsonObject gradients) { gradients = new(); palette["gradients"] = gradients; }
            if (ui?[role] is { } gradient) gradients[role] = gradient.DeepClone();
            else gradients.Remove(role);
        }
        return JsonSerializer.SerializeToElement(palette);
    }
    private static bool Color(string? value) => value is not null && Regex.IsMatch(value, "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$");
    private static bool Gradient(JsonElement value, bool references)
    {
        if (value.ValueKind != JsonValueKind.Object || value.EnumerateObject().Count() != 4) return false;
        bool Stop(string key) => value.TryGetProperty(key, out var stop) && stop.ValueKind == JsonValueKind.String &&
            (Color(stop.GetString()) || references && stop.GetString() is "default" or "accent1" or "accent2" or "accent3" or "accent4" or "accent5");
        return Stop("from") && Stop("to") && value.TryGetProperty("kind", out var kind) && kind.ValueKind == JsonValueKind.String &&
            kind.GetString() is "linear" or "radial" && value.TryGetProperty("angle", out var angle) &&
            angle.ValueKind == JsonValueKind.Number && angle.TryGetDouble(out var number) && double.IsFinite(number) && number is >= 0 and <= 360;
    }

    public static void ValidateColor(string color)
    {
        if (color is null || color.Length != 7 || !Color(color)) throw new ApiException(422, "invalid_appearance", "Use a six-digit hexadecimal color.");
    }

    public static void ValidateUi(JsonElement? value)
    {
        if (value is null) return;
        if (value.Value.ValueKind != JsonValueKind.Object || value.Value.GetRawText().Length > 2000 ||
            value.Value.EnumerateObject().Any(field => field.Name is not ("primary" or "secondary") || !Gradient(field.Value, false)))
            throw new ApiException(422, "invalid_appearance", "Invalid UI color gradient.");
    }

    public static void ValidateBackground(JsonElement? value)
    {
        if (value is null) return;
        var background = value.Value;
        if (background.ValueKind != JsonValueKind.Object || background.GetRawText().Length > 2000)
            throw new ApiException(422, "invalid_appearance", "Invalid UI background.");
        if (!background.EnumerateObject().Any()) return; // Keep automatic blending available.
        if (!background.TryGetProperty("color", out var color) || color.ValueKind != JsonValueKind.String || !Color(color.GetString()) ||
            background.EnumerateObject().Any(field => field.Name is not ("color" or "gradient")) ||
            background.TryGetProperty("gradient", out var gradient) && !Gradient(gradient, false))
            throw new ApiException(422, "invalid_appearance", "Invalid UI background.");
    }

    public static void ValidatePalette(JsonElement? value)
    {
        if (value is null) return;
        var palette = value.Value;
        if (palette.ValueKind != JsonValueKind.Object || palette.GetRawText().Length > 32000)
            throw new ApiException(422, "invalid_appearance", "Invalid palette.");
        foreach (var key in new[] { "primary", "secondary", "canvas", "default", "accent1", "accent2", "accent3", "accent4", "accent5" })
            if (palette.TryGetProperty(key, out var color) && (color.ValueKind != JsonValueKind.String || !Color(color.GetString())))
                throw new ApiException(422, "invalid_appearance", "Invalid palette color.");
        if (palette.TryGetProperty("overrides", out var overrides) &&
            (overrides.ValueKind != JsonValueKind.Object || overrides.EnumerateObject().Any(field =>
                field.Name is not ("primary" or "secondary") || field.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))))
            throw new ApiException(422, "invalid_appearance", "Invalid palette overrides.");
        if (palette.TryGetProperty("gradients", out var gradients))
        {
            if (gradients.ValueKind != JsonValueKind.Object || gradients.EnumerateObject().Any(field => !Gradient(field.Value, true)))
                throw new ApiException(422, "invalid_appearance", "Invalid palette gradient.");
        }
    }
}
