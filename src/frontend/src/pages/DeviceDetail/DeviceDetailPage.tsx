import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Trash2, RotateCw, Bell, ArrowLeft, AlertTriangle, Smartphone, ShieldCheck,
  ChevronDown, ChevronRight, History, Layers, Zap,
} from 'lucide-react';
import { getDevice, listViolations, listCommands, sendCommand } from '../../api/devices';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import Pagination from '../../components/ui/Pagination';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import { POLICY_DEFS, findPolicyDefForCommand, isRestrictiveDirection, getIncompatiblePolicies } from '../../data/policyDefs';
import type { DeviceCommand } from '../../types/device';

/** Policies that map to a single on/off command with no extra parameters — safe to flip from a switch. */
const TOGGLEABLE_POLICY_DEFS = POLICY_DEFS.filter((d) => (d.restrictionKey || d.binaryAction) && !d.params);
const TOGGLEABLE_POLICY_IDS = new Set(TOGGLEABLE_POLICY_DEFS.map((d) => d.id));

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

const HISTORY_PAGE_SIZE = 8;

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

/** Every SendAlert command sent to this device, most recent first, with its message text. */
function buildAlertHistory(commands: DeviceCommand[] | undefined): Array<{ cmd: DeviceCommand; message: string }> {
  return (commands ?? [])
    .filter((c) => c.commandType === 'SendAlert')
    .map((cmd) => {
      const parsed = parsePayload(cmd.payload);
      const message = parsed && typeof parsed === 'object' ? String((parsed as Record<string, unknown>).message ?? '') : '';
      return { cmd, message: message || '(no message)' };
    })
    .sort((a, b) => new Date(b.cmd.createdOn).getTime() - new Date(a.cmd.createdOn).getTime());
}

// ─── Activity History ───────────────────────────────────────────────────────
// One row per "event" — every command created together (same BatchId, e.g. all
// policies in a single Bulk Policy Deployment click) collapses into one row with
// an expandable breakdown; a standalone command (Lock, a single policy Enforce,
// a Send Alert) has a unique BatchId of its own and naturally renders as one row.

type ActivityItem = {
  cmd: DeviceCommand;
  label: string;
  icon: React.ElementType;
  isPolicy: boolean;
  restrictive?: boolean;
  directionLabel?: string;
};

type ActivityEvent = { key: string; items: ActivityItem[]; when: string; by: string | null };

function describeCommand(cmd: DeviceCommand): ActivityItem {
  const payload = parsePayload(cmd.payload);
  const def = findPolicyDefForCommand(cmd.commandType, payload);
  if (def) {
    const restrictive = isRestrictiveDirection(def, cmd.commandType, payload);
    const directionLabel = restrictive
      ? def.restrictionLabels?.restrict ?? def.binaryAction?.trueLabel ?? 'Applied'
      : def.restrictionLabels?.lift ?? def.binaryAction?.falseLabel ?? 'Lifted';
    return { cmd, label: def.label, icon: def.icon, isPolicy: true, restrictive, directionLabel };
  }
  const known = DEVICE_COMMANDS.find((d) => d.type === cmd.commandType);
  if (known) return { cmd, label: known.label, icon: known.icon, isPolicy: false };
  return { cmd, label: cmd.commandType, icon: Zap, isPolicy: false };
}

