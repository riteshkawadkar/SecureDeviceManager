using System;
using SDM.Domain;

namespace SDM.Domain.Entities
{
    /// <summary>
    /// A generated Android Enterprise QR provisioning token (distinct from the
    /// Release 1 <see cref="EnrollmentToken"/>, which is for the custom Device-Owner agent).
    /// </summary>
    public class EnterpriseEnrollmentToken
    {
        public Guid Id { get; set; }

        // Android Management API resource name, e.g. "enterprises/LC.../enrollmentTokens/abc123".
        public string GoogleTokenName { get; set; } = string.Empty;

        // Raw token value (the "android.com/tk" payload component) — not secret long-term,
        // but only useful during the provisioning window.
        public string Value { get; set; } = string.Empty;

        // JSON payload to render as the provisioning QR code.
        public string QrCodeJson { get; set; } = string.Empty;

        public ManagementMode ManagementMode { get; set; } = ManagementMode.AndroidEnterpriseFullyManaged;

        public string PolicyName { get; set; } = string.Empty;

        public DateTime? ExpirationTimestamp { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
