# SDM Android Agent

Reference Android MDM agent for SecureDeviceManager.

---

## Setup

1. Open `samples/android-agent/` in Android Studio.
2. Add your `google-services.json` (downloaded from Firebase Console → Project Settings → Your Apps) to `app/`.
3. Set the server URL in `app/src/main/assets/config.json`:
   ```json
   { "server": "http://<your-server-ip>:5254/" }
   ```
   - Emulator default: `http://10.0.2.2:5254/`
   - Real device or Azure VM: use the LAN IP or public IP

4. Build and install the APK on your device/emulator.

---

## Enrollment Flow

1. **Enable Device Admin** — tap "Enable Device Admin" in the app. This grants the agent permission to lock the screen. Device Owner (full MDM control) requires ADB provisioning.
2. **Scan QR code** — scan the enrollment QR from the admin portal, or open the deep link `sdm://enroll?token=<token>` manually. The app calls `POST /api/devices/register-with-token` with device details and the current FCM token.
3. **Enrolled** — the app saves the returned device JWT and device ID in `EncryptedSharedPreferences` and starts a background heartbeat job (every 15 minutes).

---

## Command Handling

Commands are delivered via Firebase Cloud Messaging (data messages). The `FCMService` receives them in `onMessageReceived`:

| Command | Requirement | Action |
|---------|-------------|--------|
| `LockScreen` | Device Admin | `DevicePolicyManager.lockNow()` |
| `DisableApp` | Device Owner | Hides app package |
| `EnableApp` | Device Owner | Shows app package |
| `LockApp` | Device Owner | Pins app via `setLockTaskPackages` |
| `InstallApp` | None | Downloads APK and installs silently |
| `WipeData` | Device Owner | Factory reset (disabled by default) |

After execution the agent reports success/failure to `POST /api/devices/{id}/commands/{commandId}/status`.

---

## Unenrolling

Tap **Unenroll Device** in the app. This:
1. Calls `DELETE /api/devices/{deviceId}` to remove the device from the backend.
2. Clears all locally stored credentials (`device_jwt`, `device_id`, `server_url`).
3. Cancels the background heartbeat WorkManager job.

The app returns to the unenrolled state and is ready for re-enrollment.

---

## Key Files

| File | Purpose |
|------|---------|
| `MainActivity.kt` | Enrollment UI, unenroll, heartbeat scheduling |
| `FCMService.kt` | Receives FCM commands, executes them, reports status |
| `HeartbeatWorker.kt` | WorkManager periodic job — sends battery + storage to backend |
| `AdminReceiver.kt` | `DeviceAdminReceiver` required for `lockNow()` |
| `assets/config.json` | Optional server URL override |
