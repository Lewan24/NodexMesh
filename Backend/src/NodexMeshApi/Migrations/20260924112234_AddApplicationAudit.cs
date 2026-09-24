using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    category = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    outcome = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resource_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    resource_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    client_ip = table.Column<IPAddress>(type: "inet", nullable: true),
                    user_agent = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    method = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    route = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    status_code = table.Column<int>(type: "integer", nullable: true),
                    trace_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    request_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    account_key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_events", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "security_incidents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    rule = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    subject = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    window_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_security_incidents", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_account_key_occurred_at",
                table: "audit_events",
                columns: new[] { "account_key", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_actor_id_occurred_at",
                table: "audit_events",
                columns: new[] { "actor_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_category_occurred_at",
                table: "audit_events",
                columns: new[] { "category", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_client_ip_occurred_at",
                table: "audit_events",
                columns: new[] { "client_ip", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_event_type_occurred_at",
                table: "audit_events",
                columns: new[] { "event_type", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_occurred_at",
                table: "audit_events",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_project_id_occurred_at",
                table: "audit_events",
                columns: new[] { "project_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_request_id",
                table: "audit_events",
                column: "request_id");

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_severity_occurred_at",
                table: "audit_events",
                columns: new[] { "severity", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_events_target_user_id_occurred_at",
                table: "audit_events",
                columns: new[] { "target_user_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_security_incidents_rule_subject_window_start",
                table: "security_incidents",
                columns: new[] { "rule", "subject", "window_start" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_security_incidents_status_window_start",
                table: "security_incidents",
                columns: new[] { "status", "window_start" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_events");

            migrationBuilder.DropTable(
                name: "security_incidents");
        }
    }
}
