using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class RetrieveProjectShareLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "token_protected",
                table: "project_share_links",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "token_protected",
                table: "project_share_links");
        }
    }
}
