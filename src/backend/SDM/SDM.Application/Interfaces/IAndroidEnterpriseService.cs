using SDM.Application.DTOs.Enterprise;

namespace SDM.Application.Interfaces
{
    public interface IAndroidEnterpriseService
    {
        // Creates a Google-hosted signup URL and a Pending Enterprise row to match it
        // against the callback. Returns the URL the admin's browser should be sent to.
        Task<SignupUrlResponse> CreateSignupUrlAsync();

        // Called by EnterpriseController.Callback once Google redirects the admin's
        // browser back with enterpriseToken. Google's redirect does NOT echo signupUrlName
        // back, so this matches against the most recent Pending Enterprise row we created
        // ourselves in CreateSignupUrlAsync (single-tenant: at most one in-flight signup).
        // signupUrlNameHint lets a caller disambiguate explicitly if it's ever known.
        // Completes enterprises.create and marks the matching Enterprise row Active (or Failed).
        Task<EnterpriseDto> CompleteSignupAsync(string enterpriseToken, string? signupUrlNameHint = null);

        // The most recent Enterprise row, if any — used by the admin console to show
        // connection status (None / Pending / Active / Failed).
        Task<EnterpriseDto?> GetCurrentEnterpriseAsync();

        // Ensures the preset Policy for the given ManagementMode exists in Google (create-or-update,
        // PATCH is idempotent), then creates a fresh enrollment token referencing it. Returns the
        // token value + QR JSON for the admin to scan during device provisioning.
        Task<EnrollmentTokenDto> CreateEnrollmentTokenAsync(SDM.Domain.ManagementMode managementMode);

        // Pulls enterprises.devices.list and upserts matching rows into the local Device table
        // (matched by GoogleDeviceName). New AE devices get created with the ManagementMode
        // inferred from Google's own Device.ManagementMode field (DEVICE_OWNER/PROFILE_OWNER).
        Task<DeviceSyncResultDto> SyncDevicesAsync();
    }
}
