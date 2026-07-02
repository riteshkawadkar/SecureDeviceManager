using System;
using SDM.Domain.Enums;

namespace SDM.Application.DTOs.Device
{
    public class DeviceRegisterWithTokenResponse
    {
        public Guid DeviceId { get; set; }
        public string DeviceJwt { get; set; } = string.Empty;
        public int ExpiresInSeconds { get; set; }
        public EnrollmentType EnrollmentType { get; set; }
    }
}
