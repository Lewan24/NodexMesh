using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class SidebarWidthAndMfa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "mfa_last_accepted_step",
                table: "AspNetUsers",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mfa_preferred_method",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "email");

            migrationBuilder.AddColumn<string>(
                name: "mfa_secret_protected",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "sidebar_width",
                table: "appearance_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 184);

            migrationBuilder.CreateTable(
                name: "mfa_challenges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "text", nullable: false),
                    security_stamp = table.Column<string>(type: "text", nullable: false),
                    purpose = table.Column<string>(type: "text", nullable: false),
                    method = table.Column<string>(type: "text", nullable: false),
                    email_code_hash = table.Column<string>(type: "text", nullable: true),
                    setup_secret_protected = table.Column<string>(type: "text", nullable: true),
                    target_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    target_method = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    consumed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mfa_challenges", x => x.id);
                    table.ForeignKey(
                        name: "fk_mfa_challenges_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mfa_recovery_codes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code_hash = table.Column<string>(type: "text", nullable: false),
                    consumed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mfa_recovery_codes", x => x.id);
                    table.ForeignKey(
                        name: "fk_mfa_recovery_codes_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_mfa_challenges_expires_at",
                table: "mfa_challenges",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_mfa_challenges_token_hash",
                table: "mfa_challenges",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_mfa_challenges_user_id",
                table: "mfa_challenges",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_mfa_recovery_codes_user_id_code_hash",
                table: "mfa_recovery_codes",
                columns: new[] { "user_id", "code_hash" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mfa_challenges");

            migrationBuilder.DropTable(
                name: "mfa_recovery_codes");

            migrationBuilder.DropColumn(
                name: "mfa_last_accepted_step",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "mfa_preferred_method",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "mfa_secret_protected",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "sidebar_width",
                table: "appearance_profiles");
        }
    }
}
