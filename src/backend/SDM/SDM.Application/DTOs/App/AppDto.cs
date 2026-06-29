using SDM.Domain.Entities;

namespace SDM.Application.DTOs.App
{
    public class AppDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Installs { get; set; }
        public AppStatus AppStatus { get; set; }
        public string? Severity { get; set; }
        public string? BlockReason { get; set; }
        public string? RequestedBy { get; set; }
        public DateTime? RequestedOn { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class CreateAppRequest
    {
        public string Name { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public AppStatus AppStatus { get; set; } = AppStatus.Approved;
        public string? Severity { get; set; }
        public string? BlockReason { get; set; }
        public string? RequestedBy { get; set; }
    }

    public class UpdateAppRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Severity { get; set; }
        public string? BlockReason { get; set; }
    }
}
