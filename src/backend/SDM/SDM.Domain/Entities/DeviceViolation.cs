namespace SDM.Domain.Entities
{
    public class DeviceViolation
    {
        public Guid Id { get; set; }

        public Guid DeviceId { get; set; }

        public string Description { get; set; } = string.Empty;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public Device? Device { get; set; }
    }
}
