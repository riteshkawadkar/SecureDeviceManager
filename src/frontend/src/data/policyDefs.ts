import {
  Shield, Smartphone, Wifi, Bluetooth, Camera, Globe,
  Package, HardDrive,
  Plane, Radio, Volume2, MessageSquare, Phone, Trash2, Users,
  MapPin, RotateCcw, WifiOff, BluetoothOff,
} from 'lucide-react';

// ─── Policy definitions ────────────────────────────────────────────────────────
// Shared catalogue of every MDM policy/restriction the console can deploy.
// Used by the Bulk Policy Deployment wizard (to build commands) and the
// Device Detail page (to map a device's command history back to a policy name).

export type ParamType = 'text' | 'number' | 'select' | 'textarea';

export type PolicyParam = {
  key: string;
  label: string;
  type: ParamType;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number;
};

export type PolicyDef = {
  id: string;
  category: string;
  icon: React.ElementType;
  label: string;
  description: string;
  requiresOwner: boolean;
  /**
   * Android UserManager restriction key (e.g. "no_camera").
   * When set, emits a single SetUserRestriction command with {restriction, enabled} payload.
   * action=true → apply restriction; action=false → lift restriction.
   */
  restrictionKey?: string;
  /** UI labels for the restrict/allow toggle when restrictionKey is set. */
  restrictionLabels?: { restrict: string; lift: string };
  /** Binary command pair where each direction is a distinct command type. */
  binaryAction?: { trueLabel: string; falseLabel: string; trueCmd: string; falseCmd: string };
  /** Single command type (no binary direction). */
  fixedCmd?: string;
  params?: PolicyParam[];
  /** When set, params are only shown when action === this value. */
  showParamsWhen?: boolean;
  /**
   * Set only when part of this policy's behavior needs an Android version higher than the
   * platform floor (Android 7.0 / API 24, which every policy already requires since that's
   * the agent's own minSdk). Below minApi the command still runs and reports success — it
   * just falls back to a narrower effect, per the agent's own Build.VERSION.SDK_INT checks.
   */
  versionCaveat?: { minApi: number; minLabel: string; note: string };
};

/** Every policy in this catalogue requires at least this — the agent's own minSdk floor. */
export const BASELINE_ANDROID_VERSION = 'Android 7.0+ (API 24)';

