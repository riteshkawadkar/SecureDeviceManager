export enum EnterpriseStatus {
  Pending = 0,
  Active = 1,
  Failed = 2,
}

export interface Enterprise {
  id: string;
  googleEnterpriseId: string | null;
  displayName: string | null;
  status: EnterpriseStatus;
  errorMessage: string | null;
  createdOn: string;
  updatedOn: string | null;
}

export interface SignupUrlResponse {
  url: string;
}

export enum EnrollmentManagementMode {
  AndroidEnterpriseFullyManaged = 1,
  AndroidEnterpriseWorkProfile = 2,
}

export interface EnrollmentToken {
  id: string;
  value: string;
  qrCodeJson: string;
  managementMode: EnrollmentManagementMode;
  expirationTimestamp: string | null;
  createdOn: string;
}

export interface DeviceSyncResult {
  totalFromGoogle: number;
  created: number;
  updated: number;
}
