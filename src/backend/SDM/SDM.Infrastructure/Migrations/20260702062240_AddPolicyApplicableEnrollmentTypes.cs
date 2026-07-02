using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SDM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPolicyApplicableEnrollmentTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApplicableEnrollmentTypes",
                table: "Policies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000001"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000002"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000003"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000004"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000005"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000006"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000007"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");

            migrationBuilder.UpdateData(
                table: "Policies",
                keyColumn: "Id",
                keyValue: new Guid("a1000000-0000-0000-0000-000000000008"),
                column: "ApplicableEnrollmentTypes",
                value: "Corporate,BYOD");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicableEnrollmentTypes",
                table: "Policies");
        }
    }
}
