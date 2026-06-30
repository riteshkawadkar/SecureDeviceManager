namespace SDM.Domain
{
    public enum ManagementMode
    {
        // Custom Device-Owner Kotlin agent (Release 1) — FCM command pipeline, sideload installs.
        CustomAgent = 0,

        // Android Enterprise fully managed device (COBO) — Google's Android Device Policy app
        // is Device Owner, driven entirely by our backend via the Android Management API.
        AndroidEnterpriseFullyManaged = 1,

        // Android Enterprise Work Profile / BYOD — Profile Owner on a personal device, only
        // the work container is managed.
        AndroidEnterpriseWorkProfile = 2
    }
}
