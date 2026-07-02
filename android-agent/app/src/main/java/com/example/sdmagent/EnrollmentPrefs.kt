package com.example.sdmagent

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Reads/writes the "sdm_prefs" EncryptedSharedPreferences. Each Android user/profile
 * (personal vs. work profile) has its own copy of app storage, so a Work Profile's
 * AdminReceiver cannot see prefs saved by MainActivity running in the personal profile —
 * callers crossing that boundary must pass values explicitly (see the provisioning
 * admin-extras bundle in MainActivity.triggerWorkProfileProvisioning).
 */
object EnrollmentPrefs {
    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        "sdm_prefs", MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC), context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun get(context: Context, key: String): String? {
        return try { prefs(context).getString(key, null) } catch (e: Exception) { null }
    }

    fun save(context: Context, jwt: String, deviceId: String, serverUrl: String) {
        prefs(context).edit()
            .putString("device_jwt", jwt)
            .putString("device_id", deviceId)
            .putString("server_url", serverUrl)
            .apply()
    }
}
