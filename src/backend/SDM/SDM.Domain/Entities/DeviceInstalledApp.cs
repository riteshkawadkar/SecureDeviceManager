using System;

namespace SDM.Domain.Entities
{
    /// <summary>
    /// Installed-app inventory as reported by the device agent (full sync per report).
    /// </summary>
    public class DeviceInstalledApp
    {
        public Guid Id { get; set; }

        public Guid DeviceId { get; set; }

        public string PackageId { get; set; } = string.Empty;

        public string? AppName { get; set; }

        public string? VersionName { get; set; }

        public int? VersionCode { get; set; }

        public bool IsSystemApp { get; set; }

        public DateTime FirstSeenOn { get; set; } = DateTime.UtcNow;

        public DateTime LastSeenOn { get; set; } = DateTime.UtcNow;

        public Device? Device { get; set; }
    }
}
