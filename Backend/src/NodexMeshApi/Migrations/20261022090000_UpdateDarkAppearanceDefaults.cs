using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NodexMeshApi.Data;

#nullable disable

namespace NodexMeshApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261022090000_UpdateDarkAppearanceDefaults")]
public sealed class UpdateDarkAppearanceDefaults : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Update previous defaults for existing users and project overrides, preserving custom palettes/gradients.
        foreach (var table in new[] { "appearance_profiles", "project_appearance_overrides" })
        {
            foreach (var (key, previous, next) in new[]
            {
                ("canvas", "#0b0b0c", "#1F1F22"),
                ("default", "#18181b", "#25252A")
            })
            {
                migrationBuilder.Sql($"""
                    UPDATE {table}
                    SET dark_theme = jsonb_set(dark_theme, ARRAY['{key}'], '"{next}"'::jsonb)
                    WHERE lower(dark_theme->>'{key}') = '{previous}'
                      AND (dark_theme->'gradients'->'{key}' IS NULL OR dark_theme->'gradients'->'{key}' = 'null'::jsonb);
                    """);
            }
        }
        migrationBuilder.Sql("UPDATE appearance_profiles SET palette_version = 3 WHERE palette_version = 2;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // User appearance data cannot be distinguished from later intentional edits; do not overwrite it on rollback.
    }
}
