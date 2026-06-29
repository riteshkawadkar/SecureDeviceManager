package com.example.sdmagent

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.File
import java.io.FileOutputStream

class FCMService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMService"

        // UserManager restriction key strings (avoids API-level import issues)
        private const val RESTRICT_USB          = "no_usb_file_transfer"
        private const val RESTRICT_INSTALL_APPS = "no_install_apps"
        private const val RESTRICT_CONFIG_WIFI  = "no_config_wifi"
        private const val RESTRICT_WIFI_STATE   = "no_change_wifi_state"   // API 31+
        private const val RESTRICT_BLUETOOTH    = "no_bluetooth"            // API 26+
        private const val RESTRICT_CONFIG_BT    = "no_config_bluetooth"
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")
        Log.d(TAG, "Data payload: ${remoteMessage.data}")

        // Backend sends commandType in "body"; fall back to legacy keys
        val command = remoteMessage.data["body"]
            ?: remoteMessage.data["command"]
            ?: remoteMessage.data["commandType"]

        if (command != null) {
            Log.d(TAG, "Processing command: $command")
            handleCommand(command, remoteMessage.data)
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

    private fun handleCommand(command: String, data: Map<String, String>) {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, AdminReceiver::class.java)

        // data["payload"] = serialized outer object {"commandId":"<uuid>","payload":"<swagger payload>"}
        val commandId = try {
            val payloadJson = data["payload"]
            if (!payloadJson.isNullOrBlank()) JSONObject(payloadJson).optString("commandId", "") else ""
        } catch (e: Exception) {
            Log.w(TAG, "Could not parse commandId from payload", e)
            ""
        }

        // Snapshot all FCM data fields for local storage (preserves command params for display)
        val payloadForStore = try {
            JSONObject().apply { data.forEach { (k, v) -> put(k, v) } }.toString()
        } catch (e: Exception) { "" }

        val isoNow = run {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            sdf.format(java.util.Date())
        }

        if (commandId.isNotBlank()) {
            PolicyStore.upsert(this, PolicyRecord(
                commandId = commandId,
                commandType = command,
                payload = payloadForStore,
                appliedAt = isoNow,
                success = false,
                acknowledged = false
            ))
        }

        if (!dpm.isAdminActive(adminComponent)) {
            Log.w(TAG, "Device Admin not active — cannot execute: $command")
            reportStatus(commandId, success = false)
            return
        }

        val isDeviceOwner = dpm.isDeviceOwnerApp(packageName)

        var success = false
        try {
            when (command) {

                // ── Lock / wipe ──────────────────────────────────────────────
                "LockDevice", "LockScreen", "force-lock" -> {
                    dpm.lockNow()
                    Log.d(TAG, "Screen locked")
                    success = true
                }

                "WipeData", "wipe-data" -> {
                    // dpm.wipeData(0)  // uncomment to enable factory reset
                    Log.d(TAG, "WipeData received (disabled for safety)")
                    success = true
                }

                // ── App visibility ───────────────────────────────────────────
                "DisableApp", "disable-app" -> {
                    val pkg = data["packageName"]
                    if (pkg != null && isDeviceOwner) {
                        dpm.setApplicationHidden(adminComponent, pkg, true)
                        Log.d(TAG, "App disabled: $pkg")
                        success = true
                    } else {
                        Log.w(TAG, "DisableApp requires Device Owner. pkg=$pkg")
                    }
                }

                "EnableApp", "enable-app" -> {
                    val pkg = data["packageName"]
                    if (pkg != null && isDeviceOwner) {
                        dpm.setApplicationHidden(adminComponent, pkg, false)
                        Log.d(TAG, "App enabled: $pkg")
                        success = true
                    } else {
                        Log.w(TAG, "EnableApp requires Device Owner. pkg=$pkg")
                    }
                }

                "InstallApp", "install-app" -> {
                    val url = data["url"]
                    val pkg = data["packageName"]
                    if (url != null && pkg != null) {
                        downloadAndInstall(url, pkg, commandId)
                        return // status reported asynchronously
                    } else {
                        Log.w(TAG, "InstallApp missing url or packageName")
                    }
                }

                // ── App installation control ─────────────────────────────────
                "DisableAppInstall" -> {
                    if (isDeviceOwner) {
                        dpm.addUserRestriction(adminComponent, RESTRICT_INSTALL_APPS)
                        Log.d(TAG, "App installation disabled")
                        success = true
                    } else {
                        Log.w(TAG, "DisableAppInstall requires Device Owner")
                    }
                }

                "EnableAppInstall" -> {
                    if (isDeviceOwner) {
                        dpm.clearUserRestriction(adminComponent, RESTRICT_INSTALL_APPS)
                        Log.d(TAG, "App installation enabled")
                        success = true
                    } else {
                        Log.w(TAG, "EnableAppInstall requires Device Owner")
                    }
                }

                // ── Kiosk / task lock ────────────────────────────────────────
                "LockApp", "lock-app", "EnableKiosk" -> {
                    val pkg = data["packageName"]
                    if (pkg != null && isDeviceOwner) {
                        dpm.setLockTaskPackages(adminComponent, arrayOf(pkg))
                        Log.d(TAG, "Kiosk mode enabled for: $pkg")
                        success = true
                    } else {
                        Log.w(TAG, "EnableKiosk requires Device Owner. pkg=$pkg")
                    }
                }

                "DisableKiosk" -> {
                    if (isDeviceOwner) {
                        dpm.setLockTaskPackages(adminComponent, emptyArray())
                        Log.d(TAG, "Kiosk mode disabled")
                        success = true
                    } else {
                        Log.w(TAG, "DisableKiosk requires Device Owner")
                    }
                }

                // ── Camera ───────────────────────────────────────────────────
                "DisableCamera" -> {
                    dpm.setCameraDisabled(adminComponent, true)
                    Log.d(TAG, "Camera disabled")
                    success = true
                }

                "EnableCamera" -> {
                    dpm.setCameraDisabled(adminComponent, false)
                    Log.d(TAG, "Camera enabled")
                    success = true
                }

                // ── USB ──────────────────────────────────────────────────────
                "BlockUsb" -> {
                    if (isDeviceOwner) {
                        dpm.addUserRestriction(adminComponent, RESTRICT_USB)
                        Log.d(TAG, "USB file transfer blocked")
                        success = true
                    } else {
                        Log.w(TAG, "BlockUsb requires Device Owner")
                    }
                }

                "UnblockUsb" -> {
                    if (isDeviceOwner) {
                        dpm.clearUserRestriction(adminComponent, RESTRICT_USB)
                        Log.d(TAG, "USB file transfer unblocked")
                        success = true
                    } else {
                        Log.w(TAG, "UnblockUsb requires Device Owner")
                    }
                }

                // ── Wi-Fi ────────────────────────────────────────────────────
                // Prevents user from changing Wi-Fi settings / toggling the radio.
                // On API 31+ also blocks the quick-settings toggle (no_change_wifi_state).
                "DisableWifi" -> {
                    if (isDeviceOwner) {
                        dpm.addUserRestriction(adminComponent, RESTRICT_CONFIG_WIFI)
                        if (Build.VERSION.SDK_INT >= 31) {
                            dpm.addUserRestriction(adminComponent, RESTRICT_WIFI_STATE)
                        }
                        Log.d(TAG, "Wi-Fi user control disabled")
                        success = true
                    } else {
                        Log.w(TAG, "DisableWifi requires Device Owner")
                    }
                }

                "EnableWifi" -> {
                    if (isDeviceOwner) {
                        dpm.clearUserRestriction(adminComponent, RESTRICT_CONFIG_WIFI)
                        if (Build.VERSION.SDK_INT >= 31) {
                            dpm.clearUserRestriction(adminComponent, RESTRICT_WIFI_STATE)
                        }
                        Log.d(TAG, "Wi-Fi user control restored")
                        success = true
                    } else {
                        Log.w(TAG, "EnableWifi requires Device Owner")
                    }
                }

                // ── Bluetooth ────────────────────────────────────────────────
                // API 26+: disables Bluetooth entirely (no_bluetooth).
                // Pre-API 26: blocks settings access only (no_config_bluetooth).
                "DisableBluetooth" -> {
                    if (isDeviceOwner) {
                        val restriction = if (Build.VERSION.SDK_INT >= 26) RESTRICT_BLUETOOTH else RESTRICT_CONFIG_BT
                        dpm.addUserRestriction(adminComponent, restriction)
                        Log.d(TAG, "Bluetooth disabled (restriction=$restriction)")
                        success = true
                    } else {
                        Log.w(TAG, "DisableBluetooth requires Device Owner")
                    }
                }

                "EnableBluetooth" -> {
                    if (isDeviceOwner) {
                        val restriction = if (Build.VERSION.SDK_INT >= 26) RESTRICT_BLUETOOTH else RESTRICT_CONFIG_BT
                        dpm.clearUserRestriction(adminComponent, restriction)
                        Log.d(TAG, "Bluetooth enabled")
                        success = true
                    } else {
                        Log.w(TAG, "EnableBluetooth requires Device Owner")
                    }
                }

                // ── Password policy ──────────────────────────────────────────
                // Works for Device Admin. Policy takes effect on the user's next
                // password change (device will prompt if current password doesn't comply).
                // quality: SOMETHING | NUMERIC | NUMERIC_COMPLEX | ALPHABETIC | ALPHANUMERIC | COMPLEX
                "SetPasswordPolicy" -> {
                    val minLength = data["minLength"]?.toIntOrNull() ?: 4
                    val quality = when (data["quality"]?.uppercase()) {
                        "SOMETHING"       -> DevicePolicyManager.PASSWORD_QUALITY_SOMETHING
                        "NUMERIC"         -> DevicePolicyManager.PASSWORD_QUALITY_NUMERIC
                        "NUMERIC_COMPLEX" -> DevicePolicyManager.PASSWORD_QUALITY_NUMERIC_COMPLEX
                        "ALPHABETIC"      -> DevicePolicyManager.PASSWORD_QUALITY_ALPHABETIC
                        "ALPHANUMERIC"    -> DevicePolicyManager.PASSWORD_QUALITY_ALPHANUMERIC
                        "COMPLEX"         -> DevicePolicyManager.PASSWORD_QUALITY_COMPLEX
                        else              -> DevicePolicyManager.PASSWORD_QUALITY_NUMERIC
                    }
                    @Suppress("DEPRECATION")
                    dpm.setPasswordQuality(adminComponent, quality)
                    @Suppress("DEPRECATION")
                    dpm.setPasswordMinimumLength(adminComponent, minLength)
                    Log.d(TAG, "Password policy set: minLength=$minLength quality=${data["quality"]}")
                    success = true
                }

                // ── Web restrictions (Chrome managed config) ─────────────────
                // Applies URL block/allow lists to Chrome via setApplicationRestrictions.
                // blockedUrls / allowedUrls follow Chrome Enterprise URL filter syntax.
                // Each call replaces the previous policy entirely.
                "SetWebRestrictions" -> {
                    if (isDeviceOwner) {
                        val blockedJson = data["blockedUrls"] ?: "[]"
                        val allowedJson = data["allowedUrls"] ?: "[]"
                        try {
                            val blocked = JSONArray(blockedJson)
                            val allowed = JSONArray(allowedJson)
                            val bundle = Bundle().apply {
                                putStringArray("URLBlocklist",
                                    Array(blocked.length()) { blocked.getString(it) })
                                putStringArray("URLAllowlist",
                                    Array(allowed.length()) { allowed.getString(it) })
                            }
                            dpm.setApplicationRestrictions(adminComponent, "com.android.chrome", bundle)
                            Log.d(TAG, "Web restrictions applied: ${blocked.length()} blocked, ${allowed.length()} allowed")
                            success = true
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to apply web restrictions", e)
                        }
                    } else {
                        Log.w(TAG, "SetWebRestrictions requires Device Owner")
                    }
                }

                else -> Log.w(TAG, "Unknown command: $command")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException executing $command", e)
        }

        if (commandId.isNotBlank()) PolicyStore.markResult(this, commandId, success)
        reportStatus(commandId, success)
    }

    private fun reportStatus(commandId: String, success: Boolean) {
        if (commandId.isBlank()) {
            Log.d(TAG, "No commandId to report")
            return
        }
        val jwt = getSavedValue("device_jwt") ?: return
        val deviceId = getSavedValue("device_id") ?: run {
            Log.w(TAG, "No device_id saved, cannot report status")
            return
        }
        val baseUrl = getSavedValue("server_url") ?: determineBaseUrl()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resp = buildApi(baseUrl).reportCommandStatus(
                    auth = "Bearer $jwt",
                    deviceId = deviceId,
                    commandId = commandId,
                    req = ReportStatusRequest(success)
                )
                Log.d(TAG, "Status reported: commandId=$commandId success=$success -> HTTP ${resp.code()}")
                if (resp.isSuccessful || resp.code() == 404) {
                    PolicyStore.markAcknowledged(this@FCMService, commandId)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reporting command status — will retry via PolicySyncWorker", e)
            }
        }
    }

    private fun downloadAndInstall(url: String, packageName: String, commandId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d(TAG, "Downloading APK from $url")
                val response = OkHttpClient().newCall(Request.Builder().url(url).build()).execute()
                if (!response.isSuccessful) {
                    Log.e(TAG, "APK download failed: ${response.code}")
                    reportStatus(commandId, false)
                    return@launch
                }
                val apkFile = File(cacheDir, "temp.apk")
                FileOutputStream(apkFile).use {
                    it.write(response.body?.bytes() ?: run {
                        reportStatus(commandId, false)
                        return@launch
                    })
                }
                Log.d(TAG, "APK downloaded, starting installation")
                PackageInstallerHelper.installPackage(this@FCMService, apkFile, packageName)
                PolicyStore.markResult(this@FCMService, commandId, true)
                reportStatus(commandId, true)
            } catch (e: Exception) {
                Log.e(TAG, "Error during APK download/install", e)
                PolicyStore.markResult(this@FCMService, commandId, false)
                reportStatus(commandId, false)
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
