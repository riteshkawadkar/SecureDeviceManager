namespace SDM.Domain
{
    public enum AppPackageSource
    {
        // Hosted APK, sideloaded via the custom agent's InstallApp/UninstallApp FCM commands.
        SideloadUrl = 0,

        // Managed Google Play app, pushed via Android Enterprise Policy.applications[].
        PlayStore = 1
    }
}
