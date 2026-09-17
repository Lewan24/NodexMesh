using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class PersistAppearanceMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "mode",
                table: "project_appearance_overrides",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mode",
                table: "appearance_profiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "mode",
                table: "project_appearance_overrides");

            migrationBuilder.DropColumn(
                name: "mode",
                table: "appearance_profiles");
        }
    }
}
