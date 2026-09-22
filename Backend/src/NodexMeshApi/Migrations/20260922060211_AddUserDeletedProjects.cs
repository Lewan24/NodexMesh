using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserDeletedProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "user_deleted_at",
                table: "projects",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_projects_user_deleted_at",
                table: "projects",
                column: "user_deleted_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_projects_user_deleted_at",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "user_deleted_at",
                table: "projects");
        }
    }
}
