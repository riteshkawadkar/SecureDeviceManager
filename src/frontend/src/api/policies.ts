import client from './client';
import type { Policy, CreatePolicyRequest } from '../types/policy';

export const listPolicies = () =>
  client.get<Policy[]>('/policies').then((r) => r.data);

export const togglePolicy = (id: string) =>
  client.patch<Policy>(`/policies/${id}/toggle`).then((r) => r.data);

export const createPolicy = (data: CreatePolicyRequest) =>
  client.post<Policy>('/policies', data).then((r) => r.data);

export const deletePolicy = (id: string) =>
  client.delete(`/policies/${id}`).then((r) => r.data);
