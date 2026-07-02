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

        public string CommandType { get; set; } = string.Empty;

        /// <summary>Comma-separated EnrollmentType names this policy applies to, e.g. "Corporate,BYOD". Empty means all.</summary>
        public string ApplicableEnrollmentTypes { get; set; } = "Corporate,BYOD";

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
