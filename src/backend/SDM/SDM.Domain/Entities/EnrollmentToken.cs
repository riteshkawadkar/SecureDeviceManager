using System;
using SDM.Domain.Enums;

namespace SDM.Domain.Entities
{
    public class EnrollmentToken
    {
        public Guid Id { get; set; }

        public string Token { get; set; } = string.Empty;

        public DateTime ExpiresOn { get; set; }

        public int MaxDevices { get; set; } = 1;

        public bool IsActive { get; set; } = true;

        public EnrollmentType EnrollmentType { get; set; } = EnrollmentType.Corporate;
    }
}
