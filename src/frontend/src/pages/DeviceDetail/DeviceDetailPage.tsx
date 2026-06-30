import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Trash2, ArrowLeft, AlertTriangle, Smartphone, ShieldCheck } from 'lucide-react';
import { getDevice, listViolations, listCommands, sendCommand } from '../../api/devices';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import { POLICY_DEFS, findPolicyDefForCommand, isRestrictiveDirection } from '../../data/policyDefs';
import type { DeviceCommand } from '../../types/device';

const COMMAND_STATUS_BADGE: Record<number, { label: string; cls: string }> = {
  0: { label: 'Queued', cls: 'bg-gray-100 text-gray-500' },
  1: { label: 'Sent — awaiting confirmation', cls: 'bg-blue-100 text-blue-600' },
  2: { label: 'Confirmed on device', cls: 'bg-green-100 text-green-700' },
  3: { label: 'Failed', cls: 'bg-red-100 text-red-600' },
};

type AppliedPolicy = { def: typeof POLICY_DEFS[number]; latest: DeviceCommand; restrictive: boolean };

function parsePayload(payload: string): unknown {
  try { return JSON.parse(payload); } catch { return payload; }
}

function buildAppliedPolicies(commands: DeviceCommand[] | undefined): AppliedPolicy[] {
  const latestByDefId = new Map<string, DeviceCommand>();
  for (const cmd of commands ?? []) {
    const def = findPolicyDefForCommand(cmd.commandType, parsePayload(cmd.payload));
    if (!def) continue;
    const existing = latestByDefId.get(def.id);
    if (!existing || new Date(cmd.createdOn) > new Date(existing.createdOn)) {
      latestByDefId.set(def.id, cmd);
    }
  }
  const result: AppliedPolicy[] = [];
  for (const def of POLICY_DEFS) {
    const cmd = latestByDefId.get(def.id);
    if (!cmd) continue;
    result.push({ def, latest: cmd, restrictive: isRestrictiveDirection(def, cmd.commandType, parsePayload(cmd.payload)) });
  }
  return result;
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDevice(id!),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const { data: violations } = useQuery({
    queryKey: ['violations', id],
    queryFn: () => listViolations(id!),
  });
  const { data: commands } = useQuery({
    queryKey: ['commands', id],
    queryFn: () => listCommands(id!),
    refetchInterval: 30_000,
  });

  const appliedPolicies = useMemo(() => buildAppliedPolicies(commands), [commands]);

  const cmdMutation = useMutation({
    mutationFn: ({ type }: { type: string }) => sendCommand(id!, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Smartphone size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="font-medium">Device not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          title="Go back"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Device Detail</h1>
          <p className="text-sm text-gray-500">
            {device.deviceIdentifier}
            {device.assignedUserName ? ` — ${device.assignedUserName}` : ''}
          </p>
        </div>
      </div>

      {/* Device Header Card */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={22} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{device.deviceIdentifier}</h2>
            <p className="text-sm text-gray-500">{device.model} · {device.androidVersion}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <LiveStatusBadge lastSeen={device.lastSeen} />
              <ComplianceBadge status={device.complianceStatus} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => cmdMutation.mutate({ type: 'LockScreen' })}
            disabled={cmdMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <Lock size={14} /> Lock
          </button>
          <button
            disabled={cmdMutation.isPending}
            onClick={() => {
              if (confirm('Wipe this device? This cannot be undone.')) {
                cmdMutation.mutate({ type: 'WipeData' });
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            <Trash2 size={14} /> Wipe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Device Info */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Device Information</h3>
          <dl className="space-y-3">
            {[
              ['Device Name', device.deviceIdentifier],
              ['Model', device.model],
              ['Manufacturer', device.manufacturer],
              ['Serial Number', device.serialNumber],
              ['OS Version', device.androidVersion],
              ['Enrollment Date', formatDate(device.createdOn)],
              ['Last Check-in', formatRelativeTime(device.lastSeen)],
              ['Battery', `${device.batteryLevel ?? '—'}%`],
              ['Assigned User', device.assignedUserName ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 sm:gap-4">
                <dt className="text-xs text-gray-400 w-24 sm:w-32 shrink-0 pt-0.5">{label}</dt>
                <dd className="text-sm text-gray-900 font-medium break-words min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-5">
          {/* Applied Policies */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Applied Policies</h3>
              {appliedPolicies.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <ShieldCheck size={13} /> {appliedPolicies.length} deployed
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {appliedPolicies.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No policies have been deployed to this device yet</p>
              ) : (
                appliedPolicies.map(({ def, latest, restrictive }) => {
                  const Icon = def.icon;
                  const directionLabel = restrictive
                    ? def.restrictionLabels?.restrict ?? def.binaryAction?.trueLabel ?? 'Applied'
                    : def.restrictionLabels?.lift ?? def.binaryAction?.falseLabel ?? 'Lifted';
                  const statusBadge = COMMAND_STATUS_BADGE[latest.status] ?? COMMAND_STATUS_BADGE[0];
                  return (
                    <div key={def.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate">{def.label}</p>
                          <p className="text-xs text-gray-400">{formatRelativeTime(latest.executedOn ?? latest.createdOn)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-semibold ${restrictive ? 'text-amber-600' : 'text-gray-400'}`}>
                          {directionLabel}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Violations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Violations</h3>
              {(violations ?? []).length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {violations!.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {(violations ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No violations recorded</p>
              ) : violations!.map((v) => (
                <div key={v.id} className="flex items-start gap-3 px-5 py-3">
                  <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-700">{v.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(v.createdOn)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
