import client from './client';
import type { App, CreateAppRequest } from '../types/app';
import { AppStatus } from '../types/app';
import type { PagedResult } from '../types/device';

export const listApps = (status?: AppStatus, category?: string, page = 1, pageSize = 50) =>
  client.get<PagedResult<App>>('/apps', { params: { status, category, page, pageSize } }).then((r) => r.data);

export const createApp = (data: CreateAppRequest) =>
  client.post<App>('/apps', data).then((r) => r.data);

export const approveApp = (id: string) =>
  client.patch<App>(`/apps/${id}/approve`).then((r) => r.data);

export const revokeApp = (id: string) =>
  client.patch<App>(`/apps/${id}/revoke`).then((r) => r.data);

export const denyApp = (id: string) =>
  client.patch<App>(`/apps/${id}/deny`).then((r) => r.data);

export const deleteApp = (id: string) =>
  client.delete(`/apps/${id}`).then((r) => r.data);
