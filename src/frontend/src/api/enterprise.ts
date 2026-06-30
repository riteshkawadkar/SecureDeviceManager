import client from './client';
import type { Enterprise, SignupUrlResponse, EnrollmentToken, DeviceSyncResult, EnrollmentManagementMode } from '../types/enterprise';

export const getCurrentEnterprise = () =>
  client.get<Enterprise | { connected: false }>('/enterprise').then((r) => r.data);

export const startEnterpriseSignup = () =>
  client.post<SignupUrlResponse>('/enterprise/signup').then((r) => r.data);

export const createEnrollmentToken = (managementMode: EnrollmentManagementMode) =>
  client.post<EnrollmentToken>('/enterprise/enrollment-tokens', { managementMode }).then((r) => r.data);

export const syncEnterpriseDevices = () =>
  client.post<DeviceSyncResult>('/enterprise/devices/sync').then((r) => r.data);
