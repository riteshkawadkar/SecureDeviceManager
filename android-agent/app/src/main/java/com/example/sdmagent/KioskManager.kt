package com.example.sdmagent

import android.app.ActivityOptions
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log

/**
 * Single-app kiosk: one package is launched directly with lock task forced on.
 * Multi-app kiosk (more than one package): KioskHomeActivity is launched instead,
 * showing a picker grid of the allowed packages, and KioskOverlayService adds a
 * floating "Apps" button so the user can return to the picker (Home/Recents stay
 * disabled by lock task either way).
 */
object KioskManager {
    private const val TAG = "KioskManager"
    private const val PREFS = "sdm_kiosk_prefs"
    private const val KEY_ENABLED = "kiosk_enabled"
    private const val KEY_PACKAGES = "kiosk_packages"

    fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)

    fun getPackages(context: Context): List<String> =
        prefs(context).getString(KEY_PACKAGES, "")
            ?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()

    fun start(context: Context, dpm: DevicePolicyManager, admin: ComponentName, packages: List<String>) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, true)
            .putString(KEY_PACKAGES, packages.joinToString(","))
            .apply()

        applyAllowlistAndLaunch(context, dpm, admin, packages)
    }

    fun stop(context: Context, dpm: DevicePolicyManager, admin: ComponentName) {
        prefs(context).edit().putBoolean(KEY_ENABLED, false).remove(KEY_PACKAGES).apply()
        dpm.setLockTaskPackages(admin, emptyArray())
        KioskOverlayService.stop(context)
    }

    /** Called from BootReceiver — lock task state itself does not survive a reboot. */
    fun resumeAfterBoot(context: Context, dpm: DevicePolicyManager, admin: ComponentName) {
        if (!isEnabled(context)) return
        val packages = getPackages(context)
        if (packages.isEmpty()) return
        applyAllowlistAndLaunch(context, dpm, admin, packages)
    }

    private fun applyAllowlistAndLaunch(
        context: Context, dpm: DevicePolicyManager, admin: ComponentName, packages: List<String>
    ) {
        // Own package must be allowlisted too — needed for KioskHomeActivity and the
        // overlay's "Apps" button to remain inside lock task in multi-app mode.
        val allowList = (packages + context.packageName).distinct()
        dpm.setLockTaskPackages(admin, allowList.toTypedArray())

        launchForeground(context, packages)

        if (packages.size > 1) KioskOverlayService.start(context) else KioskOverlayService.stop(context)
    }

    private fun launchForeground(context: Context, packages: List<String>) {
        val intent = if (packages.size == 1) {
            context.packageManager.getLaunchIntentForPackage(packages[0])
        } else {
            Intent(context, KioskHomeActivity::class.java)
        }
        if (intent == null) {
            Log.w(TAG, "No launch intent resolvable for kiosk packages: $packages")
            return
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

        val options = ActivityOptions.makeBasic()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            options.setLockTaskEnabled(true)
        }
        // Device Owner apps are exempt from the background-activity-launch restriction,
        // so this works from a Service/Receiver context, not just a foreground Activity.
        context.startActivity(intent, options.toBundle())
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
