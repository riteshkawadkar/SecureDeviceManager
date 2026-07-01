package com.example.sdmagent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import android.widget.Toast

class InstallReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_COMMAND_ID = "command_id"
        const val EXTRA_PACKAGE_NAME_KEY = "package_name_key"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        val systemPkg = intent.getStringExtra(PackageInstaller.EXTRA_PACKAGE_NAME)
        val commandId = intent.getStringExtra(EXTRA_COMMAND_ID) ?: ""
        val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME_KEY) ?: systemPkg ?: "unknown"
        val isInstall = intent.action == "com.example.sdmagent.INSTALL_COMPLETE"

        when (status) {
            PackageInstaller.STATUS_SUCCESS -> {
                val label = if (isInstall) "installed" else "uninstalled"
                Log.d("InstallReceiver", "$label succeeded for $packageName")
                Toast.makeText(context, "$label: $packageName", Toast.LENGTH_SHORT).show()
                if (commandId.isNotBlank()) {
                    CommandExecutor(context).reportStatus(commandId, true)
                }
            }
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                // System needs user to confirm — launch the system installer UI
                val confirmIntent = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                confirmIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (confirmIntent != null) context.startActivity(confirmIntent)
                // Don't report status yet — wait for user action result (STATUS_SUCCESS / FAILURE)
            }
            else -> {
                val label = if (isInstall) "Install" else "Uninstall"
                Log.e("InstallReceiver", "$label failed for $packageName: $msg (status=$status)")
                Toast.makeText(context, "$label failed: $msg", Toast.LENGTH_LONG).show()
                if (commandId.isNotBlank()) {
                    CommandExecutor(context).reportStatus(commandId, false)
                }
            }
        }
    }
}
