import client from './client';
import type { WifiProfile, VpnProfile, BlockedDomain, AllowedDomain } from '../types/network';

export const getWifiProfiles = () =>
  client.get<WifiProfile[]>('/network/wifi-profiles').then((r) => r.data);

export const createWifiProfile = (data: { ssid: string; security: string; band: string }) =>
  client.post<WifiProfile>('/network/wifi-profiles', data).then((r) => r.data);

export const deleteWifiProfile = (id: string) =>
  client.delete(`/network/wifi-profiles/${id}`).then((r) => r.data);

export const getVpnProfiles = () =>
  client.get<VpnProfile[]>('/network/vpn-profiles').then((r) => r.data);

export const createVpnProfile = (data: { name: string; server: string; protocol: string }) =>
  client.post<VpnProfile>('/network/vpn-profiles', data).then((r) => r.data);

export const deleteVpnProfile = (id: string) =>
  client.delete(`/network/vpn-profiles/${id}`).then((r) => r.data);

export const getBlockedDomains = () =>
  client.get<BlockedDomain[]>('/network/domains/blocked').then((r) => r.data);

export const addBlockedDomain = (data: { domain: string; category: string }) =>
  client.post<BlockedDomain>('/network/domains/blocked', data).then((r) => r.data);

export const deleteBlockedDomain = (id: string) =>
  client.delete(`/network/domains/blocked/${id}`).then((r) => r.data);

export const getAllowedDomains = () =>
  client.get<AllowedDomain[]>('/network/domains/allowed').then((r) => r.data);

export const addAllowedDomain = (data: { domain: string; category: string; description?: string }) =>
  client.post<AllowedDomain>('/network/domains/allowed', data).then((r) => r.data);

export const deleteAllowedDomain = (id: string) =>
  client.delete(`/network/domains/allowed/${id}`).then((r) => r.data);
