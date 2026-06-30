using System;

namespace SDM.Domain.Entities
{
    public enum AppInstallAction
    {
        Install = 0,
        Uninstall = 1
    }

    /// <summary>
    /// One push (install or uninstall) of an <see cref="AppPackage"/> to a single device.
    /// Delivery status is read from the linked <see cref="DeviceCommand"/> rather than
    /// duplicated here, so DeviceCommand.Status stays the single source of truth.
    /// </summary>
    public class AppInstallation
    {
        public Guid Id { get; set; }

        public Guid AppPackageId { get; set; }

        public Guid DeviceId { get; set; }

        public AppInstallAction Action { get; set; } = AppInstallAction.Install;

        public Guid? CommandId { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public AppPackage? AppPackage { get; set; }

        public Device? Device { get; set; }

        public DeviceCommand? Command { get; set; }
    }
}
