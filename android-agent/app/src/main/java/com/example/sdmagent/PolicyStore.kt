package com.example.sdmagent

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import org.json.JSONArray
import org.json.JSONObject

data class PolicyRecord(
    val commandId: String,
    val commandType: String,
    val payload: String,
    val appliedAt: String,
    val success: Boolean,
    val acknowledged: Boolean
)

object PolicyStore {

    private const val PREFS_KEY = "applied_policies"

    fun upsert(context: Context, record: PolicyRecord) {
        val prefs = getPrefs(context)
        val list = loadList(prefs).toMutableList()
        val idx = list.indexOfFirst { it.commandId == record.commandId }
        if (idx >= 0) list[idx] = record else list.add(0, record)
        saveList(prefs, list)
    }

    fun markResult(context: Context, commandId: String, success: Boolean) {
        val prefs = getPrefs(context)
        val updated = loadList(prefs).map {
            if (it.commandId == commandId) it.copy(success = success) else it
        }
        saveList(prefs, updated)
    }

    fun markAcknowledged(context: Context, commandId: String) {
        val prefs = getPrefs(context)
        val updated = loadList(prefs).map {
            if (it.commandId == commandId) it.copy(acknowledged = true) else it
        }
        saveList(prefs, updated)
    }

    fun getPending(context: Context): List<PolicyRecord> =
        loadList(getPrefs(context)).filter { !it.acknowledged }

    fun getAll(context: Context): List<PolicyRecord> =
        loadList(getPrefs(context))

    private fun saveList(prefs: SharedPreferences, list: List<PolicyRecord>) {
        val arr = JSONArray()
        list.forEach { arr.put(toJson(it)) }
        prefs.edit().putString(PREFS_KEY, arr.toString()).apply()
    }

    private fun loadList(prefs: SharedPreferences): List<PolicyRecord> {
        val json = prefs.getString(PREFS_KEY, null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            List(arr.length()) { fromJson(arr.getJSONObject(it)) }
        } catch (e: Exception) { emptyList() }
    }

    private fun toJson(r: PolicyRecord) = JSONObject().apply {
        put("commandId", r.commandId)
        put("commandType", r.commandType)
        put("payload", r.payload)
        put("appliedAt", r.appliedAt)
        put("success", r.success)
        put("acknowledged", r.acknowledged)
    }

    private fun fromJson(o: JSONObject) = PolicyRecord(
        commandId = o.optString("commandId", ""),
        commandType = o.optString("commandType", ""),
        payload = o.optString("payload", ""),
        appliedAt = o.optString("appliedAt", ""),
        success = o.optBoolean("success", false),
        acknowledged = o.optBoolean("acknowledged", false)
    )

    private fun getPrefs(context: Context): SharedPreferences {
        return try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "sdm_prefs", masterKeyAlias, context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            context.getSharedPreferences("sdm_policy_fallback", Context.MODE_PRIVATE)
        }
    }
}
