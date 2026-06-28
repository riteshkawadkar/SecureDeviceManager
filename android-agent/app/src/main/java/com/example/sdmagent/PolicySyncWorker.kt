package com.example.sdmagent

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class PolicySyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "PolicySyncWorker"
    }

    override suspend fun doWork(): Result {
        val pending = PolicyStore.getPending(applicationContext)
        if (pending.isEmpty()) return Result.success()

        val jwt = getSavedValue("device_jwt") ?: return Result.success()
        val deviceId = getSavedValue("device_id") ?: return Result.success()
        val baseUrl = getSavedValue("server_url") ?: return Result.success()

        val api = buildApi(baseUrl)

        pending.forEach { record ->
            try {
                val resp = api.reportCommandStatus(
                    auth = "Bearer $jwt",
                    deviceId = deviceId,
                    commandId = record.commandId,
                    req = ReportStatusRequest(record.success)
                )
                if (resp.isSuccessful || resp.code() == 404) {
                    PolicyStore.markAcknowledged(applicationContext, record.commandId)
                    Log.d(TAG, "Synced ack for ${record.commandId} (${record.commandType})")
                } else {
                    Log.w(TAG, "Ack failed for ${record.commandId}: HTTP ${resp.code()}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Network error syncing ${record.commandId}", e)
            }
        }

        return Result.success()
    }

    private fun getSavedValue(key: String): String? = try {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "sdm_prefs", masterKeyAlias, applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ).getString(key, null)
    } catch (e: Exception) { null }

    private fun buildApi(baseUrl: String): ApiService {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(OkHttpClient.Builder().addInterceptor(logging).build())
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
