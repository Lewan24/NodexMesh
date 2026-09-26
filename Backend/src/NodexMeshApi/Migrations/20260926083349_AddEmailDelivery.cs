using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "email_admin_alerts_enabled",
                table: "system_settings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "email_enabled",
                table: "system_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "email_from_address",
                table: "system_settings",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "email_from_name",
                table: "system_settings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "NodexMesh");

            migrationBuilder.AddColumn<string>(
                name: "email_host",
                table: "system_settings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "email_password_protected",
                table: "system_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "email_port",
                table: "system_settings",
                type: "integer",
                nullable: false,
                defaultValue: 587);

            migrationBuilder.AddColumn<string>(
                name: "email_public_base_url",
                table: "system_settings",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "email_use_ssl",
                table: "system_settings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "email_user_notifications_enabled",
                table: "system_settings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "email_username",
                table: "system_settings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "email_outbox",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    protected_payload = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    available_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    lease_id = table.Column<Guid>(type: "uuid", nullable: true),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dead_lettered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_error = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_email_outbox", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_email_outbox_lease_id",
                table: "email_outbox",
                column: "lease_id");

            migrationBuilder.CreateIndex(
                name: "ix_email_outbox_sent_at_dead_lettered_at_available_at",
                table: "email_outbox",
                columns: new[] { "sent_at", "dead_lettered_at", "available_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_outbox");

            migrationBuilder.DropColumn(
                name: "email_admin_alerts_enabled",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_enabled",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_from_address",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_from_name",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_host",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_password_protected",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_port",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_public_base_url",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_use_ssl",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_user_notifications_enabled",
                table: "system_settings");

            migrationBuilder.DropColumn(
                name: "email_username",
                table: "system_settings");
        }
    }
}
