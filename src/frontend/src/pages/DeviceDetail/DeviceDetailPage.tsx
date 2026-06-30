import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Trash2, RotateCw, Bell, ArrowLeft, AlertTriangle, Smartphone, ShieldCheck,
  ChevronDown, History,
} from 'lucide-react';
import { getDevice, listViolations, listCommands, sendCommand } from '../../api/devices';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import { POLICY_DEFS, findPolicyDefForCommand, isRestrictiveDirection, getIncompatiblePolicies } from '../../data/policyDefs';
import type { DeviceCommand } from '../../types/device';

const COMMAND_STATUS_BADGE: Record<number, { label: string; cls: string }> = {
  0: { label: 'Queued', cls: 'bg-gray-100 text-gray-500' },
  1: { label: 'Sent — awaiting confirmation', cls: 'bg-blue-100 text-blue-600' },
  2: { label: 'Confirmed on device', cls: 'bg-green-100 text-green-700' },
  3: { label: 'Failed', cls: 'bg-red-100 text-red-600' },
};

const DEVICE_COMMANDS = [
  { type: 'LockDevice', label: 'Remote Lock', desc: 'Instantly lock device screen', icon: Lock },
  { type: 'Reboot', label: 'Force Reboot', desc: 'Restart device remotely', icon: RotateCw },
  { type: 'SendAlert', label: 'Send Alert', desc: 'Push a message to the device screen', icon: Bell },
  { type: 'WipeData', label: 'Remote Wipe', desc: 'Full factory reset — irreversible', icon: Trash2 },
];

const COMMAND_FAILED = 3;

type AppliedPolicy = { def: typeof POLICY_DEFS[number]; latest: DeviceCommand; restrictive: boolean };

function parsePayload(payload: string): unknown {
  try { return JSON.parse(payload); } catch { return payload; }
}

/** Latest known command per policy — the full catalogue of every policy this device has ever touched. */
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

/** A policy counts as "currently applied" when its latest direction is restrictive and that command didn't fail. */
function isCurrentlyApplied({ restrictive, latest }: AppliedPolicy): boolean {
  return restrictive && latest.status !== COMMAND_FAILED;
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsMenuPos, setActionsMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-actions-menu]')) setActionsOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

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

  // Latest known command per policy — used both for the "currently applied" card (filtered
  // below to active restrictions only) and the full Policy History table (every policy ever
  // touched, regardless of whether it's still in effect).
  const policyLatestState = useMemo(() => buildAppliedPolicies(commands), [commands]);
  const appliedPolicies = useMemo(() => policyLatestState.filter(isCurrentlyApplied), [policyLatestState]);

  // Of the policies currently applied to this device, which ones won't get their full effect
  // on its reported Android version (e.g. Wi-Fi Toggle on Android 9 only blocks config
  // changes, not the quick-settings toggle, since that needs Android 12+) — flagged here
  // rather than stored at enrollment so it never goes stale if the device's OS changes.
  const incompatibleApplied = useMemo(() => {
    const incompatibleIds = new Set(getIncompatiblePolicies(device?.androidVersion).map((d) => d.id));
    return appliedPolicies.filter(({ def }) => incompatibleIds.has(def.id));
  }, [appliedPolicies, device?.androidVersion]);

  const cmdMutation = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload?: object }) => sendCommand(id!, type, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', id] });
      qc.invalidateQueries({ queryKey: ['commands', id] });
    },
  });

  function openActionsMenu(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setActionsMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setActionsOpen((v) => !v);
  }

  function runAction(type: string) {
    setActionsOpen(false);
    if (type === 'WipeData') {
      if (confirm('Wipe this device? This cannot be undone.')) cmdMutation.mutate({ type });
      return;
    }
    if (type === 'SendAlert') {
      setAlertMessage('');
      setAlertModalOpen(true);
      return;
    }
    cmdMutation.mutate({ type });
  }

  function sendAlert() {
    if (!alertMessage.trim()) return;
    cmdMutation.mutate({ type: 'SendAlert', payload: { message: alertMessage.trim() } });
    setAlertModalOpen(false);
  }

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
        <div className="shrink-0">
          <button
            data-actions-menu
            onClick={openActionsMenu}
            disabled={cmdMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <ShieldCheck size={14} /> Actions
            <ChevronDown size={14} className={`transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Actions dropdown — portaled so it floats above everything */}
      {actionsOpen && actionsMenuPos && createPortal(
        <div
          data-actions-menu
          style={{ position: 'fixed', top: actionsMenuPos.top, right: actionsMenuPos.right, zIndex: 9999 }}
          className="w-64 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5"
        >
          {DEVICE_COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            const danger = cmd.type === 'WipeData';
            return (
              <button
                key={cmd.type}
                onClick={() => runAction(cmd.type)}
                className={`w-full flex items-start gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <Icon size={15} className={`mt-0.5 shrink-0 ${danger ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}>{cmd.label}</span>
                  <span className="block text-xs text-gray-400">{cmd.desc}</span>
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Send Alert modal */}
      {alertModalOpen && (
        <Modal title="Send Alert to Device" onClose={() => setAlertModalOpen(false)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">This message is pushed to the device screen immediately.</p>
            <textarea
              autoFocus
              rows={3}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="e.g. Please return this device to IT by Friday"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAlertModalOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendAlert}
                disabled={!alertMessage.trim() || cmdMutation.isPending}
                className="px-3.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </Modal>
      )}

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
            {incompatibleApplied.length > 0 && (
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100">
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />
                  {incompatibleApplied.length} applied polic{incompatibleApplied.length > 1 ? 'ies' : 'y'} won&rsquo;t
                  get full effect on Android {device.androidVersion}: {incompatibleApplied.map(({ def }) => def.label).join(', ')}
                </p>
              </div>
            )}
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

      {/* Policy History — every policy this device has ever touched: when, by whom, and whether it's currently applied */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <History size={14} className="text-gray-400" /> Policy History
          </h3>
          {policyLatestState.length > 0 && <span className="text-xs text-gray-400">{policyLatestState.length} polic{policyLatestState.length > 1 ? 'ies' : 'y'}</span>}
        </div>
        {policyLatestState.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No policy commands have been sent to this device yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">By</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {policyLatestState.map((entry) => {
                  const { def, latest } = entry;
                  const Icon = def.icon;
                  const applied = isCurrentlyApplied(entry);
                  const failed = latest.status === COMMAND_FAILED;
                  return (
                    <tr key={def.id}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={15} className="text-gray-400 shrink-0" />
                          <span className="text-gray-800 font-medium truncate">{def.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap" title={formatDate(latest.createdOn)}>
                        {formatRelativeTime(latest.executedOn ?? latest.createdOn)}
                      </td>
                      <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{latest.createdByName ?? '—'}</td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          applied ? 'bg-green-100 text-green-700' : failed ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {applied ? 'Applied' : failed ? 'Failed' : 'Not Applied'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
