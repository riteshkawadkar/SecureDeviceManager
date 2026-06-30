import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Search, ChevronDown } from 'lucide-react';
import { listDevices, sendCommand } from '../../api/devices';
import { listPolicies } from '../../api/policies';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import type { Device, PagedResult } from '../../types/device';
import { ComplianceStatus } from '../../types/device';

function getLiveStatus(lastSeen: string | null): 'online' | 'offline' | 'inactive' | 'never' {
  if (!lastSeen) return 'never';
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 5) return 'online';
  if (mins < 1440) return 'offline';
  return 'inactive';
}

const DEVICE_COMMANDS = [
  { type: 'LockDevice',  label: 'Remote Lock',    desc: 'Instantly lock device screen' },
  { type: 'WipeData',    label: 'Remote Wipe',    desc: 'Full factory reset — irreversible' },
  { type: 'Reboot',      label: 'Force Reboot',   desc: 'Restart device remotely' },
  { type: 'SendAlert',   label: 'Send Alert',     desc: 'Push a message to the device screen' },
];

export default function RemoteActionsPage() {
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [actionValue, setActionValue]   = useState('cmd:LockDevice');
  const [result, setResult]             = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');

  const { data: rawDevices } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => listDevices({ pageSize: 200 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: listPolicies,
  });

  const isPagedResult = (d: unknown): d is PagedResult<Device> =>
    !!d && typeof (d as PagedResult<Device>).total === 'number';
  const allDevices: Device[] = isPagedResult(rawDevices)
    ? rawDevices.items
    : Array.isArray(rawDevices) ? rawDevices : [];

  /* ── Filtered device list ──────────────────────────────────────────────────── */
  const devices = useMemo(() => allDevices.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || d.deviceIdentifier.toLowerCase().includes(q)
      || (d.model ?? '').toLowerCase().includes(q)
      || (d.assignedUserName ?? '').toLowerCase().includes(q);
    const matchStatus     = !statusFilter     || getLiveStatus(d.lastSeen)    === statusFilter;
    const matchCompliance = !complianceFilter || String(d.complianceStatus)  === complianceFilter;
    return matchSearch && matchStatus && matchCompliance;
  }), [allDevices, search, statusFilter, complianceFilter]);

  /* ── Resolve selected action ───────────────────────────────────────────────── */
  const isPolicy = actionValue.startsWith('policy:');
  const policyId = isPolicy ? actionValue.slice('policy:'.length) : null;
  const commandType = isPolicy ? 'ApplyPolicy' : actionValue.slice('cmd:'.length);
  const selectedPolicy = policyId ? policies.find((p) => p.id === policyId) : null;
  const actionLabel = isPolicy
    ? `Apply Policy: ${selectedPolicy?.name ?? '…'}`
    : DEVICE_COMMANDS.find((c) => c.type === commandType)?.label ?? commandType;

  /* ── Execute ───────────────────────────────────────────────────────────────── */
  const mutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (commandType === 'WipeData' && !confirm(`Wipe ${ids.length} device(s)? This cannot be undone.`)) return;
      const payload = isPolicy && selectedPolicy
        ? { policyId: selectedPolicy.id, policyName: selectedPolicy.name }
        : {};
      await Promise.all(ids.map((id) => sendCommand(id, commandType, payload)));
    },
    onSuccess: () => {
      setResult(`"${actionLabel}" sent to ${selected.size} device(s)`);
      setSelected(new Set());
    },
  });

  /* ── Selection helpers ─────────────────────────────────────────────────────── */
  function toggleDevice(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === devices.length && devices.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map((d) => d.id)));
    }
  }

  function quickSelect(predicate: (d: Device) => boolean) {
    setSelected(new Set(allDevices.filter(predicate).map((d) => d.id)));
  }

  const selectedDevices = allDevices.filter((d) => selected.has(d.id));

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Remote Actions</h1>
        <p className="text-sm text-gray-500">Filter and select target devices, choose an action, then execute</p>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">{result}</span>
          <button onClick={() => setResult(null)} className="text-green-500 hover:text-green-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Step 1: Select Devices ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="inline-flex w-5 h-5 bg-blue-600 text-white text-[11px] font-bold rounded-full items-center justify-center">
                1
              </span>
              Select Target Devices
            </h2>
            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="text-xs text-red-500 hover:underline">
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by device ID, model or user…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[130px]"
              >
                <option value="">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="inactive">Inactive</option>
                <option value="never">Never seen</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[150px]"
              >
                <option value="">All Compliance</option>
                <option value="1">Compliant</option>
                <option value="2">Non-Compliant</option>
                <option value="3">Pending</option>
                <option value="0">Unknown</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Quick-select chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 self-center">Quick select:</span>
            <button
              onClick={() => quickSelect((d) => getLiveStatus(d.lastSeen) === 'online')}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Online devices
            </button>
            <button
              onClick={() => quickSelect((d) => getLiveStatus(d.lastSeen) === 'offline')}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Offline devices
            </button>
            <button
              onClick={() => quickSelect((d) => d.complianceStatus === ComplianceStatus.NonCompliant)}
              className="text-xs px-3 py-1 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
            >
              Non-Compliant
            </button>
          </div>
        </div>

        {/* Device list — mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {devices.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400">No devices match your filters</p>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleDevice(d.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') toggleDevice(d.id); }}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  selected.has(d.id) ? 'bg-blue-50' : 'active:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggleDevice(d.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-blue-600 cursor-pointer mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 leading-tight truncate">{d.deviceIdentifier}</p>
                    <LiveStatusBadge lastSeen={d.lastSeen} />
                  </div>
                  <p className="text-xs text-gray-400">{d.model} · {d.androidVersion}</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <p className="text-xs text-gray-500 truncate">{d.assignedUserName ?? 'Unassigned'}</p>
                    <ComplianceBadge status={d.complianceStatus} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Device table — tablet/desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={devices.length > 0 && selected.size === devices.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Device</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">OS</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Online</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-gray-400">
                    No devices match your filters
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr
                    key={d.id}
                    className={`cursor-pointer transition-colors ${
                      selected.has(d.id) ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleDevice(d.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleDevice(d.id)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 leading-tight">{d.deviceIdentifier}</p>
                      <p className="text-xs text-gray-400 leading-tight">{d.model}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{d.assignedUserName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{d.androidVersion}</td>
                    <td className="px-4 py-3"><LiveStatusBadge lastSeen={d.lastSeen} /></td>
                    <td className="px-4 py-3"><ComplianceBadge status={d.complianceStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Step 2: Choose Action ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <span className="inline-flex w-5 h-5 bg-blue-600 text-white text-[11px] font-bold rounded-full items-center justify-center">
            2
          </span>
          Choose Action
        </h2>
        <div className="relative max-w-sm">
          <select
            value={actionValue}
            onChange={(e) => setActionValue(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-gray-800"
          >
            <optgroup label="Device Commands">
              {DEVICE_COMMANDS.map((cmd) => (
                <option key={cmd.type} value={`cmd:${cmd.type}`}>
                  {cmd.label} — {cmd.desc}
                </option>
              ))}
            </optgroup>
            {policies.length > 0 && (
              <optgroup label="Policies">
                {policies.map((p) => (
                  <option key={p.id} value={`policy:${p.id}`}>
                    {p.name}{!p.isEnabled ? ' (Draft)' : ''} — {p.category}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {isPolicy && selectedPolicy && !selectedPolicy.isEnabled && (
          <p className="mt-2 text-xs text-amber-600">
            This policy is in Draft status. It will still be sent as a command to the device.
          </p>
        )}
      </div>

      {/* ── Sticky Execute Bar ───────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 inset-x-0 flex justify-center z-50 px-3 sm:px-6 pointer-events-none">
          <div className="bg-gray-900 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-2xl flex items-center gap-2 sm:gap-3 pointer-events-auto max-w-2xl w-full">
            <div className="flex items-center gap-2 text-white text-sm flex-1 min-w-0">
              <span className="font-semibold truncate">{actionLabel}</span>
              <span className="text-gray-400 text-xs shrink-0 hidden sm:inline">
                on {selected.size} device{selected.size > 1 ? 's' : ''}
              </span>
              <span className="text-gray-400 text-xs shrink-0 sm:hidden">
                ×{selected.size}
              </span>
              <div className="hidden sm:flex gap-1 ml-1 overflow-hidden">
                {selectedDevices.slice(0, 3).map((d) => (
                  <span
                    key={d.id}
                    className="bg-gray-700 text-gray-200 text-[11px] px-1.5 py-0.5 rounded font-mono truncate max-w-20"
                  >
                    {d.deviceIdentifier}
                  </span>
                ))}
                {selected.size > 3 && (
                  <span className="text-gray-400 text-xs self-center">+{selected.size - 3}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2.5 sm:px-3 py-1.5 border border-gray-600 text-gray-300 text-xs rounded-lg hover:bg-gray-800 transition-colors shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-3 sm:px-4 py-1.5 bg-white text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors shrink-0"
            >
              {mutation.isPending ? 'Sending…' : 'Execute'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
