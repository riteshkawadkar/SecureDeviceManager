using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAppManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppPackages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    PackageId = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<string>(type: "text", nullable: false),
                    VersionCode = table.Column<int>(type: "integer", nullable: true),
                    IconUrl = table.Column<string>(type: "text", nullable: true),
                    ApkUrl = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: true),
                    IsSystemApp = table.Column<bool>(type: "boolean", nullable: false),
                    RunAfterInstall = table.Column<bool>(type: "boolean", nullable: false),
                    ShowIcon = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppPackages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeviceInstalledApps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<string>(type: "text", nullable: false),
                    AppName = table.Column<string>(type: "text", nullable: true),
                    VersionName = table.Column<string>(type: "text", nullable: true),
                    VersionCode = table.Column<int>(type: "integer", nullable: true),
                    IsSystemApp = table.Column<bool>(type: "boolean", nullable: false),
                    FirstSeenOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSeenOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceInstalledApps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceInstalledApps_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppInstallations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppPackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    CommandId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppInstallations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppInstallations_AppPackages_AppPackageId",
                        column: x => x.AppPackageId,
                        principalTable: "AppPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppInstallations_DeviceCommands_CommandId",
                        column: x => x.CommandId,
                        principalTable: "DeviceCommands",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AppInstallations_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppInstallations_AppPackageId",
                table: "AppInstallations",
                column: "AppPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInstallations_CommandId",
                table: "AppInstallations",
                column: "CommandId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInstallations_DeviceId",
                table: "AppInstallations",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_AppPackages_PackageId",
                table: "AppPackages",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceInstalledApps_DeviceId_PackageId",
                table: "DeviceInstalledApps",
                columns: new[] { "DeviceId", "PackageId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppInstallations");

            migrationBuilder.DropTable(
                name: "DeviceInstalledApps");

            migrationBuilder.DropTable(
                name: "AppPackages");
        }
    }
}
