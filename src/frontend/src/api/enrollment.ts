import client from './client';

export interface CreateTokenRequest {
  maxDevices?: number;
  expiresInMinutes?: number;
}

export interface EnrollmentToken {
  id: string;
  token: string;
  expiresOn: string;
  maxDevices: number;
  isActive: boolean;
  isExpired: boolean;
}

export const createToken = (data: CreateTokenRequest = { maxDevices: 1, expiresInMinutes: 60 }) =>
  client.post<{ token: string; expiresOn: string; maxDevices: number }>('/enrollment/tokens', data).then((r) => r.data);

export const listTokens = () =>
  client.get<EnrollmentToken[]>('/enrollment/tokens').then((r) => r.data);

export const generateQrUrl = () => '/api/enrollment/tokens/generate-qr';
