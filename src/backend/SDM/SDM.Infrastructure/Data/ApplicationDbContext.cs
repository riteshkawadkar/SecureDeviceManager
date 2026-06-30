using Microsoft.EntityFrameworkCore;
using SDM.Domain.Entities;

namespace SDM.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options): base(options)
        {
        }

        public DbSet<User> Users => Set<User>();

        public DbSet<Role> Roles => Set<Role>();

        public DbSet<SDM.Domain.Entities.Device> Devices => Set<SDM.Domain.Entities.Device>();

        public DbSet<SDM.Domain.Entities.DeviceCommand> DeviceCommands => Set<SDM.Domain.Entities.DeviceCommand>();

        public DbSet<SDM.Domain.Entities.DeviceHeartbeat> DeviceHeartbeats => Set<SDM.Domain.Entities.DeviceHeartbeat>();

        public DbSet<SDM.Domain.Entities.DeviceGroup> DeviceGroups => Set<SDM.Domain.Entities.DeviceGroup>();

        public DbSet<SDM.Domain.Entities.Policy> Policies => Set<SDM.Domain.Entities.Policy>();

        public DbSet<SDM.Domain.Entities.DevicePushToken> DevicePushTokens => Set<SDM.Domain.Entities.DevicePushToken>();

        public DbSet<SDM.Domain.Entities.EnrollmentToken> EnrollmentTokens => Set<SDM.Domain.Entities.EnrollmentToken>();

        public DbSet<SDM.Domain.Entities.AuditLog> AuditLogs => Set<SDM.Domain.Entities.AuditLog>();

        public DbSet<SDM.Domain.Entities.DeviceViolation> DeviceViolations => Set<SDM.Domain.Entities.DeviceViolation>();

        public DbSet<SDM.Domain.Entities.AppEntry> Apps => Set<SDM.Domain.Entities.AppEntry>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var superAdminRoleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var adminRoleId = Guid.Parse("22222222-2222-2222-2222-222222222222");
            var operatorRoleId = Guid.Parse("33333333-3333-3333-3333-333333333333");
            var viewerRoleId = Guid.Parse("44444444-4444-4444-4444-444444444444");

            modelBuilder.Entity<Role>().HasData(
                new Role { Id = superAdminRoleId, Name = "SuperAdmin" },
                new Role { Id = adminRoleId, Name = "Admin" },
                new Role { Id = operatorRoleId, Name = "Operator" },
                new Role { Id = viewerRoleId, Name = "Viewer" });

            // Default bootstrap SuperAdmin so a fresh database is usable.
            // Email: admin@sdm.local / Password: Admin@12345 - change immediately after first login.
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = Guid.Parse("99999999-9999-9999-9999-999999999999"),
                    FirstName = "System",
                    LastName = "Administrator",
                    Email = "admin@sdm.local",
                    PasswordHash = "$2a$11$WX.tAdF162DZWC/vVXT6zO4iHgyZjcRBJ3GGE9jGfOIj.3k0z7Uuq",
                    RoleId = superAdminRoleId,
                    IsActive = true,
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                });

            modelBuilder.Entity<User>()
                .HasIndex(x => x.Email)
                .IsUnique();

            // Device indexes & relationships
            modelBuilder.Entity<SDM.Domain.Entities.Device>()
                .HasIndex(d => d.DeviceIdentifier)
                .IsUnique();

            modelBuilder.Entity<SDM.Domain.Entities.DevicePushToken>()
                .HasIndex(t => new { t.DeviceId, t.Token });

            modelBuilder.Entity<SDM.Domain.Entities.DeviceCommand>()
                .HasOne(c => c.Device)
                .WithMany(d => d.Commands)
                .HasForeignKey(c => c.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SDM.Domain.Entities.DeviceCommand>()
                .Property<int>("RetryCount")
                .HasDefaultValue(0);

            modelBuilder.Entity<SDM.Domain.Entities.DeviceCommand>()
                .Property<int>("MaxRetries")
                .HasDefaultValue(5);

            modelBuilder.Entity<SDM.Domain.Entities.AuditLog>()
                .HasIndex(a => a.Timestamp);

            modelBuilder.Entity<SDM.Domain.Entities.DeviceHeartbeat>()
                .HasOne(h => h.Device)
                .WithMany(d => d.Heartbeats)
                .HasForeignKey(h => h.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);

            // DeviceViolation relationship
            modelBuilder.Entity<SDM.Domain.Entities.DeviceViolation>()
                .HasOne(v => v.Device)
                .WithMany(d => d.Violations)
                .HasForeignKey(v => v.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed predefined policies
            modelBuilder.Entity<SDM.Domain.Entities.Policy>().HasData(
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000001"),
                    Name = "USB Blocking",
                    PolicyJson = "{\"type\":\"usb_blocking\"}",
                    IsEnabled = true,
                    Category = "Security",
                    Severity = "high",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000002"),
                    Name = "App Installation Control",
                    PolicyJson = "{\"type\":\"app_install_control\"}",
                    IsEnabled = true,
                    Category = "Security",
                    Severity = "high",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000003"),
                    Name = "Website Restrictions",
                    PolicyJson = "{\"type\":\"website_restrictions\"}",
                    IsEnabled = true,
                    Category = "Network",
                    Severity = "medium",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000004"),
                    Name = "Wi-Fi Control",
                    PolicyJson = "{\"type\":\"wifi_control\"}",
                    IsEnabled = false,
                    Category = "Network",
                    Severity = "medium",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000005"),
                    Name = "Bluetooth Blocking",
                    PolicyJson = "{\"type\":\"bluetooth_blocking\"}",
                    IsEnabled = true,
                    Category = "Security",
                    Severity = "medium",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000006"),
                    Name = "Camera Disablement",
                    PolicyJson = "{\"type\":\"camera_disablement\"}",
                    IsEnabled = false,
                    Category = "DeviceFeatures",
                    Severity = "low",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000007"),
                    Name = "Kiosk Mode",
                    PolicyJson = "{\"type\":\"kiosk_mode\"}",
                    IsEnabled = false,
                    Category = "DeviceFeatures",
                    Severity = "medium",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new SDM.Domain.Entities.Policy
                {
                    Id = Guid.Parse("a1000000-0000-0000-0000-000000000008"),
                    Name = "Password Policy Enforcement",
                    PolicyJson = "{\"type\":\"password_policy\",\"minLength\":8,\"complexity\":\"alphanumeric\",\"expiryDays\":90,\"maxFailedAttempts\":5}",
                    IsEnabled = true,
                    Category = "Compliance",
                    Severity = "high",
                    CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        }
    }
}
