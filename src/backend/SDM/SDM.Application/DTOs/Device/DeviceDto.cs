using SDM.Domain;
using SDM.Domain.Entities;

namespace SDM.Application.DTOs.Device
{
    public class DeviceDto
    {
        public Guid Id { get; set; }
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string Manufacturer { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string AndroidVersion { get; set; } = string.Empty;
        public int BatteryLevel { get; set; }
        public DateTime? LastSeen { get; set; }
        public DeviceStatus Status { get; set; }
        public ComplianceStatus ComplianceStatus { get; set; }
        public string? AssignedUserName { get; set; }
        public Guid? GroupId { get; set; }
        public DateTime CreatedOn { get; set; }
        public DateTime? UpdatedOn { get; set; }
    }

    public class DeviceViolationDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedOn { get; set; }
    }

    public class DeviceQueryParams
    {
        public string? Search { get; set; }
        public string? Status { get; set; }
        public string? AndroidVersion { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
