import client from './client';
import type { DeviceGroup } from '../types/device';

export interface CreateDeviceGroupRequest {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateDeviceGroupRequest {
  name: string;
  description?: string;
  category?: string;
}

export const listDeviceGroups = () =>
  client.get<DeviceGroup[]>('/device-groups').then((r) => r.data);

export const getDeviceGroup = (id: string) =>
  client.get<DeviceGroup>(`/device-groups/${id}`).then((r) => r.data);

export const createDeviceGroup = (data: CreateDeviceGroupRequest) =>
  client.post<DeviceGroup>('/device-groups', data).then((r) => r.data);

export const updateDeviceGroup = (id: string, data: UpdateDeviceGroupRequest) =>
  client.put<DeviceGroup>(`/device-groups/${id}`, data).then((r) => r.data);

export const deleteDeviceGroup = (id: string) =>
  client.delete(`/device-groups/${id}`).then((r) => r.data);
