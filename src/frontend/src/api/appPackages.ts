import client from './client';
import type {
  AppPackage,
  AppInstallation,
  CreateAppPackageRequest,
  UpdateAppPackageRequest,
  PushInstallRequest,
  DeviceInstalledApp,
} from '../types/appPackage';
import type { PagedResult } from '../types/device';

export const listAppPackages = (search?: string, page = 1, pageSize = 50) =>
  client.get<PagedResult<AppPackage>>('/app-packages', { params: { search, page, pageSize } }).then((r) => r.data);

export const getAppPackage = (id: string) =>
  client.get<AppPackage>(`/app-packages/${id}`).then((r) => r.data);

export const createAppPackage = (data: CreateAppPackageRequest) =>
  client.post<AppPackage>('/app-packages', data).then((r) => r.data);

export const updateAppPackage = (id: string, data: UpdateAppPackageRequest) =>
  client.put<AppPackage>(`/app-packages/${id}`, data).then((r) => r.data);

export const deleteAppPackage = (id: string) =>
  client.delete(`/app-packages/${id}`).then((r) => r.data);

export const pushInstall = (id: string, req: PushInstallRequest) =>
  client.post<AppInstallation[]>(`/app-packages/${id}/install`, req).then((r) => r.data);

export const pushUninstall = (id: string, req: PushInstallRequest) =>
  client.post<AppInstallation[]>(`/app-packages/${id}/uninstall`, req).then((r) => r.data);

export const getInstallations = (id: string) =>
  client.get<AppInstallation[]>(`/app-packages/${id}/installations`).then((r) => r.data);

export const getDeviceInstalledApps = (deviceId: string) =>
  client.get<PagedResult<DeviceInstalledApp>>(`/devices/${deviceId}/installed-apps`).then((r) => r.data);
