export interface DeviceAssignment {
  id: string;
  deviceId: string;
  assignedTo: string;
  assignedAt: string;
  assignedBy: string;
  notes: string | null;
}

export interface AssignDeviceRequest {
  assignedTo: string;
  notes?: string;
}
