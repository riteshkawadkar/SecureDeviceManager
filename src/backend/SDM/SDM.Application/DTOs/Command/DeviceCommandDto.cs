using System;

namespace SDM.Application.DTOs.Command
{
    public class DeviceCommandDto
    {
        public Guid Id { get; set; }
        public Guid DeviceId { get; set; }
        public string CommandType { get; set; } = string.Empty;
        public string Payload { get; set; } = string.Empty;
        public int Status { get; set; }
        public int RetryCount { get; set; }
        public int MaxRetries { get; set; }
        public DateTime CreatedOn { get; set; }
        public DateTime? ExecutedOn { get; set; }
        /// <summary>Admin who issued the command, resolved from the "CommandCreated" audit log entry. Null for system-issued commands (e.g. Hangfire retries) or commands created before this attribution was added.</summary>
        public Guid? CreatedByUserId { get; set; }
        public string? CreatedByName { get; set; }
    }
}
