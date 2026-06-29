import client from './client';
import type { Device, DeviceCommand, DeviceViolation, PagedResult } from '../types/device';

export interface DeviceQueryParams {
  search?: string;
  status?: string;
  androidVersion?: string;
  page?: number;
  pageSize?: number;
}

export const listDevices = (params?: DeviceQueryParams) =>
  client.get<PagedResult<Device> | Device[]>('/devices', { params }).then((r) => r.data);

export const getDevice = (id: string) =>
  client.get<Device>(`/devices/${id}`).then((r) => r.data);

export const deleteDevice = (id: string) =>
  client.delete(`/devices/${id}`).then((r) => r.data);

export const listCommands = (deviceId: string) =>
  client.get<DeviceCommand[]>(`/devices/${deviceId}/commands`).then((r) => r.data);

export const listViolations = (deviceId: string) =>
  client.get<DeviceViolation[]>(`/devices/${deviceId}/violations`).then((r) => r.data);

export const sendCommand = (deviceId: string, commandType: string, payload: object = {}) =>
  client.post(`/devices/${deviceId}/commands`, { commandType, payload }).then((r) => r.data);
