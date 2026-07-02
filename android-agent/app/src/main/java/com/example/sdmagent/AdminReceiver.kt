package com.example.sdmagent

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.PersistableBundle
import android.util.Log
import android.widget.Toast
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class AdminReceiver : DeviceAdminReceiver() {
    companion object {
        private const val TAG = "AdminReceiver"
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Device Admin Enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "Device Admin Disabled", Toast.LENGTH_SHORT).show()
    }

    // Fires for both provisioning flows since API 24: BYOD Work Profile creation
    // (ACTION_PROVISION_MANAGED_PROFILE, this AdminReceiver instance runs inside the newly-created
    // profile, storage separate from the personal-profile MainActivity that triggered it) and
    // corporate zero-touch/OOBE Device Owner setup (ACTION_PROVISION_MANAGED_DEVICE, triggered by
    // the Setup Wizard scanning a QR before any Activity of ours has ever run).
    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, AdminReceiver::class.java)
        val isProfileOwner = dpm.isProfileOwnerApp(context.packageName)
        // setProfileEnabled is Work-Profile-specific; calling it for the Device Owner flow is invalid.
        if (isProfileOwner) {
            dpm.setProfileEnabled(adminComponent)
        }
        Log.d(TAG, "Provisioning complete — isDeviceOwner=${dpm.isDeviceOwnerApp(context.packageName)}, isProfileOwner=$isProfileOwner")

        val extras = intent.getParcelableExtra<PersistableBundle>(
            DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE
        )
        val jwt = extras?.getString("device_jwt")
        val deviceId = extras?.getString("device_id")
        val serverUrl = extras?.getString("server_url")
        val enrollmentToken = extras?.getString("enrollment_token")

        when {
            jwt != null && deviceId != null && serverUrl != null -> {
                // BYOD path: MainActivity already registered the device and handed the jwt/deviceId
                // across the profile boundary directly.
                EnrollmentPrefs.save(context, jwt, deviceId, serverUrl)
                WorkScheduler.scheduleAll(context)
                WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<ReportManagementModeWorker>().build())
                Toast.makeText(context, "✅ Work Profile created! SDM is Profile Owner.", Toast.LENGTH_LONG).show()
            }
            enrollmentToken != null && serverUrl != null -> {
                // Corporate OOBE path: cold start, nothing has registered with the backend yet —
                // hand off to a Worker so registration retries survive a flaky provisioning-time network.
                val work = OneTimeWorkRequestBuilder<CompleteOobeEnrollmentWorker>()
                    .setInputData(
                        Data.Builder()
                            .putString(CompleteOobeEnrollmentWorker.KEY_ENROLLMENT_TOKEN, enrollmentToken)
                            .putString(CompleteOobeEnrollmentWorker.KEY_SERVER_URL, serverUrl)
                            .build()
                    )
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                    .build()
                WorkManager.getInstance(context).enqueue(work)
                Toast.makeText(context, "✅ Device Owner set! Completing enrollment...", Toast.LENGTH_LONG).show()
            }
            else -> {
                Log.w(TAG, "No enrollment info in provisioning extras — device won't be able to report status")
            }
        }
    }
}
