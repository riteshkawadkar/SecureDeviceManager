package com.example.sdmagent

import android.content.Context
import android.os.BatteryManager
import android.os.Environment
import android.os.StatFs
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class HeartbeatWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "HeartbeatWorker"
    }

    override suspend fun doWork(): Result {
        val jwt = getSavedValue("device_jwt") ?: run {
            Log.d(TAG, "No JWT, skipping heartbeat")
            return Result.success()
        }
        val deviceId = getSavedValue("device_id") ?: run {
            Log.d(TAG, "No device_id, skipping heartbeat")
            return Result.success()
        }
        val baseUrl = getSavedValue("server_url") ?: determineBaseUrl()

        return try {
            val battery = getBatteryLevel()
            val freeStorage = getFreeStorageBytes()

            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val api = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(OkHttpClient.Builder().addInterceptor(logging).build())
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(ApiService::class.java)

            val resp = api.heartbeat("Bearer $jwt", deviceId, HeartbeatRequest(battery, freeStorage))
            if (resp.isSuccessful) {
                Log.d(TAG, "Heartbeat sent (battery=$battery%, free=${freeStorage / 1_048_576}MB)")
            } else {
                Log.w(TAG, "Heartbeat failed: ${resp.code()}")
            }
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Heartbeat error", e)
            Result.retry()
        }
    }

    private fun getBatteryLevel(): Int {
        val bm = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    private fun getFreeStorageBytes(): Long {
        val stat = StatFs(Environment.getDataDirectory().path)
        return stat.availableBytes
    }

    private fun getSavedValue(key: String): String? {
        return try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "sdm_prefs", masterKeyAlias, applicationContext,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            ).getString(key, null)
        } catch (e: Exception) { null }
    }

    private fun determineBaseUrl(): String {
        try {
            applicationContext.assets.open("config.json").bufferedReader().use { r ->
                val jo = JSONObject(r.readText())
                if (jo.has("server")) {
                    val url = jo.getString("server")
                    return if (url.endsWith("/")) url else "$url/"
                }
            }
        } catch (_: Exception) { }
        return "http://40.81.231.1:5254/"
    }
}
