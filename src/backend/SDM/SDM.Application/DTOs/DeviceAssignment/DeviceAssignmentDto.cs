namespace SDM.Application.DTOs.DeviceAssignment
{
    public class DeviceAssignmentDto
    {
        public Guid Id { get; set; }
        public Guid DeviceId { get; set; }
        public string AssignedTo { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        public string AssignedBy { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class AssignDeviceRequest
    {
        public string AssignedTo { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
