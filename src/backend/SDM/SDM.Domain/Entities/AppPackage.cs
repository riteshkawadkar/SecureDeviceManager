using System;
using System.Collections.Generic;

namespace SDM.Domain.Entities
{
    /// <summary>
    /// A catalog entry for an app that can be pushed to devices (Headwind-style app catalog).
    /// Distinct from <see cref="AppEntry"/>, which is the approve/block compliance allowlist.
    /// </summary>
    public class AppPackage
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string PackageId { get; set; } = string.Empty;

        public string Version { get; set; } = string.Empty;

        public int? VersionCode { get; set; }

        public string? IconUrl { get; set; }

        // Hosted APK URL the agent downloads from. Matches CommandTypes.InstallApp payload "url".
        public string ApkUrl { get; set; } = string.Empty;

        public string? Category { get; set; }

        public bool IsSystemApp { get; set; }

        // Launch the app once silently installed (for apps that need first-run setup).
        public bool RunAfterInstall { get; set; }

        // Show the app icon on the device home screen after install.
        public bool ShowIcon { get; set; } = true;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedOn { get; set; }

        public ICollection<AppInstallation> Installations { get; set; } = new List<AppInstallation>();
    }
}
