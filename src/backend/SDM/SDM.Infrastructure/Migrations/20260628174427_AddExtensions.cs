using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExtensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Policies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsEnabled",
                table: "Policies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Severity",
                table: "Policies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AssignedUserName",
                table: "Devices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ComplianceStatus",
                table: "Devices",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AllowedDomains",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Domain = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllowedDomains", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Apps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    PackageId = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Installs = table.Column<int>(type: "integer", nullable: false),
                    AppStatus = table.Column<int>(type: "integer", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: true),
                    BlockReason = table.Column<string>(type: "text", nullable: true),
                    RequestedBy = table.Column<string>(type: "text", nullable: true),
                    RequestedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Apps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BlockedDomains",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Domain = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    BlockedToday = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlockedDomains", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeviceViolations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceViolations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceViolations_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VpnProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Server = table.Column<string>(type: "text", nullable: false),
                    Protocol = table.Column<string>(type: "text", nullable: false),
                    DeviceCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VpnProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WifiProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Ssid = table.Column<string>(type: "text", nullable: false),
                    Security = table.Column<string>(type: "text", nullable: false),
                    Band = table.Column<string>(type: "text", nullable: false),
                    DeviceCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WifiProfiles", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Policies",
                columns: new[] { "Id", "Category", "CreatedOn", "IsEnabled", "Name", "PolicyJson", "Severity" },
                values: new object[,]
                {
                    { new Guid("a1000000-0000-0000-0000-000000000001"), "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "USB Blocking", "{\"type\":\"usb_blocking\"}", "high" },
                    { new Guid("a1000000-0000-0000-0000-000000000002"), "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "App Installation Control", "{\"type\":\"app_install_control\"}", "high" },
                    { new Guid("a1000000-0000-0000-0000-000000000003"), "Network", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Website Restrictions", "{\"type\":\"website_restrictions\"}", "medium" },
                    { new Guid("a1000000-0000-0000-0000-000000000004"), "Network", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "Wi-Fi Control", "{\"type\":\"wifi_control\"}", "medium" },
                    { new Guid("a1000000-0000-0000-0000-000000000005"), "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Bluetooth Blocking", "{\"type\":\"bluetooth_blocking\"}", "medium" },
                    { new Guid("a1000000-0000-0000-0000-000000000006"), "DeviceFeatures", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "Camera Disablement", "{\"type\":\"camera_disablement\"}", "low" },
                    { new Guid("a1000000-0000-0000-0000-000000000007"), "DeviceFeatures", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, "Kiosk Mode", "{\"type\":\"kiosk_mode\"}", "medium" },
                    { new Guid("a1000000-0000-0000-0000-000000000008"), "Compliance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Password Policy Enforcement", "{\"type\":\"password_policy\",\"minLength\":8,\"complexity\":\"alphanumeric\",\"expiryDays\":90,\"maxFailedAttempts\":5}", "high" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceViolations_DeviceId",
                table: "DeviceViolations",
                column: "DeviceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AllowedDomains");

            migrationBuilder.DropTable(
                name: "Apps");

            migrationBuilder.DropTable(
                name: "BlockedDomains");

            migrationBuilder.DropTable(
                name: "DeviceViolations");

            migrationBuilder.DropTable(
                name: "VpnProfiles");

            migrationBuilder.DropTable(
                name: "WifiProfiles");

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000006"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000007"));

            migrationBuilder.DeleteData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000008"));

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "IsEnabled",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "Policies");

            migrationBuilder.DropColumn(
                name: "AssignedUserName",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ComplianceStatus",
                table: "Devices");
        }
    }
}
