namespace SDM.Application.DTOs.AppPackage
{
    public class DeviceInstalledAppDto
    {
        public Guid Id { get; set; }
        public Guid DeviceId { get; set; }
        public string PackageId { get; set; } = string.Empty;
        public string? AppName { get; set; }
        public string? VersionName { get; set; }
        public int? VersionCode { get; set; }
        public bool IsSystemApp { get; set; }
        public DateTime FirstSeenOn { get; set; }
        public DateTime LastSeenOn { get; set; }
    }

    public class ReportInstalledAppsRequest
    {
        public List<InstalledAppItem> Apps { get; set; } = new();
    }

    public class InstalledAppItem
    {
        public string PackageId { get; set; } = string.Empty;
        public string? AppName { get; set; }
        public string? VersionName { get; set; }
        public int? VersionCode { get; set; }
        public bool IsSystemApp { get; set; }
    }
}
