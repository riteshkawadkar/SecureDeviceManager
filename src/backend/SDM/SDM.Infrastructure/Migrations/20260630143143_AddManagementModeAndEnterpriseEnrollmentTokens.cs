using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManagementModeAndEnterpriseEnrollmentTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoogleDeviceName",
                table: "Devices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ManagementMode",
                table: "Devices",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "EnterpriseEnrollmentTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GoogleTokenName = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    QrCodeJson = table.Column<string>(type: "text", nullable: false),
                    ManagementMode = table.Column<int>(type: "integer", nullable: false),
                    PolicyName = table.Column<string>(type: "text", nullable: false),
                    ExpirationTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EnterpriseEnrollmentTokens", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EnterpriseEnrollmentTokens");

            migrationBuilder.DropColumn(
                name: "GoogleDeviceName",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ManagementMode",
                table: "Devices");
        }
    }
}
