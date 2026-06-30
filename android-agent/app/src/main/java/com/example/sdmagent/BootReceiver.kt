package com.example.sdmagent

import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Re-enters kiosk lock task after a reboot — Android persists the setLockTaskPackages
 * allowlist, but not the "currently in lock task" state itself, so the pinned app must
 * be relaunched with lock task forced on every boot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!KioskManager.isEnabled(context)) return

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, AdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            Log.w("BootReceiver", "Not Device Owner, cannot resume kiosk mode after boot")
            return
        }
        KioskManager.resumeAfterBoot(context, dpm, admin)
    }
}
