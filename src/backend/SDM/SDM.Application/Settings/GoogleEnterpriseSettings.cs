namespace SDM.Application.Settings
{
    public class GoogleEnterpriseSettings
    {
        // Path to the service account JSON key created for the Android Management API,
        // same shape as Firebase:ServiceAccountPath.
        public string ServiceAccountPath { get; set; } = string.Empty;

        // GCP project id the service account belongs to (required by signupUrls.create).
        public string ProjectId { get; set; } = string.Empty;

        // Where Google redirects the admin's browser after they complete hosted signup —
        // must be a publicly reachable URL pointing at EnterpriseController.Callback.
        public string CallbackUrl { get; set; } = string.Empty;

        // Where to send the admin's browser after we've processed the callback
        // (a page in the frontend, e.g. /settings/enterprise).
        public string FrontendRedirectUrl { get; set; } = string.Empty;
    }
}
