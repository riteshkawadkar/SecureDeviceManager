package com.example.sdmagent

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/**
 * Reports the device's current Device Owner / Profile Owner status to the backend.
 * Runs as a WorkManager job (rather than inline in AdminReceiver.onProfileProvisioningComplete)
 * so a flaky network at provisioning time doesn't lose the update — WorkManager retries it.
 */
class ReportManagementModeWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "ReportMgmtModeWorker"
    }

    override suspend fun doWork(): Result {
        val jwt = EnrollmentPrefs.get(applicationContext, "device_jwt") ?: run {
            Log.d(TAG, "No JWT, skipping management mode report")
            return Result.success()
        }
        val baseUrl = EnrollmentPrefs.get(applicationContext, "server_url") ?: return Result.success()

        val dpm = applicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val mode = when {
            dpm.isDeviceOwnerApp(applicationContext.packageName) -> ManagementModeValues.DEVICE_OWNER
            dpm.isProfileOwnerApp(applicationContext.packageName) -> ManagementModeValues.PROFILE_OWNER
            else -> ManagementModeValues.UNKNOWN
        }
        if (mode == ManagementModeValues.UNKNOWN) return Result.success()

        return try {
            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val api = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(OkHttpClient.Builder().addInterceptor(logging).build())
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(ApiService::class.java)

            val resp = api.updateManagementMode("Bearer $jwt", UpdateManagementModeRequest(mode))
            if (resp.isSuccessful) {
                Log.d(TAG, "Management mode reported: $mode")
                Result.success()
            } else {
                Log.w(TAG, "Management mode report failed: ${resp.code()}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reporting management mode", e)
            Result.retry()
        }
    }
}