export const POLICY_DEFS: PolicyDef[] = [
  // ── Security ────────────────────────────────────────────────────────────────
  {
    id: 'password',
    category: 'Security',
    icon: Shield,
    label: 'Password Policy',
    description: 'Enforce minimum password complexity and length on all target devices',
    requiresOwner: false,
    fixedCmd: 'SetPasswordPolicy',
    params: [
      { key: 'minLength', label: 'Minimum Length', type: 'number', defaultValue: 8, placeholder: '8' },
      {
        key: 'quality',
        label: 'Complexity',
        type: 'select',
        options: ['NUMERIC', 'NUMERIC_COMPLEX', 'ALPHABETIC', 'ALPHANUMERIC', 'COMPLEX'],
        defaultValue: 'ALPHANUMERIC',
      },
    ],
  },
  {
    id: 'camera',
    category: 'Security',
    icon: Camera,
    label: 'Camera Access',
    description: 'Enable or disable the device camera system-wide',
    requiresOwner: false,
    binaryAction: { trueLabel: 'Disable', falseLabel: 'Enable', trueCmd: 'DisableCamera', falseCmd: 'EnableCamera' },
  },
  {
    id: 'factoryReset',
    category: 'Security',
    icon: RotateCcw,
    label: 'Factory Reset',
    description: 'Prevent users from wiping the device via Settings → Factory Reset (no_factory_reset)',
    requiresOwner: true,
    restrictionKey: 'no_factory_reset',
    restrictionLabels: { restrict: 'Prevent', lift: 'Allow' },
  },
  // ── Network & Connectivity ──────────────────────────────────────────────────
  {
    id: 'wifi',
    category: 'Network & Connectivity',
    icon: Wifi,
    label: 'Wi-Fi Toggle',
    description: 'Turn the Wi-Fi adapter on or off entirely',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Disable', falseLabel: 'Enable', trueCmd: 'DisableWifi', falseCmd: 'EnableWifi' },
    versionCaveat: {
      minApi: 31,
      minLabel: 'Android 12 (API 31)',
      note: 'Below Android 12 this only blocks Wi-Fi configuration changes — the quick-settings toggle itself stays usable.',
    },
  },
  {
    id: 'wifiConfig',
    category: 'Network & Connectivity',
    icon: WifiOff,
    label: 'Wi-Fi Configuration Lock',
    description: 'Prevent users from adding, removing or changing Wi-Fi access points (no_config_wifi)',
    requiresOwner: true,
    restrictionKey: 'no_config_wifi',
    restrictionLabels: { restrict: 'Lock', lift: 'Unlock' },
  },
  {
    id: 'bluetooth',
    category: 'Network & Connectivity',
    icon: Bluetooth,
    label: 'Bluetooth Toggle',
    description: 'Turn the Bluetooth adapter on or off entirely',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Disable', falseLabel: 'Enable', trueCmd: 'DisableBluetooth', falseCmd: 'EnableBluetooth' },
    versionCaveat: {
      minApi: 26,
      minLabel: 'Android 8.0 (API 26)',
      note: 'Below Android 8.0 this only blocks Bluetooth settings access — the radio itself can still be toggled.',
    },
  },
  {
    id: 'bluetoothConfig',
    category: 'Network & Connectivity',
    icon: BluetoothOff,
    label: 'Bluetooth Configuration Lock',
    description: 'Prevent users from pairing new Bluetooth devices or changing Bluetooth settings (no_config_bluetooth)',
    requiresOwner: true,
    restrictionKey: 'no_config_bluetooth',
    restrictionLabels: { restrict: 'Lock', lift: 'Unlock' },
  },
  {
    id: 'airplaneMode',
    category: 'Network & Connectivity',
    icon: Plane,
    label: 'Airplane Mode',
    description: 'Prevent users from enabling Airplane Mode and cutting all radio communication (no_airplane_mode)',
    requiresOwner: true,
    restrictionKey: 'no_airplane_mode',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
  {
    id: 'usb',
    category: 'Network & Connectivity',
    icon: HardDrive,
    label: 'USB File Transfer',
    description: 'Block or allow USB file transfer (MTP/PTP) from this device (no_usb_file_transfer)',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Block', falseLabel: 'Allow', trueCmd: 'BlockUsb', falseCmd: 'UnblockUsb' },
  },
  {
    id: 'tethering',
    category: 'Network & Connectivity',
    icon: Radio,
    label: 'Mobile Hotspot & Tethering',
    description: 'Prevent users from sharing mobile data as a Wi-Fi hotspot or via USB tethering (no_config_tethering)',
    requiresOwner: true,
    restrictionKey: 'no_config_tethering',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
  // ── Device & Hardware ────────────────────────────────────────────────────────
  {
    id: 'volume',
    category: 'Device & Hardware',
    icon: Volume2,
    label: 'Volume Control',
    description: 'Prevent users from adjusting the global device volume (no_adjust_volume)',
    requiresOwner: true,
    restrictionKey: 'no_adjust_volume',
    restrictionLabels: { restrict: 'Lock', lift: 'Allow' },
  },
  {
    id: 'sms',
    category: 'Device & Hardware',
    icon: MessageSquare,
    label: 'SMS Messaging',
    description: 'Block sending and receiving SMS messages on the device (no_sms)',
    requiresOwner: true,
    restrictionKey: 'no_sms',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
  {
    id: 'outgoingCalls',
    category: 'Device & Hardware',
    icon: Phone,
    label: 'Outgoing Phone Calls',
    description: 'Block standard outgoing calls — emergency calls (911/112) are always permitted (no_outgoing_calls)',
    requiresOwner: true,
    restrictionKey: 'no_outgoing_calls',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
  // ── Apps & System ───────────────────────────────────────────────────────────
  {
    id: 'appInstall',
    category: 'Apps & System',
    icon: Package,
    label: 'App Installation',
    description: 'Control whether users can install new applications (no_install_apps)',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Restrict', falseLabel: 'Allow', trueCmd: 'DisableAppInstall', falseCmd: 'EnableAppInstall' },
  },
  {
    id: 'appUninstall',
    category: 'Apps & System',
    icon: Trash2,
    label: 'App Uninstall',
    description: 'Prevent users from deleting any installed application (no_uninstall_apps)',
    requiresOwner: true,
    restrictionKey: 'no_uninstall_apps',
    restrictionLabels: { restrict: 'Prevent', lift: 'Allow' },
  },
  {
    id: 'kiosk',
    category: 'Kiosk',
    icon: Smartphone,
    label: 'Kiosk Mode',
    description: 'Lock the device to one app (single-app) or a curated set of apps (multi-app) via task-lock / screen-pinning',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Enable', falseLabel: 'Disable', trueCmd: 'EnableKiosk', falseCmd: 'DisableKiosk' },
    params: [{
      key: 'packageName',
      label: 'App Package Name(s)',
      type: 'text',
      placeholder: 'com.android.chrome — comma-separate for multi-app, e.g. com.android.chrome, com.google.android.youtube',
    }],
    showParamsWhen: true,
    versionCaveat: {
      minApi: 28,
      minLabel: 'Android 9.0 (API 28)',
      note: 'Below Android 9.0, multi-app kiosk still locks all selected apps, but the built-in Recents switcher to move between them is unavailable — single-app kiosk is unaffected.',
    },
  },
  {
    id: 'webRestrictions',
    category: 'Apps & System',
    icon: Globe,
    label: 'Web Restrictions',
    description: 'Apply URL block/allow lists to Chrome via managed configuration',
    requiresOwner: true,
    fixedCmd: 'SetWebRestrictions',
    params: [
      { key: 'blockedUrls', label: 'Blocked URLs (one per line)', type: 'textarea', placeholder: '*.evil.com\nadult.com' },
      { key: 'allowedUrls', label: 'Allowed URLs (one per line)', type: 'textarea', placeholder: 'safe.internal\nwork.com' },
    ],
  },
  {
    id: 'accountModification',
    category: 'Apps & System',
    icon: Users,
    label: 'Account Modification',
    description: 'Prevent users from adding or removing Google/corporate accounts on the device (no_modify_accounts)',
    requiresOwner: true,
    restrictionKey: 'no_modify_accounts',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
  {
    id: 'locationSharing',
    category: 'Apps & System',
    icon: MapPin,
    label: 'Location Sharing',
    description: 'Prevent users from modifying location sharing settings or disabling GPS (no_share_location)',
    requiresOwner: true,
    restrictionKey: 'no_share_location',
    restrictionLabels: { restrict: 'Restrict', lift: 'Allow' },
  },
];

/** Matches a {commandType, payload} pair (e.g. from device command history) back to its PolicyDef. */
export function findPolicyDefForCommand(commandType: string, payload: unknown): PolicyDef | undefined {
  return POLICY_DEFS.find((d) => {
    if (d.restrictionKey) {
      return commandType === 'SetUserRestriction' &&
        !!payload && typeof payload === 'object' &&
        (payload as Record<string, unknown>).restriction === d.restrictionKey;
    }
    if (d.binaryAction) {
      return d.binaryAction.trueCmd === commandType || d.binaryAction.falseCmd === commandType;
    }
    return d.fixedCmd === commandType;
  });
}

/** True if this commandType+payload represents the "restrictive/on" direction of its policy (vs. the permissive/off direction). */
export function isRestrictiveDirection(def: PolicyDef, commandType: string, payload: unknown): boolean {
  if (def.restrictionKey) {
    return !!payload && typeof payload === 'object' && (payload as Record<string, unknown>).enabled === true;
  }
  if (def.binaryAction) {
    return commandType === def.binaryAction.trueCmd;
  }
  return true;
}

// ─── Android version compatibility ─────────────────────────────────────────────
// The agent reports Build.VERSION.RELEASE (e.g. "9", "13", "7.1") at enrollment, stored as
// Device.androidVersion. This maps that release string to an API level so we can flag, per
// device, which policies' enhanced behavior (versionCaveat) isn't available on that device —
// computed live from the already-stored field rather than a separate persisted flag, so it
// never goes stale if a device's OS changes.
const RELEASE_TO_API: Record<string, number> = {
  '7.0': 24, '7.1': 25, '7.1.1': 25, '7.1.2': 25,
  '8.0': 26, '8.0.0': 26, '8.1': 27, '8.1.0': 27,
  '9': 28, '10': 29, '11': 30, '12': 31, '12L': 32,
  '13': 33, '14': 34, '15': 35, '16': 36,
};

/** Best-effort Build.VERSION.RELEASE → API level mapping. Returns null if unrecognized. */
export function getApiLevel(androidRelease: string | null | undefined): number | null {
  if (!androidRelease) return null;
  const trimmed = androidRelease.trim();
  if (RELEASE_TO_API[trimmed] !== undefined) return RELEASE_TO_API[trimmed];
  const major = trimmed.match(/^(\d+)/)?.[1];
  return major !== undefined ? RELEASE_TO_API[major] ?? null : null;
}

/** Policies whose versionCaveat this device's Android release doesn't meet. Empty if unknown/compatible. */
export function getIncompatiblePolicies(androidRelease: string | null | undefined): PolicyDef[] {
  const apiLevel = getApiLevel(androidRelease);
  if (apiLevel === null) return [];
  return POLICY_DEFS.filter((d) => d.versionCaveat && apiLevel < d.versionCaveat.minApi);
}
