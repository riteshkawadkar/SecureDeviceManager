package com.example.sdmagent

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button

/**
 * Floating "Apps" button shown only in multi-app kiosk mode, since lock task disables
 * Home/Recents — without this the user would have no way back to KioskHomeActivity once
 * they switch into one of the allowed apps. Device Owner apps are auto-granted
 * SYSTEM_ALERT_WINDOW, so no runtime permission prompt is required.
 */
class KioskOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var button: Button? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.END
            x = 24
            y = 96
        }

        button = Button(this).apply {
            text = "Apps"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#CC2962FF"))
            setOnClickListener {
                startActivity(
                    Intent(this@KioskOverlayService, KioskHomeActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
        windowManager?.addView(button, params)
    }

    override fun onDestroy() {
        super.onDestroy()
        button?.let { windowManager?.removeView(it) }
        button = null
    }

    companion object {
        fun start(context: Context) {
            context.startService(Intent(context, KioskOverlayService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, KioskOverlayService::class.java))
        }
    }
}