function buildActivityHistory(commands: DeviceCommand[] | undefined): ActivityEvent[] {
  const groups = new Map<string, DeviceCommand[]>();
  for (const cmd of commands ?? []) {
    const key = cmd.batchId ?? cmd.id;
    const list = groups.get(key);
    if (list) list.push(cmd); else groups.set(key, [cmd]);
  }
  const events: ActivityEvent[] = [];
  for (const [key, cmds] of groups) {
    // Newest first, both for the items shown when a group is expanded and for "when" below —
    // a multi-policy batch is timestamped by its most recent command, not its first.
    const sorted = [...cmds].sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
    events.push({
      key,
      items: sorted.map(describeCommand),
      when: sorted[0].createdOn,
      by: sorted.find((c) => c.createdByName)?.createdByName ?? null,
    });
  }
  return events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsMenuPos, setActionsMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [historyPage, setHistoryPage] = useState(1);

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
  const alertHistory = useMemo(() => buildAlertHistory(commands), [commands]);
  const activityHistory = useMemo(() => buildActivityHistory(commands), [commands]);
  const historyTotalPages = Math.max(1, Math.ceil(activityHistory.length / HISTORY_PAGE_SIZE));
  const pagedHistory = useMemo(
    () => activityHistory.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE),
    [activityHistory, historyPage],
  );

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(1);
  }, [historyPage, historyTotalPages]);

  function toggleEvent(key: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Of the policies currently applied to this device, which ones won't get their full effect
  // on its reported Android version (e.g. Wi-Fi Toggle on Android 9 only blocks config
  // changes, not the quick-settings toggle, since that needs Android 12+) — flagged here
  // rather than stored at enrollment so it never goes stale if the device's OS changes.
  const incompatibleApplied = useMemo(() => {
    const incompatibleIds = new Set(getIncompatiblePolicies(device?.androidVersion).map((d) => d.id));
    return appliedPolicies.filter(({ def }) => incompatibleIds.has(def.id));
  }, [appliedPolicies, device?.androidVersion]);

  // Currently-applied policies that need extra parameters (password rules, web filter lists,
  // kiosk package) — not safe to flip from a bare switch, shown read-only instead.
  const otherAppliedPolicies = useMemo(
    () => appliedPolicies.filter(({ def }) => !TOGGLEABLE_POLICY_IDS.has(def.id)),
    [appliedPolicies],
  );

  const appliedByDefId = useMemo(() => new Map(policyLatestState.map((p) => [p.def.id, p])), [policyLatestState]);
  const activeToggleCount = TOGGLEABLE_POLICY_DEFS.filter((def) => {
    const entry = appliedByDefId.get(def.id);
    return entry ? isCurrentlyApplied(entry) : false;
  }).length;

  const cmdMutation = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload?: object }) => sendCommand(id!, type, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', id] });
      qc.invalidateQueries({ queryKey: ['commands', id] });
    },
  });

  // Each toggle fires its own standalone command — no shared batchId — so it lands as its
  // own row in Policy History, satisfying "every change must be audited as its own event".
  const [pendingPolicyIds, setPendingPolicyIds] = useState<Set<string>>(new Set());
  const policyToggleMutation = useMutation({
    mutationFn: async ({ def, turnOn }: { def: typeof POLICY_DEFS[number]; turnOn: boolean }) => {
      const commandType = def.restrictionKey ? 'SetUserRestriction' : turnOn ? def.binaryAction!.trueCmd : def.binaryAction!.falseCmd;
      const payload = def.restrictionKey ? { restriction: def.restrictionKey, enabled: turnOn } : {};
      await sendCommand(id!, commandType, payload);
    },
    onMutate: ({ def }) => setPendingPolicyIds((prev) => new Set(prev).add(def.id)),
    onSettled: (_data, _err, { def }) => {
      setPendingPolicyIds((prev) => { const next = new Set(prev); next.delete(def.id); return next; });
      qc.invalidateQueries({ queryKey: ['commands', id] });
    },
  });

  function togglePolicy(def: typeof POLICY_DEFS[number]) {
    const entry = appliedByDefId.get(def.id);
    const currentlyOn = entry ? isCurrentlyApplied(entry) : false;
    policyToggleMutation.mutate({ def, turnOn: !currentlyOn });
  }

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
          {/* Applied Policies — live toggles; each flip is its own immediate, audited command */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Applied Policies</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{activeToggleCount} of {TOGGLEABLE_POLICY_DEFS.length} active</span>
                <Link to="/bulk-policies" className="text-xs font-semibold text-blue-600 hover:underline">Manage</Link>
              </div>
            </div>

            {incompatibleApplied.length > 0 && (
              <div className="mb-3 px-3 py-2 bg-amber-50 rounded-lg">
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />
                  {incompatibleApplied.length} applied polic{incompatibleApplied.length > 1 ? 'ies' : 'y'} won&rsquo;t
                  get full effect on Android {device.androidVersion}: {incompatibleApplied.map(({ def }) => def.label).join(', ')}
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {TOGGLEABLE_POLICY_DEFS.map((def) => {
                const Icon = def.icon;
                const entry = appliedByDefId.get(def.id);
                const isOn = entry ? isCurrentlyApplied(entry) : false;
                const pending = pendingPolicyIds.has(def.id);
                return (
                  <div
                    key={def.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-colors ${
                      isOn ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isOn ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <span className={`text-sm font-semibold truncate ${isOn ? 'text-green-700' : 'text-gray-500'}`}>
                        {def.label}
                      </span>
                    </div>
                    <Toggle checked={isOn} onChange={() => togglePolicy(def)} disabled={pending} />
                  </div>
                );
              })}
            </div>

            {otherAppliedPolicies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Other applied policies (configured via Bulk Deploy)
                </p>
                <div className="space-y-1.5">
                  {otherAppliedPolicies.map(({ def, restrictive }) => {
                    const Icon = def.icon;
                    const directionLabel = restrictive
                      ? def.restrictionLabels?.restrict ?? def.binaryAction?.trueLabel ?? 'Applied'
                      : def.restrictionLabels?.lift ?? def.binaryAction?.falseLabel ?? 'Lifted';
                    return (
                      <div key={def.id} className="flex items-center justify-between gap-2 px-1 py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={13} className="text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-600 truncate">{def.label}</span>
                        </div>
                        <span className={`text-[11px] font-medium shrink-0 ${restrictive ? 'text-amber-600' : 'text-gray-400'}`}>
                          {directionLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

          {/* Recent Alerts — SendAlert commands with a read receipt from the device's "Mark as Read" action */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Bell size={14} className="text-gray-400" /> Recent Alerts
              </h3>
              {alertHistory.length > 0 && <span className="text-xs text-gray-400">{alertHistory.length} sent</span>}
            </div>
            <div className="divide-y divide-gray-50">
              {alertHistory.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No alerts sent to this device yet</p>
              ) : (
                alertHistory.map(({ cmd, message }) => {
                  const read = !!cmd.acknowledgedOn;
                  return (
                    <div key={cmd.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 break-words">{message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelativeTime(cmd.createdOn)}{cmd.createdByName ? ` · by ${cmd.createdByName}` : ''}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                          read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                        title={read ? `Read ${formatDate(cmd.acknowledgedOn!)}` : undefined}
                      >
                        {read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Policy History — one row per event: a bulk deployment's policies group into one row,
          a standalone remote command gets its own single-item row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <History size={14} className="text-gray-400" /> Policy History
          </h3>
          {activityHistory.length > 0 && <span className="text-xs text-gray-400">{activityHistory.length} event{activityHistory.length > 1 ? 's' : ''}</span>}
        </div>
        {activityHistory.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No commands have been sent to this device yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {pagedHistory.map((evt) => {
              const total = evt.items.length;
              const successCount = evt.items.filter((it) => it.cmd.status !== COMMAND_FAILED).length;
              const aggCls = successCount === total
                ? 'bg-green-100 text-green-700'
                : successCount === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700';
              const aggLabel = successCount === total ? 'Applied' : successCount === 0 ? 'Failed' : `${successCount}/${total} Applied`;
              const single = total === 1 ? evt.items[0] : null;
              const PrimaryIcon = single ? single.icon : Layers;
              const title = single
                ? single.label
                : evt.items.every((it) => it.isPolicy)
                  ? `${total} Policies Applied`
                  : `${total} Commands Sent`;
              const expanded = expandedEvents.has(evt.key);

              return (
                <div key={evt.key} className="px-5 py-3">
                  <button
                    onClick={() => total > 1 && toggleEvent(evt.key)}
                    className={`w-full flex items-center justify-between gap-3 text-left ${total > 1 ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {total > 1 ? (
                        <ChevronRight size={14} className={`text-gray-300 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      ) : (
                        <PrimaryIcon size={15} className="text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
                          {single?.isPolicy && (
                            <span className={`text-xs font-semibold shrink-0 ${single.restrictive ? 'text-amber-600' : 'text-gray-400'}`}>
                              {single.directionLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400" title={formatDate(evt.when)}>
                          {formatRelativeTime(evt.when)} · by {evt.by ?? 'System'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 ${aggCls}`}>
                      {aggLabel}
                    </span>
                  </button>

                  {expanded && total > 1 && (
                    <div className="mt-2 ml-6 space-y-1.5 border-l border-gray-100 pl-3">
                      {evt.items.map((it) => {
                        const statusBadge = COMMAND_STATUS_BADGE[it.cmd.status] ?? COMMAND_STATUS_BADGE[0];
                        const ItemIcon = it.icon;
                        return (
                          <div key={it.cmd.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ItemIcon size={12} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-600 truncate">{it.label}</span>
                              {it.isPolicy && (
                                <span className={`text-[11px] font-medium shrink-0 ${it.restrictive ? 'text-amber-600' : 'text-gray-400'}`}>
                                  {it.directionLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-gray-400" title={formatDate(it.cmd.createdOn)}>
                                {formatRelativeTime(it.cmd.createdOn)}
                              </span>
                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {historyTotalPages > 1 && (
          <div className="flex justify-center px-5 py-3 border-t border-gray-100">
            <Pagination page={historyPage} pageSize={HISTORY_PAGE_SIZE} total={activityHistory.length} onChange={setHistoryPage} />
          </div>
        )}
      </div>
    </div>
  );
}
