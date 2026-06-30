package com.example.sdmagent

import android.content.Context
import android.content.pm.PackageManager
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

/**
 * Reports the device's installed-app inventory so the App Management catalog can show
 * what's actually on each device. Reads the full package list, which requires this app
 * to be running as Device Owner — same constraint as InstallApp/UninstallApp — since
 * Android 11+ package visibility otherwise hides most other apps from a regular app.
 */
class AppInventoryWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "AppInventoryWorker"
    }

    override suspend fun doWork(): Result {
        val jwt = getSavedValue("device_jwt") ?: run {
            Log.d(TAG, "No JWT, skipping app inventory report")
            return Result.success()
        }
        val deviceId = getSavedValue("device_id") ?: run {
            Log.d(TAG, "No device_id, skipping app inventory report")
            return Result.success()
        }
        val baseUrl = getSavedValue("server_url") ?: determineBaseUrl()

        return try {
            val apps = collectInstalledApps()

            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val api = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(OkHttpClient.Builder().addInterceptor(logging).build())
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(ApiService::class.java)

            val resp = api.reportInstalledApps("Bearer $jwt", deviceId, ReportInstalledAppsRequest(apps))
            if (resp.isSuccessful) {
                Log.d(TAG, "App inventory reported (${apps.size} apps)")
            } else {
                Log.w(TAG, "App inventory report failed: ${resp.code()}")
            }
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "App inventory report error", e)
            Result.retry()
        }
    }

    private fun collectInstalledApps(): List<InstalledAppItem> {
        val pm = applicationContext.packageManager
        @Suppress("DEPRECATION")
        val packages = pm.getInstalledPackages(0)
        return packages.map { pkg ->
            val appInfo = pkg.applicationInfo
            val isSystem = appInfo != null && (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
            InstalledAppItem(
                packageId = pkg.packageName,
                appName = appInfo?.let { pm.getApplicationLabel(it).toString() },
                versionName = pkg.versionName,
                versionCode = @Suppress("DEPRECATION") pkg.versionCode,
                isSystemApp = isSystem
            )
        }
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
