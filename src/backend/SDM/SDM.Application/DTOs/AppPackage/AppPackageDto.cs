namespace SDM.Application.DTOs.AppPackage
{
    public class AppPackageDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int? VersionCode { get; set; }
        public string? IconUrl { get; set; }
        public string ApkUrl { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsSystemApp { get; set; }
        public bool RunAfterInstall { get; set; }
        public bool ShowIcon { get; set; }
        public DateTime CreatedOn { get; set; }
        public DateTime? UpdatedOn { get; set; }

        // Derived counts, computed by the service from AppInstallation/DeviceInstalledApp.
        public int PendingCount { get; set; }
        public int InstalledCount { get; set; }
        public int FailedCount { get; set; }
    }

    public class CreateAppPackageRequest
    {
        public string Name { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int? VersionCode { get; set; }
        public string? IconUrl { get; set; }
        public string ApkUrl { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsSystemApp { get; set; }
        public bool RunAfterInstall { get; set; }
        public bool ShowIcon { get; set; } = true;
    }

    public class UpdateAppPackageRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public int? VersionCode { get; set; }
        public string? IconUrl { get; set; }
        public string ApkUrl { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsSystemApp { get; set; }
        public bool RunAfterInstall { get; set; }
        public bool ShowIcon { get; set; }
    }

    public class PushInstallRequest
    {
        public List<Guid>? DeviceIds { get; set; }
        public Guid? GroupId { get; set; }
    }

    public class AppInstallationDto
    {
        public Guid Id { get; set; }
        public Guid AppPackageId { get; set; }
        public Guid DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty; // "Install" | "Uninstall"
        public Guid? CommandId { get; set; }
        public string Status { get; set; } = string.Empty; // Pending | Sent | Installed | Failed
        public DateTime CreatedOn { get; set; }
    }
}
