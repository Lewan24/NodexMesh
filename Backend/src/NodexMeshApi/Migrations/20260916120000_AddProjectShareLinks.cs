using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectShareLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_share_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revoked_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_accessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    access_count = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_share_links", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_share_links_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_project_share_links_project_id",
                table: "project_share_links",
                column: "project_id");

            // Unique, and the lookup key for every anonymous share request.
            migrationBuilder.CreateIndex(
                name: "ix_project_share_links_token_hash",
                table: "project_share_links",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_share_links");
        }
    }
}
