import { AxiosError } from 'axios';
import client from './client';
import type { DeviceAssignment, AssignDeviceRequest } from '../types/deviceAssignment';

export const getDeviceAssignment = (deviceId: string) =>
  client.get<DeviceAssignment>(`/devices/${deviceId}/assignment`).then(
    (r) => r.data,
    (err) => {
      if (err instanceof AxiosError && err.response?.status === 404) return null;
      throw err;
    },
  );

export const assignDevice = (deviceId: string, data: AssignDeviceRequest) =>
  client.put<DeviceAssignment>(`/devices/${deviceId}/assignment`, data).then((r) => r.data);

export const unassignDevice = (deviceId: string) =>
  client.delete(`/devices/${deviceId}/assignment`).then((r) => r.data);
