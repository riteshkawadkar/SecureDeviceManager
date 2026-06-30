using SDM.Domain;

namespace SDM.Application.DTOs.Enterprise
{
    public class CreateEnrollmentTokenRequest
    {
        public ManagementMode ManagementMode { get; set; } = ManagementMode.AndroidEnterpriseFullyManaged;
    }

    public class EnrollmentTokenDto
    {
        public Guid Id { get; set; }
        public string Value { get; set; } = string.Empty;
        // JSON payload to render as a QR code (e.g. via a frontend QR library) for the
        // admin to scan during the device's factory-reset setup wizard.
        public string QrCodeJson { get; set; } = string.Empty;
        public ManagementMode ManagementMode { get; set; }
        public DateTime? ExpirationTimestamp { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class DeviceSyncResultDto
    {
        public int TotalFromGoogle { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
    }
}
