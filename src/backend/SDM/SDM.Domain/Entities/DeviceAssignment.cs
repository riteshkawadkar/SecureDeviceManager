namespace SDM.Domain.Entities
{
    public class DeviceAssignment
    {
        public Guid Id { get; set; }

        public Guid DeviceId { get; set; }

        public Device Device { get; set; } = null!;

        public string AssignedTo { get; set; } = string.Empty;

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        public string AssignedBy { get; set; } = string.Empty;

        public string? Notes { get; set; }
    }
}
