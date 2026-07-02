using System;
using SDM.Domain.Enums;

namespace SDM.Application.DTOs.Device
{
    public class DeviceRegisterWithTokenRequest
    {
        public string Token { get; set; } = string.Empty;
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string Manufacturer { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string AndroidVersion { get; set; } = string.Empty;
        public string? FcmToken { get; set; }
        public ManagementMode ManagementMode { get; set; } = ManagementMode.Unknown;
    }
}
