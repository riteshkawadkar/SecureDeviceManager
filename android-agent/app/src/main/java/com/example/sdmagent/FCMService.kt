package com.example.sdmagent

import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class FCMService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMService"
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")
        Log.d(TAG, "Data payload: ${remoteMessage.data}")

        val command = remoteMessage.data["body"]
            ?: remoteMessage.data["command"]
            ?: remoteMessage.data["commandType"]

        if (command != null) {
            Log.d(TAG, "Processing command: $command")
            CommandExecutor(this).execute(command, remoteMessage.data)
            // Acknowledge so the HTTP polling worker doesn't re-execute the same command
            val commandId = remoteMessage.data["commandId"]
                ?: try { JSONObject(remoteMessage.data["payload"] ?: "{}").optString("commandId", "") } catch (_: Exception) { "" }
            if (!commandId.isNullOrBlank()) {
                val jwt = getSavedValue("device_jwt")
                val devId = getSavedValue("device_id")
                if (jwt != null && devId != null) {
                    CoroutineScope(Dispatchers.IO).launch {
                        runCatching {
                            buildApi(getSavedValue("server_url") ?: determineBaseUrl())
                                .acknowledgeCommand("Bearer $jwt", devId, commandId)
                        }
                        Log.d(TAG, "FCM command acknowledged: $commandId")
                    }
                }
            }
        } else {
            Log.w(TAG, "No command found in FCM data: ${remoteMessage.data}")
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        sendTokenToBackend(token)
    }

    private fun sendTokenToBackend(token: String) {
        val jwt = getSavedValue("device_jwt") ?: run {
            Log.d(TAG, "No JWT, skipping FCM token update")
            return
        }
        val baseUrl = getSavedValue("server_url") ?: determineBaseUrl()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = buildApi(baseUrl).updateFcmToken("Bearer $jwt", UpdateFcmTokenRequest(token))
                if (resp.isSuccessful) Log.d(TAG, "FCM token updated on backend")
                else Log.e(TAG, "FCM token update failed: ${resp.code()}")
            } catch (e: Exception) {
                Log.e(TAG, "Error updating FCM token", e)
            }
        }
    }

    private fun getSavedValue(key: String): String? {
        return try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "sdm_prefs", masterKeyAlias, this,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            ).getString(key, null)
        } catch (e: Exception) { null }
    }

    private fun determineBaseUrl(): String {
        try {
            assets.open("config.json").bufferedReader().use { r ->
                val jo = JSONObject(r.readText())
                if (jo.has("server")) {
                    val url = jo.getString("server")
                    return if (url.endsWith("/")) url else "$url/"
                }
            }
        } catch (_: Exception) { }
        return "http://40.81.231.1:5254/"
    }

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
