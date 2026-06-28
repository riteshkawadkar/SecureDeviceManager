# SDM Command Testing Guide

End-to-end guide for testing every MDM command via the Admin API and verifying execution on the Android agent.

## Prerequisites

- Backend API running (`dotnet run` from `src/backend/SDM/SDM.API/`)
- Android agent installed on a device or emulator with **Device Admin** (and optionally **Device Owner**) granted
- Swagger UI: `http://localhost:5254/swagger` (or `http://40.81.231.1:5254/swagger` for the VM)

---

## Setup

### 1. Authenticate as Admin

```
POST /api/auth/login
{
  "email": "admin@sdm.local",
  "password": "<your-admin-password>"
}
```

Copy the `token` from the response. Use it as `Bearer <token>` in all admin requests below.

### 2. Find your Device ID

After enrolling the device via QR or deep link, find its ID:

```
GET /api/devices
Authorization: Bearer <token>
```

Copy the device `id` (UUID). Used as `{deviceId}` in all command URLs below.

---

## Sending a Command

All commands use the same endpoint:

```
POST /api/devices/{deviceId}/commands
Authorization: Bearer <token>
Content-Type: application/json

{
  "commandType": "<command>",
  "payload": { ... }
}
```

The backend saves the command, pushes it via FCM, and retries every minute (up to 5 times) if FCM fails.

Check command status via:
```
GET /api/devices/{deviceId}/commands
Authorization: Bearer <token>
```

Status values: `Pending` → `Sent` → `Executed` or `Failed`.

---

## Commands

Commands are grouped by the Android permission they require.

> **Device Admin** — granted by the user via *Settings > Security > Device Admins* or the in-app "Request Admin Permission" button. Required for all commands.
>
> **Device Owner** — set via `adb shell dpm set-device-owner com.example.sdmagent/.AdminReceiver`. Required for restriction commands.

---

### Lock Screen
**Requires:** Device Admin

Immediately locks the screen (requires the user to authenticate to unlock).

```json
{
  "commandType": "LockScreen",
  "payload": {}
}
```

**Verify:** Screen turns off and lock screen appears immediately.
**Policies screen:** Shows "Screen Lock — ✓ Applied".

---

### Set Password Policy
**Requires:** Device Admin

Enforces a minimum password quality. Takes effect on the user's next password change; Android prompts if the current password doesn't comply.

```json
{
  "commandType": "SetPasswordPolicy",
  "payload": {
    "quality": "ALPHANUMERIC",
    "minLength": 8
  }
}
```

**`quality` values:**

| Value | Meaning |
|---|---|
| `SOMETHING` | Any password (PIN, pattern, or password) |
| `NUMERIC` | Numbers only |
| `NUMERIC_COMPLEX` | No repeating/sequential sequences |
| `ALPHABETIC` | Letters only |
| `ALPHANUMERIC` | Letters and numbers |
| `COMPLEX` | At least one letter, one digit, one symbol |

**Verify:** Go to *Settings > Security > Screen lock*; Android warns if current password doesn't meet the new policy.
**Policies screen:** Password Policy card shows quality and minimum length.

---

### Disable Camera
**Requires:** Device Admin

```json
{
  "commandType": "DisableCamera",
  "payload": {}
}
```

**Verify:** Camera app shows "Camera disabled by administrator".
**Policies screen:** Device Restrictions card → Camera: **Disabled**.

---

### Enable Camera
**Requires:** Device Admin

```json
{
  "commandType": "EnableCamera",
  "payload": {}
}
```

**Verify:** Camera app works again.
**Policies screen:** Device Restrictions card → Camera: **Enabled**.

---

### Disable Wi-Fi Control
**Requires:** Device Owner

Prevents the user from changing Wi-Fi settings or toggling the radio. On Android 12+ also blocks the Quick Settings toggle.

```json
{
  "commandType": "DisableWifi",
  "payload": {}
}
```

**Verify:** Wi-Fi toggle in Quick Settings is greyed out.
**Policies screen:** Device Restrictions card → Wi-Fi: **Restricted**.

---

### Enable Wi-Fi Control
**Requires:** Device Owner

```json
{
  "commandType": "EnableWifi",
  "payload": {}
}
```

**Verify:** Wi-Fi toggle works again.

---

### Disable Bluetooth
**Requires:** Device Owner

On Android 8+, disables Bluetooth entirely. On earlier versions, blocks access to Bluetooth settings.

```json
{
  "commandType": "DisableBluetooth",
  "payload": {}
}
```

**Verify:** Bluetooth toggle is greyed out or Bluetooth is forced off.
**Policies screen:** Device Restrictions card → Bluetooth: **Restricted**.

---

### Enable Bluetooth
**Requires:** Device Owner

```json
{
  "commandType": "EnableBluetooth",
  "payload": {}
}
```

---

### Block USB File Transfer
**Requires:** Device Owner

Prevents USB file transfer (MTP/PTP). USB charging is unaffected.

