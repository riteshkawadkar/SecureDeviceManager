using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEnrollmentTypeManagementModeAndAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF NOT EXISTS because these columns may already exist if a previous
            // migration attempt partially applied before failing.
            migrationBuilder.Sql(@"ALTER TABLE ""EnrollmentTokens"" ADD COLUMN IF NOT EXISTS ""EnrollmentType"" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql(@"ALTER TABLE ""Devices"" ADD COLUMN IF NOT EXISTS ""EnrollmentType"" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql(@"ALTER TABLE ""Devices"" ADD COLUMN IF NOT EXISTS ""ManagementMode"" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql(@"ALTER TABLE ""DeviceGroups"" ADD COLUMN IF NOT EXISTS ""Category"" text NULL;");

            migrationBuilder.CreateTable(
                name: "DeviceAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedTo = table.Column<string>(type: "text", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AssignedBy = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceAssignments_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAssignments_DeviceId",
                table: "DeviceAssignments",
                column: "DeviceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceAssignments");

            migrationBuilder.DropColumn(
                name: "EnrollmentType",
                table: "EnrollmentTokens");

            migrationBuilder.DropColumn(
                name: "EnrollmentType",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ManagementMode",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "DeviceGroups");
        }
    }
}
