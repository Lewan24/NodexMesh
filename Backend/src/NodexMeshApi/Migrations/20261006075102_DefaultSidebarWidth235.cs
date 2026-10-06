using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class DefaultSidebarWidth235 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "sidebar_width",
                table: "appearance_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 235,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.Sql("UPDATE appearance_profiles SET sidebar_width = 235 WHERE sidebar_width = 184;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "sidebar_width",
                table: "appearance_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 184,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 235);
        }
    }
}
