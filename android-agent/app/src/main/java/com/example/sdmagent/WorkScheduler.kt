package com.example.sdmagent

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Registers the periodic background workers. Shared by MainActivity (personal-profile /
 * Device Owner enrollment) and AdminReceiver.onProfileProvisioningComplete (Work Profile /
 * Profile Owner enrollment, where there is no foreground Activity to call scheduleHeartbeat).
 */
object WorkScheduler {
    fun scheduleAll(context: Context) {
        val networkConstraint = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val wm = WorkManager.getInstance(context)

        wm.enqueueUniquePeriodicWork(
            "sdm_heartbeat",
            ExistingPeriodicWorkPolicy.UPDATE,
            PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
        wm.enqueueUniquePeriodicWork(
            "sdm_policy_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<PolicySyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
        wm.enqueueUniquePeriodicWork(
            "sdm_app_inventory",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<AppInventoryWorker>(6, TimeUnit.HOURS)
                .setConstraints(networkConstraint)
                .build()
        )
        wm.enqueueUniquePeriodicWork(
            "sdm_command_poll",
            ExistingPeriodicWorkPolicy.UPDATE,
            PeriodicWorkRequestBuilder<CommandPollingWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
    }
}
