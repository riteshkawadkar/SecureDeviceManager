package com.example.sdmagent

import android.content.Context
import android.provider.Settings
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.UUID

/**
 * Completes device registration for the corporate zero-touch/OOBE Device Owner flow, where
 * provisioning happens straight out of the Android Setup Wizard — no Activity has run yet, so
 * AdminReceiver.onProfileProvisioningComplete only has an enrollment token + server URL (from the
 * QR's admin-extras bundle) rather than an already-issued device JWT.
 */
class CompleteOobeEnrollmentWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "CompleteOobeEnrollment"
        const val KEY_ENROLLMENT_TOKEN = "enrollment_token"
        const val KEY_SERVER_URL = "server_url"
    }

    override suspend fun doWork(): Result {
        val enrollmentToken = inputData.getString(KEY_ENROLLMENT_TOKEN) ?: return Result.failure()
        val serverUrl = inputData.getString(KEY_SERVER_URL) ?: return Result.failure()

        return try {
            val deviceIdentifier = Settings.Secure.getString(
                applicationContext.contentResolver, Settings.Secure.ANDROID_ID
            ) ?: UUID.randomUUID().toString()

            val fcmToken = try {
                FirebaseMessaging.getInstance().token.await()
            } catch (e: Exception) {
                Log.w(TAG, "Could not get FCM token", e)
                null
            }

            val req = DeviceRegisterWithTokenRequest(
                token = enrollmentToken,
                deviceIdentifier = deviceIdentifier,
                serialNumber = android.os.Build.SERIAL ?: "unknown",
                manufacturer = android.os.Build.MANUFACTURER,
                model = android.os.Build.MODEL,
                androidVersion = android.os.Build.VERSION.RELEASE,
                fcmToken = fcmToken
            )

            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val api = Retrofit.Builder()
                .baseUrl(serverUrl)
                .client(OkHttpClient.Builder().addInterceptor(logging).build())
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(ApiService::class.java)

            val resp = api.register(req)
            if (resp.isSuccessful && resp.body() != null) {
                val body = resp.body()!!
                EnrollmentPrefs.save(applicationContext, body.deviceJwt, body.deviceId, serverUrl)
                WorkScheduler.scheduleAll(applicationContext)
                WorkManager.getInstance(applicationContext)
                    .enqueue(OneTimeWorkRequestBuilder<ReportManagementModeWorker>().build())
                Log.d(TAG, "OOBE corporate enrollment complete, device registered: ${body.deviceId}")
                Result.success()
            } else {
                Log.w(TAG, "OOBE registration failed: ${resp.code()}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error completing OOBE enrollment", e)
            Result.retry()
        }
    }
}
