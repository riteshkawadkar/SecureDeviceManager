using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultAdminUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedOn", "Email", "FirstName", "IsActive", "LastName", "PasswordHash", "RoleId" },
                values: new object[] { new Guid("99999999-9999-9999-9999-999999999999"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "admin@sdm.local", "System", true, "Administrator", "$2a$11$WX.tAdF162DZWC/vVXT6zO4iHgyZjcRBJ3GGE9jGfOIj.3k0z7Uuq", new Guid("11111111-1111-1111-1111-111111111111") });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("99999999-9999-9999-9999-999999999999"));
        }
    }
}
