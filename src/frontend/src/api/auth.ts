import client from './client';
import type { LoginRequest, LoginResponse } from '../types/auth';
import type { ChangePasswordRequest, User } from '../types/user';

export const login = (data: LoginRequest) =>
  client.post<LoginResponse>('/auth/login', data).then((r) => r.data);

export const getMe = () =>
  client.get<User>('/auth/me').then((r) => r.data);

export const changeMyPassword = (data: ChangePasswordRequest) =>
  client.put('/auth/me/password', data).then((r) => r.data);
