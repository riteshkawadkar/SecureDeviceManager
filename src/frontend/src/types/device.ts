export enum DeviceStatus {
  Offline = 0,
  Online = 1,
  Inactive = 2,
}

export enum ComplianceStatus {
  Unknown = 0,
  Compliant = 1,
  NonCompliant = 2,
  Pending = 3,
}

export interface Device {
  id: string;
  deviceIdentifier: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  batteryLevel: number;
  lastSeen: string | null;
  status: DeviceStatus;
  complianceStatus: ComplianceStatus;
  assignedUserName: string | null;
  groupId: string | null;
  createdOn: string;
  updatedOn: string | null;
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  commandType: string;
  payload: string;
  status: number;
  retryCount: number;
  maxRetries: number;
  createdOn: string;
  executedOn: string | null;
}

export interface DeviceViolation {
  id: string;
  description: string;
  createdOn: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  deviceCount: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
