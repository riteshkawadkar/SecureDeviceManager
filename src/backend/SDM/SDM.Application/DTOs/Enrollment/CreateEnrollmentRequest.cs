using System;
using SDM.Domain.Enums;

namespace SDM.Application.DTOs.Enrollment
{
    public class CreateEnrollmentRequest
    {
        public int MaxDevices { get; set; } = 1;
        public int ExpiresInMinutes { get; set; } = 60;
        public EnrollmentType EnrollmentType { get; set; } = EnrollmentType.Corporate;
    }
}
