import client from './client';
import type { CreateUserRequest, ResetPasswordRequest, Role, UpdateUserRequest, User } from '../types/user';

export const listUsers = () =>
  client.get<User[]>('/users').then((r) => r.data);

export const getUser = (id: string) =>
  client.get<User>(`/users/${id}`).then((r) => r.data);

export const createUser = (data: CreateUserRequest) =>
  client.post<User>('/users', data).then((r) => r.data);

export const updateUser = (id: string, data: UpdateUserRequest) =>
  client.put<User>(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: string) =>
  client.delete(`/users/${id}`).then((r) => r.data);

export const resetUserPassword = (id: string, data: ResetPasswordRequest) =>
  client.post(`/users/${id}/reset-password`, data).then((r) => r.data);

export const listRoles = () =>
  client.get<Role[]>('/users/roles').then((r) => r.data);
