using System;

namespace SDM.Domain.Entities
{
    public class Policy
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string PolicyJson { get; set; } = string.Empty;

        public bool IsEnabled { get; set; } = true;

        public string Category { get; set; } = string.Empty;

        public string Severity { get; set; } = string.Empty;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
