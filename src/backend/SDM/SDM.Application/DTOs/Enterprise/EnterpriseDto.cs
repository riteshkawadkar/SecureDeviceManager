using SDM.Domain.Entities;

namespace SDM.Application.DTOs.Enterprise
{
    public class EnterpriseDto
    {
        public Guid Id { get; set; }
        public string? GoogleEnterpriseId { get; set; }
        public string? DisplayName { get; set; }
        public EnterpriseStatus Status { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedOn { get; set; }
        public DateTime? UpdatedOn { get; set; }
    }

    public class SignupUrlResponse
    {
        // The Google-hosted URL the admin's browser should be sent to in order to
        // complete Managed Google Play enterprise creation.
        public string Url { get; set; } = string.Empty;
    }
}