```json
{
  "commandType": "BlockUsb",
  "payload": {}
}
```

**Verify:** Plug in USB; file transfer mode is unavailable.
**Policies screen:** Device Restrictions card → USB: **Blocked**.

---

### Unblock USB File Transfer
**Requires:** Device Owner

```json
{
  "commandType": "UnblockUsb",
  "payload": {}
}
```

---

### Set Web Restrictions
**Requires:** Device Owner

Applies URL block/allow lists to Chrome via managed configuration. Each call replaces the previous policy entirely. Uses [Chrome Enterprise URL filter syntax](https://chromeenterprise.google/policies/url-patterns/).

```json
{
  "commandType": "SetWebRestrictions",
  "payload": {
    "blockedUrls": ["*.facebook.com", "*.twitter.com", "*.instagram.com"],
    "allowedUrls": ["corporate-intranet.example.com"]
  }
}
```

**Verify:** Open Chrome and navigate to a blocked URL; Chrome shows "This site has been blocked".
**Policies screen:** Web Restrictions card shows blocked and allowed URL counts.

To clear all restrictions:
```json
{
  "commandType": "SetWebRestrictions",
  "payload": {
    "blockedUrls": [],
    "allowedUrls": []
  }
}
```

---

### Disable App
**Requires:** Device Owner

Hides an app from the launcher and prevents it from running.

```json
{
  "commandType": "DisableApp",
  "payload": {
    "packageName": "com.example.targetapp"
  }
}
```

**Verify:** App disappears from launcher; launching via intent also fails.

---

### Enable App
**Requires:** Device Owner

Restores a previously hidden app.

```json
{
  "commandType": "EnableApp",
  "payload": {
    "packageName": "com.example.targetapp"
  }
}
```

---

### Block App Installation
**Requires:** Device Owner

Prevents the user from installing new apps from any source.

```json
{
  "commandType": "DisableAppInstall",
  "payload": {}
}
```

**Verify:** Play Store shows "Installation blocked by administrator".

---

### Allow App Installation
**Requires:** Device Owner

```json
{
  "commandType": "EnableAppInstall",
  "payload": {}
}
```

---

### Enable Kiosk Mode
**Requires:** Device Owner

Pins a single app to the foreground (task lock). The user cannot leave the app or access the home screen.

```json
{
  "commandType": "EnableKiosk",
  "payload": {
    "packageName": "com.example.kioskapp"
  }
}
```

**Verify:** The target app is pinned — Back and Home buttons are disabled.

---

### Disable Kiosk Mode
**Requires:** Device Owner

Clears all task-lock packages, restoring normal navigation.

```json
{
  "commandType": "DisableKiosk",
  "payload": {}
}
```

---

### Install App (Silent)
**Requires:** Device Owner

Downloads an APK from a URL and installs it silently (no user prompt).

```json
{
  "commandType": "InstallApp",
  "payload": {
    "packageName": "com.example.newapp",
    "url": "https://example.com/releases/app-v1.0.apk"
  }
}
```

**Note:** The APK must be hosted on an HTTPS URL accessible from the device. The package name must match the APK's manifest.

---

### Wipe Device
**Requires:** Device Admin

> **WARNING:** This triggers a factory reset. The command is intentionally disabled in the current agent build (it logs but does not execute). To enable it, uncomment `dpm.wipeData(0)` in `FCMService.kt`.

```json
{
  "commandType": "WipeData",
  "payload": {}
}
```

---

## Verifying on Device

After sending any command:

1. **Logcat** (most reliable) — filter by `FCMService`:
   ```
   adb logcat -s FCMService
   ```
   Look for:
   - `Processing command: <CommandType>` — FCM arrived
   - `Screen locked` / `Camera disabled` / etc. — executed
   - `Device Admin not active` — need to re-grant admin
   - `requires Device Owner` — need to set device owner via adb

2. **Policies screen in app** — tap "View policies →" on the main screen to see history with success/failure status and sync acknowledgement.

3. **Command status API:**
   ```
   GET /api/devices/{deviceId}/commands
   Authorization: Bearer <token>
   ```
   Status `Executed` = device confirmed success. `Failed` = device reported failure or max retries reached.

---

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Command stays `Sent`, never `Executed` | FCM delivered but device didn't call status endpoint | Check logcat; verify network; `PolicySyncWorker` retries every 15 min |
| `Device Admin not active` in logcat | Admin revoked after APK update | Open app → tap "Request Admin Permission" |
| `requires Device Owner` in logcat | Command needs Device Owner, not just Admin | Run `adb shell dpm set-device-owner com.example.sdmagent/.AdminReceiver` (device must have no accounts added) |
| Command stuck at `Pending` for >1 min | FCM push failed | Check Firebase config; Hangfire retry job runs every minute |
| Camera / USB / Bluetooth commands succeed but nothing changes | Device Owner not set | See Device Owner row above |
