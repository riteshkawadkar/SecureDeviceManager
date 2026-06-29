import { DeviceStatus, ComplianceStatus } from '../types/device';

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export function deviceStatusLabel(status: DeviceStatus): string {
  switch (status) {
    case DeviceStatus.Online: return 'Online';
    case DeviceStatus.Offline: return 'Offline';
    case DeviceStatus.Inactive: return 'Inactive';
    default: return 'Unknown';
  }
}

export function complianceStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case ComplianceStatus.Compliant: return 'Compliant';
    case ComplianceStatus.NonCompliant: return 'Non-Compliant';
    case ComplianceStatus.Pending: return 'Pending';
    default: return 'Unknown';
  }
}

export function commandStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'Pending';
    case 1: return 'Sent';
    case 2: return 'Executed';
    case 3: return 'Failed';
    default: return 'Unknown';
  }
}
