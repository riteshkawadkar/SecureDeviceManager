namespace SDM.Application.DTOs.Policy
{
    public class PolicyDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PolicyJson { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string CommandType { get; set; } = string.Empty;
        public string ApplicableEnrollmentTypes { get; set; } = "Corporate,BYOD";
        public DateTime CreatedOn { get; set; }
    }

    public class CreatePolicyRequest
    {
        public string Name { get; set; } = string.Empty;
        public string PolicyJson { get; set; } = "{}";
        public bool IsEnabled { get; set; } = true;
        public string Category { get; set; } = string.Empty;
        public string Severity { get; set; } = "medium";
        public string CommandType { get; set; } = string.Empty;
        public string ApplicableEnrollmentTypes { get; set; } = "Corporate,BYOD";
    }

    public class UpdatePolicyRequest
    {
        public string Name { get; set; } = string.Empty;
        public string PolicyJson { get; set; } = "{}";
        public string Category { get; set; } = string.Empty;
        public string Severity { get; set; } = "medium";
        public string CommandType { get; set; } = string.Empty;
        public string ApplicableEnrollmentTypes { get; set; } = "Corporate,BYOD";
    }

    public class PolicyEnforceResult
    {
        public int TotalDevices { get; set; }
        public int CommandsSent { get; set; }
    }
}
