package com.example.sdmagent

import android.content.Context
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

class CommandPollingWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "CommandPollingWorker"
    }

    override suspend fun doWork(): Result {
        val jwt = getSavedValue("device_jwt") ?: run {
            Log.d(TAG, "No JWT, skipping command poll")
            return Result.success()
        }
        val deviceId = getSavedValue("device_id") ?: run {
            Log.d(TAG, "No device_id, skipping command poll")
            return Result.success()
        }
        val baseUrl = getSavedValue("server_url") ?: determineBaseUrl()

        return try {
            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val api = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(OkHttpClient.Builder().addInterceptor(logging).build())
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(ApiService::class.java)

            val resp = api.getPendingCommands("Bearer $jwt", deviceId)
            if (!resp.isSuccessful) {
                Log.w(TAG, "Command poll failed: ${resp.code()}")
                // 401 = JWT expired/invalid; no point retrying until re-enrolled
                return if (resp.code() == 401) Result.success() else Result.retry()
            }

            val commands = resp.body() ?: emptyList()
            Log.d(TAG, "Polled ${commands.size} pending command(s)")

            val executor = CommandExecutor(applicationContext)
            for (cmd in commands) {
                Log.d(TAG, "Executing polled command: ${cmd.commandType} (id=${cmd.id})")
                executor.execute(cmd.commandType, buildDataMap(cmd))
                // Acknowledge immediately so subsequent polls skip this command;
                // reportStatus is called inside execute() (synchronously or async for InstallApp)
                try {
                    api.acknowledgeCommand("Bearer $jwt", deviceId, cmd.id)
                } catch (e: Exception) {
                    Log.w(TAG, "Could not acknowledge command ${cmd.id}", e)
                }
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Command polling error", e)
            Result.retry()
        }
    }

    // Mirrors BuildFcmData in PushService.cs: wraps the stored payload in the same
    // envelope the FCM path uses so CommandExecutor.execute() sees an identical data map.
    private fun buildDataMap(cmd: PendingCommandDto): Map<String, String> {
        val outerPayload = JSONObject().apply {
            put("commandId", cmd.id)
            put("payload", cmd.payload)
        }
        val data = mutableMapOf(
            "body"      to cmd.commandType,
            "payload"   to outerPayload.toString(),
            "commandId" to cmd.id
        )
        try {
            val inner = JSONObject(cmd.payload)
            inner.keys().forEach { key ->
                if (!data.containsKey(key)) data[key] = inner.optString(key)
            }
        } catch (_: Exception) {}
        return data
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
