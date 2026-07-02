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

export enum EnrollmentType {
  Corporate = 0,
  BYOD = 1,
}

export enum ManagementMode {
  Unknown = 0,
  DeviceOwner = 1,
  ProfileOwner = 2,
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
  enrollmentType: EnrollmentType;
  managementMode: ManagementMode;
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
  acknowledgedOn: string | null;
  batchId: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
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
  category: string | null;
  deviceCount: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
