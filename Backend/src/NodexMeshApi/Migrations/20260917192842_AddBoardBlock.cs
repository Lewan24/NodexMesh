using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NodexMeshApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardBlock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_board_items_type",
                table: "board_items");

            migrationBuilder.AddCheckConstraint(
                name: "ck_board_items_type",
                table: "board_items",
                sql: "type IN ('board','section-title','note','text','document','code','icon','image','link','embed','checklist','kanban','timeline','column','frame','dispenser','line','drawing','mindmap','diagram','database')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_board_items_type",
                table: "board_items");

            migrationBuilder.AddCheckConstraint(
                name: "ck_board_items_type",
                table: "board_items",
                sql: "type IN ('section-title','note','text','document','code','icon','image','link','embed','checklist','kanban','timeline','column','frame','dispenser','line','drawing','mindmap','diagram','database')");
        }
    }
}
