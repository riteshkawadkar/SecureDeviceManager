using System;
using System.Collections.Generic;
using SDM.Domain.Enums;

namespace SDM.Application
{
    /// <summary>
    /// Maps command types to the ManagementMode they require. Profile Owner (BYOD Work Profile)
    /// devices only control the work profile, not the whole device, so device-wide commands
    /// are rejected for them. ManagementMode.Unknown (e.g. devices enrolled before this field
    /// existed) is treated as unrestricted to avoid breaking already-deployed corporate devices.
    /// </summary>
    public static class CommandCapabilityValidator
    {
        private static readonly HashSet<string> DeviceOwnerOnlyCommands = new(StringComparer.OrdinalIgnoreCase)
        {
            CommandTypes.Reboot,
            CommandTypes.EnableKiosk,
            CommandTypes.DisableKiosk,
            CommandTypes.BlockUsb,
            CommandTypes.UnblockUsb,
            CommandTypes.DisableWifi,
            CommandTypes.EnableWifi,
            CommandTypes.DisableBluetooth,
            CommandTypes.EnableBluetooth,
        };

        public static bool IsSupported(string commandType, ManagementMode managementMode)
        {
            if (managementMode != ManagementMode.ProfileOwner) return true;
            return !DeviceOwnerOnlyCommands.Contains(commandType);
        }
    }
}
