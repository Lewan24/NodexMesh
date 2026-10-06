using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIpProtection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ip_access_states",
                columns: table => new
                {
                    ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    window_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_seen = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    failed_logins = table.Column<int>(type: "integer", nullable: false),
                    unauthorized = table.Column<int>(type: "integer", nullable: false),
                    not_found = table.Column<int>(type: "integer", nullable: false),
                    rate_limited = table.Column<int>(type: "integer", nullable: false),
                    banned_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reason = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    released_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    released_by = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ip_access_states", x => x.ip);
                });

            migrationBuilder.CreateIndex(
                name: "ix_ip_access_states_banned_until",
                table: "ip_access_states",
                column: "banned_until");

            migrationBuilder.CreateIndex(
                name: "ix_ip_access_states_last_seen",
                table: "ip_access_states",
                column: "last_seen");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ip_access_states");
        }
    }
}
