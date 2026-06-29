export interface WifiProfile {
  id: string;
  ssid: string;
  security: string;
  band: string;
  deviceCount: number;
  isActive: boolean;
}

export interface VpnProfile {
  id: string;
  name: string;
  server: string;
  protocol: string;
  deviceCount: number;
  isActive: boolean;
}

export interface BlockedDomain {
  id: string;
  domain: string;
  category: string;
  blockedToday: number;
}

export interface AllowedDomain {
  id: string;
  domain: string;
  category: string;
  description: string | null;
}
