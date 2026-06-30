import client from './client';
import type { DeviceGroup } from '../types/device';

export const listDeviceGroups = () =>
  client.get<DeviceGroup[]>('/device-groups').then((r) => r.data);
