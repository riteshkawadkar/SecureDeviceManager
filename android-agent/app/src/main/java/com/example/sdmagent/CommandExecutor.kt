package com.example.sdmagent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
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

class CommandExecutor(private val context: Context) {

    companion object {
        private const val TAG = "CommandExecutor"
        private const val ALERT_CHANNEL_ID = "sdm_alerts"
        private const val ALERT_NOTIFICATION_ID = 9001

        private const val RESTRICT_USB          = "no_usb_file_transfer"
        private const val RESTRICT_INSTALL_APPS = "no_install_apps"
        private const val RESTRICT_CONFIG_WIFI  = "no_config_wifi"
        private const val RESTRICT_WIFI_STATE   = "no_change_wifi_state"
        private const val RESTRICT_BLUETOOTH    = "no_bluetooth"
        private const val RESTRICT_CONFIG_BT    = "no_config_bluetooth"
    }

    fun execute(command: String, data: Map<String, String>) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, AdminReceiver::class.java)

        val commandId = try {
            val payloadJson = data["payload"]
            if (!payloadJson.isNullOrBlank()) JSONObject(payloadJson).optString("commandId", "") else ""
        } catch (e: Exception) {
            Log.w(TAG, "Could not parse commandId from payload", e)
            ""
        }

        val payloadForStore = try {
            JSONObject().apply { data.forEach { (k, v) -> put(k, v) } }.toString()
        } catch (e: Exception) { "" }

        val isoNow = run {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            sdf.format(java.util.Date())
        }

        if (commandId.isNotBlank()) {
            PolicyStore.upsert(context, PolicyRecord(
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

        val isDeviceOwner = dpm.isDeviceOwnerApp(context.packageName)

        var success = false
        try {
            when (command) {

                "LockDevice", "LockScreen", "force-lock" -> {
                    dpm.lockNow()
                    Log.d(TAG, "Screen locked")
                    success = true
                }

                "WipeData", "wipe-data" -> {
                    Log.d(TAG, "WipeData received (disabled for safety)")
                    success = true
                }

                "Reboot" -> {
                    if (isDeviceOwner) {
                        dpm.reboot(adminComponent)
                        Log.d(TAG, "Reboot requested")
                        success = true
                    } else {
                        Log.w(TAG, "Reboot requires Device Owner")
                    }
                }

                "SendAlert" -> {
                    val message = data["message"]?.takeIf { it.isNotBlank() } ?: "Alert from IT administrator"
                    if (isDeviceOwner) {
                        try {
                            dpm.setPermissionGrantState(
                                adminComponent, context.packageName,
                                android.Manifest.permission.POST_NOTIFICATIONS,
                                DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                            )
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not auto-grant POST_NOTIFICATIONS", e)
                        }
                    }
                    showAlertNotification(message, commandId)
                    Log.d(TAG, "Alert shown: $message")
                    success = true
                }

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

                "UninstallApp", "uninstall-app" -> {
                    val pkg = data["packageName"]
                    if (pkg != null) {
                        PackageInstallerHelper.uninstallPackage(context, pkg)
                        Log.d(TAG, "Uninstall requested: $pkg")
                        success = true
                    } else {
                        Log.w(TAG, "UninstallApp missing packageName")
                    }
                }

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

                "LockApp", "lock-app", "EnableKiosk" -> {
                    val pkgRaw = data["packageName"]
                    val pkgs = pkgRaw?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.distinct()
                        ?: emptyList()
                    if (pkgs.isNotEmpty() && isDeviceOwner) {
                        KioskManager.start(context, dpm, adminComponent, pkgs)
                        Log.d(TAG, "Kiosk mode enabled for: $pkgs")
                        success = true
                    } else {
                        Log.w(TAG, "EnableKiosk requires Device Owner and at least one package. pkg=$pkgRaw")
                    }
                }

                "DisableKiosk" -> {
                    if (isDeviceOwner) {
                        KioskManager.stop(context, dpm, adminComponent)
                        Log.d(TAG, "Kiosk mode disabled")
                        success = true
                    } else {
                        Log.w(TAG, "DisableKiosk requires Device Owner")
                    }
                }

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

                "SetUserRestriction" -> {
                    val restriction = data["restriction"]
                    val enabled = data["enabled"]?.toBoolean() ?: true
                    if (restriction != null && isDeviceOwner) {
                        if (enabled) dpm.addUserRestriction(adminComponent, restriction)
                        else dpm.clearUserRestriction(adminComponent, restriction)
                        Log.d(TAG, "User restriction ${if (enabled) "applied" else "lifted"}: $restriction")
                        success = true
                    } else {
                        Log.w(TAG, "SetUserRestriction requires Device Owner and a restriction key. restriction=$restriction")
                    }
                }

                else -> Log.w(TAG, "Unknown command: $command")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException executing $command", e)
        }

        if (commandId.isNotBlank()) PolicyStore.markResult(context, commandId, success)
        reportStatus(commandId, success)
    }

    private fun showAlertNotification(message: String, commandId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(ALERT_CHANNEL_ID, "IT Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Messages pushed by the MDM administrator"
                }
            )
        }

        val ackIntent = Intent(context, AlertAckReceiver::class.java).apply {
            putExtra(AlertAckReceiver.EXTRA_COMMAND_ID, commandId)
            putExtra(AlertAckReceiver.EXTRA_NOTIFICATION_ID, ALERT_NOTIFICATION_ID)
        }
        val ackPendingIntent = PendingIntent.getBroadcast(
            context, ALERT_NOTIFICATION_ID, ackIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_bell)
            .setContentTitle("Message from IT Administrator")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(ackPendingIntent)
            .addAction(R.drawable.ic_check_circle, "Mark as Read", ackPendingIntent)
            .build()
        NotificationManagerCompat.from(context).notify(ALERT_NOTIFICATION_ID, notification)
    }

    fun reportStatus(commandId: String, success: Boolean) {
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
                    PolicyStore.markAcknowledged(context, commandId)
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
                val apkFile = File(context.cacheDir, "temp.apk")
                FileOutputStream(apkFile).use {
                    it.write(response.body?.bytes() ?: run {
                        reportStatus(commandId, false)
                        return@launch
                    })
                }
                Log.d(TAG, "APK downloaded, starting installation")
                PackageInstallerHelper.installPackage(context, apkFile, packageName)
                PolicyStore.markResult(context, commandId, true)
                reportStatus(commandId, true)
            } catch (e: Exception) {
                Log.e(TAG, "Error during APK download/install", e)
                PolicyStore.markResult(context, commandId, false)
                reportStatus(commandId, false)
            }
        }
    }

    fun getSavedValue(key: String): String? {
        return try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "sdm_prefs", masterKeyAlias, context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            ).getString(key, null)
        } catch (e: Exception) { null }
    }

    fun determineBaseUrl(): String {
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

    fun buildApi(baseUrl: String): ApiService {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(OkHttpClient.Builder().addInterceptor(logging).build())
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
