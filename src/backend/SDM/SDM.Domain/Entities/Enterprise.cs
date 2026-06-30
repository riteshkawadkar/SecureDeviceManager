using System;

namespace SDM.Domain.Entities
{
    public enum EnterpriseStatus
    {
        // SignupUrl created, waiting for the admin to complete Google's hosted consent flow.
        Pending = 0,
        // enterprises.create succeeded — GoogleEnterpriseId is set and usable.
        Active = 1,
        Failed = 2
    }

    /// <summary>
    /// Single-row-per-deployment binding to a Google Managed Google Play enterprise
    /// (this project is single-tenant, so there is at most one Active row at a time).
    /// </summary>
    public class Enterprise
    {
        public Guid Id { get; set; }

        // Google's enterprises.signupUrls resource name (e.g. "signupUrls/ABC123"),
        // used to match the browser callback back to the signup attempt that created it.
        public string SignupUrlName { get; set; } = string.Empty;

        // Google's enterprise resource name (e.g. "enterprises/LC00abc123"), set once
        // enterprises.create succeeds. This is the id every other Android Management API
        // call (policies, enrollment tokens, devices) is scoped under.
        public string? GoogleEnterpriseId { get; set; }

        public string? DisplayName { get; set; }

        public EnterpriseStatus Status { get; set; } = EnterpriseStatus.Pending;

        public string? ErrorMessage { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedOn { get; set; }
    }
}
