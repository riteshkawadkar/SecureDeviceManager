package com.example.sdmagent

import android.app.ActivityOptions
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import android.util.Log

/** Screen-off timeout while kiosk mode is active, milliseconds. */
private const val KIOSK_SCREEN_TIMEOUT_MS = "1800000" // 30 min
/** Screen-off timeout restored when kiosk mode is disabled, milliseconds. */
private const val DEFAULT_SCREEN_TIMEOUT_MS = "60000" // 1 min

/**
 * Single-app kiosk: one package is launched directly with lock task forced on.
 * Multi-app kiosk (more than one package): KioskHomeActivity is launched instead,
 * showing a picker grid of the allowed packages. LOCK_TASK_FEATURE_OVERVIEW is enabled
 * so Recents works within lock task — scoped only to the allowlisted tasks — letting
 * the user switch back to the picker without a floating button or any extra permission
 * (Device Owner apps cannot self-grant SYSTEM_ALERT_WINDOW; there is no public API for it).
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
        }
        dpm.setKeyguardDisabled(admin, false)
        try {
            dpm.setSystemSetting(admin, Settings.System.SCREEN_OFF_TIMEOUT, DEFAULT_SCREEN_TIMEOUT_MS)
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not restore screen timeout", e)
        }
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
        // Lift any enforced password policy so setKeyguardDisabled() below has a chance of
        // working — Android only allows disabling the keyguard when there is no secure lock
        // screen. Note this only stops a future credential from being *required*; if the user
        // already has a PIN/pattern set from an earlier SetPasswordPolicy command, this does
        // NOT remove it (no public Device Owner API can silently clear an existing credential
        // on modern Android) — that credential must be removed manually via device Settings.
        @Suppress("DEPRECATION")
        dpm.setPasswordQuality(admin, DevicePolicyManager.PASSWORD_QUALITY_UNSPECIFIED)
        @Suppress("DEPRECATION")
        dpm.setPasswordMinimumLength(admin, 0)

        // Own package must be allowlisted too — needed for KioskHomeActivity to remain
        // inside lock task in multi-app mode.
        val allowList = (packages + context.packageName).distinct()
        dpm.setLockTaskPackages(admin, allowList.toTypedArray())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // The platform rejects OVERVIEW without HOME (IllegalArgumentException). Enabling
            // HOME here is still safe: the real launcher isn't in the lock task allowlist, so
            // pressing Home is a no-op rather than an escape route — it only activates Overview.
            val features = if (packages.size > 1) {
                DevicePolicyManager.LOCK_TASK_FEATURE_HOME or DevicePolicyManager.LOCK_TASK_FEATURE_OVERVIEW
            } else {
                DevicePolicyManager.LOCK_TASK_FEATURE_NONE
            }
            dpm.setLockTaskFeatures(admin, features)
        }

        // Enter lock task before touching keyguard/screen settings — issuing those DPM
        // calls before the lock-task-enabled launch was observed to prevent lock task
        // from actually engaging (likely a keyguard state transition race).
        launchForeground(context, packages)

        // Without this, a screen-off/screen-on cycle can drop lock task back to the real
        // launcher instead of resuming the locked app (observed: Keyguard un-occluding
        // triggers a system-initiated HOME start that lock task does not survive).
        dpm.setKeyguardDisabled(admin, true)
        try {
            dpm.setSystemSetting(admin, Settings.System.SCREEN_OFF_TIMEOUT, KIOSK_SCREEN_TIMEOUT_MS)
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not extend screen timeout", e)
        }
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
