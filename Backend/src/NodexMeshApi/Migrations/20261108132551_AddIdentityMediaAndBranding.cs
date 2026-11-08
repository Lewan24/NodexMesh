using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentityMediaAndBranding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "application_name",
                table: "system_settings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "NodexMesh");

            migrationBuilder.AddColumn<string>(
                name: "logo_content_type",
                table: "system_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "logo_id",
                table: "system_settings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "avatar_content_type",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "avatar_id",
                table: "AspNetUsers",
                type: "uuid",
                nullable: true);
            migrationBuilder.CreateIndex(
                name: "ix_users_avatar_id",
                table: "AspNetUsers",
                column: "avatar_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_users_avatar_id", table: "AspNetUsers");
            migrationBuilder.DropColumn(
                name: "application_name",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "logo_content_type",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "logo_id",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "avatar_content_type",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "avatar_id",
                table: "AspNetUsers");
        }
    }
}
