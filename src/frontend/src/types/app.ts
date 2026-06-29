export enum AppStatus {
  Approved = 0,
  Blocked = 1,
  Pending = 2,
}

export interface App {
  id: string;
  name: string;
  packageId: string;
  version: string;
  category: string;
  installs: number;
  appStatus: AppStatus;
  severity: string | null;
  blockReason: string | null;
  requestedBy: string | null;
  requestedOn: string | null;
  createdOn: string;
}

export interface CreateAppRequest {
  name: string;
  packageId: string;
  version: string;
  category: string;
  appStatus: AppStatus;
  severity?: string;
  blockReason?: string;
  requestedBy?: string;
}
