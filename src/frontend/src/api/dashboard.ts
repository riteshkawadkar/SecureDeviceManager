import client from './client';
import type { DashboardStats } from '../types/dashboard';

export const getStats = () =>
  client.get<DashboardStats>('/dashboard/stats').then((r) => r.data);
