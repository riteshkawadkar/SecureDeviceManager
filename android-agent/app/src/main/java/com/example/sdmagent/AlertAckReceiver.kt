package com.example.sdmagent

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/** Fired when the user taps a SendAlert notification (or its "Mark as Read" action) — dismisses it and reports the read receipt to the backend. */
class AlertAckReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AlertAckReceiver"
        const val EXTRA_COMMAND_ID = "commandId"
        const val EXTRA_NOTIFICATION_ID = "notificationId"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)
        if (notificationId != -1) {
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(notificationId)
        }

        val commandId = intent.getStringExtra(EXTRA_COMMAND_ID)
        if (commandId.isNullOrBlank()) return

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val jwt = getSavedValue(context, "device_jwt")
                val deviceId = getSavedValue(context, "device_id")
                if (jwt != null && deviceId != null) {
                    val baseUrl = getSavedValue(context, "server_url") ?: determineBaseUrl(context)
                    val resp = buildApi(baseUrl).acknowledgeCommand("Bearer $jwt", deviceId, commandId)
                    Log.d(TAG, "Alert acknowledged: commandId=$commandId -> HTTP ${resp.code()}")
                } else {
                    Log.w(TAG, "Missing device_jwt/device_id, cannot acknowledge $commandId")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error acknowledging alert $commandId", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun getSavedValue(context: Context, key: String): String? = try {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "sdm_prefs", masterKeyAlias, context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ).getString(key, null)
    } catch (e: Exception) { null }

    private fun determineBaseUrl(context: Context): String {
        try {
            context.assets.open("config.json").bufferedReader().use { r ->
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
