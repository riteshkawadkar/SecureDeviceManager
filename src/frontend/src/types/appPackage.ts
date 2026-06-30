export interface AppPackage {
  id: string;
  name: string;
  packageId: string;
  version: string;
  versionCode: number | null;
  iconUrl: string | null;
  apkUrl: string;
  category: string | null;
  isSystemApp: boolean;
  runAfterInstall: boolean;
  showIcon: boolean;
  createdOn: string;
  updatedOn: string | null;
  pendingCount: number;
  installedCount: number;
  failedCount: number;
}

export interface CreateAppPackageRequest {
  name: string;
  packageId: string;
  version: string;
  versionCode?: number | null;
  iconUrl?: string | null;
  apkUrl: string;
  category?: string | null;
  isSystemApp: boolean;
  runAfterInstall: boolean;
  showIcon: boolean;
}

export type UpdateAppPackageRequest = CreateAppPackageRequest;

export interface PushInstallRequest {
  deviceIds?: string[];
  groupId?: string;
}

export type InstallStatus = 'Pending' | 'Sent' | 'Installed' | 'Uninstalled' | 'Failed' | 'Unknown';

export interface AppInstallation {
  id: string;
  appPackageId: string;
  deviceId: string;
  deviceName: string;
  action: 'Install' | 'Uninstall';
  commandId: string | null;
  status: InstallStatus;
  createdOn: string;
}

export interface DeviceInstalledApp {
  id: string;
  deviceId: string;
  packageId: string;
  appName: string | null;
  versionName: string | null;
  versionCode: number | null;
  isSystemApp: boolean;
  firstSeenOn: string;
  lastSeenOn: string;
}
