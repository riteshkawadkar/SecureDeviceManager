package com.example.sdmagent

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.Gravity
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Multi-app kiosk "home screen". Launched by KioskManager instead of a single target
 * app whenever EnableKiosk is given more than one package. Its own package is included
 * in setLockTaskPackages, so it (and switching to/from it) stays inside lock task.
 */
class KioskHomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val packages = KioskManager.getPackages(this)
        val pm = packageManager

        val grid = GridLayout(this).apply {
            columnCount = 3
            setPadding(32, 96, 32, 32)
        }

        for (pkg in packages) {
            val appInfo = try {
                pm.getApplicationInfo(pkg, 0)
            } catch (e: PackageManager.NameNotFoundException) {
                null
            }
            val label = appInfo?.let { pm.getApplicationLabel(it).toString() } ?: pkg
            val icon = appInfo?.let { pm.getApplicationIcon(it) }

            val tile = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(24, 24, 24, 24)
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    pm.getLaunchIntentForPackage(pkg)?.let { launchIntent ->
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(launchIntent)
                    }
                }
            }
            if (icon != null) {
                tile.addView(ImageView(this).apply {
                    setImageDrawable(icon)
                    layoutParams = LinearLayout.LayoutParams(160, 160)
                })
            }
            tile.addView(TextView(this).apply {
                text = label
                gravity = Gravity.CENTER
                setPadding(0, 12, 0, 0)
            })

            val params = GridLayout.LayoutParams().apply {
                width = 0
                height = GridLayout.LayoutParams.WRAP_CONTENT
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
                setMargins(16, 16, 16, 16)
            }
            grid.addView(tile, params)
        }

        setContentView(ScrollView(this).apply { addView(grid) })
    }

    // This is the kiosk home — there is nothing "behind" it to back out to.
    @Suppress("MissingSuperCall")
    override fun onBackPressed() { }
}
