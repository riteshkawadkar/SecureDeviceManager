package com.example.sdmagent

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.card.MaterialCardView
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class PoliciesActivity : AppCompatActivity() {

    private lateinit var cardNoPolicies: MaterialCardView
    private lateinit var cardPasswordPolicySummary: MaterialCardView
    private lateinit var tvPasswordQuality: TextView
    private lateinit var tvPasswordMinLength: TextView
    private lateinit var cardWebRestrictionsSummary: MaterialCardView
    private lateinit var tvBlockedCount: TextView
    private lateinit var tvAllowedCount: TextView
    private lateinit var cardDeviceRestrictionsSummary: MaterialCardView
    private lateinit var tvCameraStatus: TextView
    private lateinit var tvWifiStatus: TextView
    private lateinit var tvBluetoothStatus: TextView
    private lateinit var tvUsbStatus: TextView
    private lateinit var tvHistoryHeader: TextView
    private lateinit var layoutHistoryContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_policies)

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }

        cardNoPolicies = findViewById(R.id.cardNoPolicies)
        cardPasswordPolicySummary = findViewById(R.id.cardPasswordPolicySummary)
        tvPasswordQuality = findViewById(R.id.tvPasswordQuality)
        tvPasswordMinLength = findViewById(R.id.tvPasswordMinLength)
        cardWebRestrictionsSummary = findViewById(R.id.cardWebRestrictionsSummary)
        tvBlockedCount = findViewById(R.id.tvBlockedCount)
        tvAllowedCount = findViewById(R.id.tvAllowedCount)
        cardDeviceRestrictionsSummary = findViewById(R.id.cardDeviceRestrictionsSummary)
        tvCameraStatus = findViewById(R.id.tvCameraStatus)
        tvWifiStatus = findViewById(R.id.tvWifiStatus)
        tvBluetoothStatus = findViewById(R.id.tvBluetoothStatus)
        tvUsbStatus = findViewById(R.id.tvUsbStatus)
        tvHistoryHeader = findViewById(R.id.tvHistoryHeader)
        layoutHistoryContainer = findViewById(R.id.layoutHistoryContainer)
    }

    override fun onResume() {
        super.onResume()
        populatePolicies()
    }

    private fun populatePolicies() {
        val all = PolicyStore.getAll(this)

        if (all.isEmpty()) {
            cardNoPolicies.visibility = View.VISIBLE
            cardPasswordPolicySummary.visibility = View.GONE
            cardWebRestrictionsSummary.visibility = View.GONE
            cardDeviceRestrictionsSummary.visibility = View.GONE
            tvHistoryHeader.visibility = View.GONE
            layoutHistoryContainer.removeAllViews()
            return
        }

        cardNoPolicies.visibility = View.GONE

        val successful = all.filter { it.success }

        // Password Policy
        val pwRecord = successful.firstOrNull { it.commandType == "SetPasswordPolicy" }
        if (pwRecord != null) {
            cardPasswordPolicySummary.visibility = View.VISIBLE
            val data = parsePayload(pwRecord.payload)
            tvPasswordQuality.text = data.optString("quality", "Numeric").uppercase()
            tvPasswordMinLength.text = data.optString("minLength", "—")
        } else {
            cardPasswordPolicySummary.visibility = View.GONE
        }

        // Web Restrictions
        val webRecord = successful.firstOrNull { it.commandType == "SetWebRestrictions" }
        if (webRecord != null) {
            cardWebRestrictionsSummary.visibility = View.VISIBLE
            val data = parsePayload(webRecord.payload)
            tvBlockedCount.text = try { JSONArray(data.optString("blockedUrls", "[]")).length().toString() } catch (e: Exception) { "0" }
            tvAllowedCount.text = try { JSONArray(data.optString("allowedUrls", "[]")).length().toString() } catch (e: Exception) { "0" }
        } else {
            cardWebRestrictionsSummary.visibility = View.GONE
        }

        // Device Restrictions — derive last known state per restriction type
        val restrictionCommands = setOf(
            "DisableCamera", "EnableCamera", "DisableWifi", "EnableWifi",
            "DisableBluetooth", "EnableBluetooth", "BlockUsb", "UnblockUsb"
        )
        val hasRestrictions = successful.any { it.commandType in restrictionCommands }
        if (hasRestrictions) {
            cardDeviceRestrictionsSummary.visibility = View.VISIBLE
            applyRestrictionStatus(tvCameraStatus, successful, "DisableCamera", "EnableCamera", "Disabled", "Enabled")
            applyRestrictionStatus(tvWifiStatus, successful, "DisableWifi", "EnableWifi", "Restricted", "Unrestricted")
            applyRestrictionStatus(tvBluetoothStatus, successful, "DisableBluetooth", "EnableBluetooth", "Restricted", "Unrestricted")
            applyRestrictionStatus(tvUsbStatus, successful, "BlockUsb", "UnblockUsb", "Blocked", "Allowed")
        } else {
            cardDeviceRestrictionsSummary.visibility = View.GONE
        }

        // History list
        tvHistoryHeader.visibility = View.VISIBLE
        layoutHistoryContainer.removeAllViews()
        all.forEach { record ->
            val row = LayoutInflater.from(this).inflate(R.layout.item_policy_row, layoutHistoryContainer, false)
            bindRow(row, record)
            layoutHistoryContainer.addView(row)
        }
    }

    private fun applyRestrictionStatus(
        tv: TextView,
        records: List<PolicyRecord>,
        disableType: String,
        enableType: String,
        disabledLabel: String,
        enabledLabel: String
    ) {
        // Records are newest-first; first match is the most recent state
        val last = records.firstOrNull { it.commandType == disableType || it.commandType == enableType }
        if (last == null) {
            tv.text = "No policy"
            tv.setTextColor(Color.parseColor("#9CA3AF"))
        } else if (last.commandType == disableType) {
            tv.text = disabledLabel
            tv.setTextColor(Color.parseColor("#DC2626"))
        } else {
            tv.text = enabledLabel
            tv.setTextColor(Color.parseColor("#16A34A"))
        }
    }

    private fun bindRow(view: View, record: PolicyRecord) {
        view.findViewById<TextView>(R.id.tvCommandName).text = commandDisplayName(record.commandType)
        view.findViewById<TextView>(R.id.tvAppliedAt).text = formatDate(record.appliedAt)

        val tvSuccess = view.findViewById<TextView>(R.id.tvSuccessStatus)
        if (record.success) {
            tvSuccess.text = "✓ Applied"
            tvSuccess.setTextColor(Color.parseColor("#16A34A"))
        } else {
            tvSuccess.text = "✗ Failed"
            tvSuccess.setTextColor(Color.parseColor("#DC2626"))
        }

        val tvAck = view.findViewById<TextView>(R.id.tvAckStatus)
        if (record.acknowledged) {
            tvAck.text = "Synced"
            tvAck.setTextColor(Color.parseColor("#9CA3AF"))
        } else {
            tvAck.text = "⏳ Pending sync"
            tvAck.setTextColor(Color.parseColor("#D97706"))
        }

        val (iconRes, bgRes) = commandIcon(record.commandType)
        view.findViewById<ImageView>(R.id.ivCommandIcon).setImageResource(iconRes)
        view.findViewById<FrameLayout>(R.id.fvIconBg).setBackgroundResource(bgRes)
    }

    private fun commandIcon(type: String): Pair<Int, Int> = when {
        type.contains("Password", ignoreCase = true) -> R.drawable.ic_key to R.drawable.icon_bg_blue
        type.contains("Web", ignoreCase = true) -> R.drawable.ic_help to R.drawable.icon_bg_blue
        type.contains("Camera", ignoreCase = true) -> R.drawable.ic_camera to R.drawable.icon_bg_blue
        type == "WipeData" -> R.drawable.ic_link_off to R.drawable.icon_bg_red
        type.startsWith("Disable") || type.startsWith("Block") || type == "LockScreen" || type == "LockApp" ->
            R.drawable.ic_shield_check to R.drawable.icon_bg_red
        type.startsWith("Enable") || type.startsWith("Unblock") ->
            R.drawable.ic_check_circle to R.drawable.icon_bg_blue
        else -> R.drawable.ic_shield to R.drawable.icon_bg_gray
    }

    private fun commandDisplayName(type: String) = when (type) {
        "SetPasswordPolicy" -> "Password Policy"
        "SetWebRestrictions" -> "Web Restrictions"
        "DisableCamera" -> "Camera Disabled"
        "EnableCamera" -> "Camera Enabled"
        "DisableWifi" -> "WiFi Control Disabled"
        "EnableWifi" -> "WiFi Control Enabled"
        "DisableBluetooth" -> "Bluetooth Disabled"
        "EnableBluetooth" -> "Bluetooth Enabled"
        "BlockUsb" -> "USB Transfer Blocked"
        "UnblockUsb" -> "USB Transfer Allowed"
        "LockScreen" -> "Screen Lock"
        "WipeData" -> "Factory Reset"
        "DisableApp" -> "App Disabled"
        "EnableApp" -> "App Enabled"
        "InstallApp" -> "App Installed"
        "LockApp", "EnableKiosk" -> "Kiosk Mode Enabled"
        "DisableKiosk" -> "Kiosk Mode Disabled"
        "DisableAppInstall" -> "App Install Blocked"
        "EnableAppInstall" -> "App Install Allowed"
        else -> type
    }

    private fun parsePayload(raw: String): JSONObject = try { JSONObject(raw) } catch (e: Exception) { JSONObject() }

    private fun formatDate(isoDate: String): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = sdf.parse(isoDate) ?: return isoDate
            SimpleDateFormat("MMM dd, h:mm a", Locale.US).format(date)
        } catch (e: Exception) {
            isoDate
        }
    }
}
