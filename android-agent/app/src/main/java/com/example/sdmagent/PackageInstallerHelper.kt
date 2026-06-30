package com.example.sdmagent

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

object PackageInstallerHelper {

    fun uninstallPackage(context: Context, packageName: String) {
        val packageInstaller = context.packageManager.packageInstaller
        try {
            val intent = Intent(context, InstallReceiver::class.java)
            intent.action = "com.example.sdmagent.UNINSTALL_COMPLETE"
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                packageName.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            packageInstaller.uninstall(packageName, pendingIntent.intentSender)
            Log.d("PackageInstaller", "Uninstall requested for $packageName")
        } catch (e: Exception) {
            Log.e("PackageInstaller", "Error uninstalling package $packageName", e)
        }
    }

    fun installPackage(context: Context, apkFile: File, packageName: String) {
        val packageInstaller = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(packageName)

        var sessionId = -1
        try {
            sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)
            
            val out = session.openWrite(packageName, 0, -1)
            val input: InputStream = FileInputStream(apkFile)
            val buffer = ByteArray(65536)
            var n: Int
            while (input.read(buffer).also { n = it } > 0) {
                out.write(buffer, 0, n)
            }
            session.fsync(out)
            input.close()
            out.close()

            val intent = Intent(context, InstallReceiver::class.java)
            intent.action = "com.example.sdmagent.INSTALL_COMPLETE"
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                sessionId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            session.commit(pendingIntent.intentSender)
            session.close()
            Log.d("PackageInstaller", "Install session committed for $packageName")
        } catch (e: Exception) {
            if (sessionId != -1) packageInstaller.abandonSession(sessionId)
            Log.e("PackageInstaller", "Error installing package", e)
        }
    }
}
