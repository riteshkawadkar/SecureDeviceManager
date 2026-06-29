export interface OsDistributionItem {
  version: string;
  count: number;
}

export interface RecentActivityItem {
  deviceId: string;
  deviceIdentifier: string;
  action: string;
  timestamp: string;
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  activePolicies: number;
  complianceRate: number;
  osDistribution: OsDistributionItem[];
  recentActivity: RecentActivityItem[];
}
