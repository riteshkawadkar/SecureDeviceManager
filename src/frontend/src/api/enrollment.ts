import client from './client';
import { EnrollmentType } from '../types/device';

export interface CreateTokenRequest {
  maxDevices?: number;
  expiresInMinutes?: number;
  enrollmentType?: EnrollmentType;
}

export interface EnrollmentToken {
  id: string;
  token: string;
  expiresOn: string;
  maxDevices: number;
  isActive: boolean;
  enrollmentType: EnrollmentType;
  isExpired: boolean;
}

export const createToken = (data: CreateTokenRequest = { maxDevices: 1, expiresInMinutes: 60, enrollmentType: EnrollmentType.Corporate }) =>
  client.post<{ token: string; expiresOn: string; maxDevices: number }>('/enrollment/tokens', data).then((r) => r.data);

export const listTokens = () =>
  client.get<EnrollmentToken[]>('/enrollment/tokens').then((r) => r.data);

export const generateQrUrl = () => '/api/enrollment/tokens/generate-qr';
