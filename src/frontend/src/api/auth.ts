import client from './client';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth';

export const login = (data: LoginRequest) =>
  client.post<LoginResponse>('/auth/login', data).then((r) => r.data);

export const register = (data: RegisterRequest) =>
  client.post('/auth/register', data).then((r) => r.data);
