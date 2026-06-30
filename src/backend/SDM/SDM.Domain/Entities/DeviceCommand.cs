using System;

namespace SDM.Domain.Entities
{
    public class DeviceCommand
    {
        public Guid Id { get; set; }

        public Guid DeviceId { get; set; }

        public string CommandType { get; set; } = string.Empty;

        // JSON payload for the command
        public string Payload { get; set; } = string.Empty;

        public CommandStatus Status { get; set; } = CommandStatus.Pending;

        // Retry tracking for push delivery
        public int RetryCount { get; set; } = 0;

        public int MaxRetries { get; set; } = 5;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? ExecutedOn { get; set; }

        // Groups commands created together as one logical event (e.g. every policy in a single
        // Bulk Policy Deployment "Deploy" click) so the UI can show them as one history row.
        // A standalone command (Lock, a single policy Enforce, etc.) gets its own unique BatchId,
        // which naturally renders as a group of one. Nullable so commands created before this
        // field existed stay ungrouped (the UI falls back to grouping those by command id)
        // instead of colliding on a shared default value.
        public Guid? BatchId { get; set; } = Guid.NewGuid();

        // Set when the device user explicitly confirms they've seen the command (currently
        // only used for SendAlert's "Mark as Read" action) — distinct from ExecutedOn, which
        // just means the agent processed the command.
        public DateTime? AcknowledgedOn { get; set; }

        public Device? Device { get; set; }
    }
}
