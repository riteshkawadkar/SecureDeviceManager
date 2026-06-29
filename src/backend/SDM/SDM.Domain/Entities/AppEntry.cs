namespace SDM.Domain.Entities
{
    public enum AppStatus
    {
        Approved = 0,
        Blocked = 1,
        Pending = 2
    }

    public class AppEntry
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string PackageId { get; set; } = string.Empty;

        public string Version { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public int Installs { get; set; }

        public AppStatus AppStatus { get; set; } = AppStatus.Pending;

        public string? Severity { get; set; }

        public string? BlockReason { get; set; }

        public string? RequestedBy { get; set; }

        public DateTime? RequestedOn { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
