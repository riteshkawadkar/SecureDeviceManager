import { ComplianceStatus, DeviceStatus, EnrollmentType, ManagementMode } from '../../types/device';

export function LiveStatusBadge({ lastSeen }: { lastSeen: string | null }) {
  if (!lastSeen) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Never
      </span>
    );
  }
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Online
      </span>
    );
  }
  if (mins < 1440) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
      Inactive
    </span>
  );
}


interface ComplianceBadgeProps {
  status: ComplianceStatus;
}

export function ComplianceBadge({ status }: ComplianceBadgeProps) {
  const map: Record<ComplianceStatus, { label: string; cls: string }> = {
    [ComplianceStatus.Compliant]: { label: 'Compliant', cls: 'bg-green-100 text-green-700' },
    [ComplianceStatus.NonCompliant]: { label: 'Non-Compliant', cls: 'bg-red-100 text-red-700' },
    [ComplianceStatus.Pending]: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
    [ComplianceStatus.Unknown]: { label: 'Unknown', cls: 'bg-gray-100 text-gray-600' },
  };
  const { label, cls } = map[status] ?? map[ComplianceStatus.Unknown];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

interface OnlineBadgeProps {
  status: DeviceStatus;
}

export function OnlineBadge({ status }: OnlineBadgeProps) {
  const map: Record<DeviceStatus, { label: string; cls: string }> = {
    [DeviceStatus.Online]: { label: 'Online', cls: 'bg-green-100 text-green-700' },
    [DeviceStatus.Offline]: { label: 'Offline', cls: 'bg-gray-100 text-gray-600' },
    [DeviceStatus.Inactive]: { label: 'Inactive', cls: 'bg-yellow-100 text-yellow-700' },
  };
  const { label, cls } = map[status] ?? { label: 'Unknown', cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

interface EnrollmentTypeBadgeProps {
  type: EnrollmentType;
}

export function EnrollmentTypeBadge({ type }: EnrollmentTypeBadgeProps) {
  const map: Record<EnrollmentType, { label: string; cls: string }> = {
    [EnrollmentType.Corporate]: { label: 'Corporate', cls: 'bg-indigo-100 text-indigo-700' },
    [EnrollmentType.BYOD]: { label: 'BYOD', cls: 'bg-purple-100 text-purple-700' },
  };
  const { label, cls } = map[type] ?? map[EnrollmentType.Corporate];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

interface ManagementModeBadgeProps {
  mode: ManagementMode;
}

export function ManagementModeBadge({ mode }: ManagementModeBadgeProps) {
  const map: Record<ManagementMode, { label: string; cls: string }> = {
    [ManagementMode.DeviceOwner]: { label: 'Device Owner', cls: 'bg-blue-100 text-blue-700' },
    [ManagementMode.ProfileOwner]: { label: 'Profile Owner', cls: 'bg-teal-100 text-teal-700' },
    [ManagementMode.Unknown]: { label: 'Unknown', cls: 'bg-gray-100 text-gray-500' },
  };
  const { label, cls } = map[mode] ?? map[ManagementMode.Unknown];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}
