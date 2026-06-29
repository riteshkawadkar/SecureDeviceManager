import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Lock, Trash2, RotateCcw, Bell, X } from 'lucide-react';
import { listDevices, sendCommand } from '../../api/devices';
import { ComplianceBadge, OnlineBadge } from '../../components/ui/StatusBadge';
import type { Device, PagedResult } from '../../types/device';

const COMMANDS = [
  {
    type: 'LockDevice',
    label: 'Remote Lock',
    desc: 'Instantly lock device screen',
    icon: Lock,
    iconCls: 'text-blue-600',
    iconBg: 'bg-blue-50',
    borderActive: 'border-blue-500 bg-blue-50/60',
  },
  {
    type: 'WipeData',
    label: 'Remote Wipe',
    desc: 'Full factory reset — irreversible',
    icon: Trash2,
    iconCls: 'text-red-500',
    iconBg: 'bg-red-50',
    borderActive: 'border-red-500 bg-red-50/60',
  },
  {
    type: 'Reboot',
    label: 'Force Reboot',
    desc: 'Restart device remotely',
    icon: RotateCcw,
    iconCls: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    borderActive: 'border-indigo-500 bg-indigo-50/60',
  },
  {
    type: 'SendAlert',
    label: 'Send Alert',
    desc: 'Push message to device screen',
    icon: Bell,
    iconCls: 'text-amber-500',
    iconBg: 'bg-amber-50',
    borderActive: 'border-amber-500 bg-amber-50/60',
  },
];

export default function RemoteActionsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedCmd, setSelectedCmd] = useState('LockDevice');
  const [result, setResult] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => listDevices({ pageSize: 50 }),
  });

  const isPagedResult = (d: unknown): d is PagedResult<Device> =>
    !!d && typeof (d as PagedResult<Device>).total === 'number';
  const devices = isPagedResult(data) ? data.items : Array.isArray(data) ? data : [];

  const mutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (selectedCmd === 'WipeData' && !confirm(`Wipe ${ids.length} device(s)? This cannot be undone.`)) return;
      await Promise.all(ids.map((id) => sendCommand(id, selectedCmd)));
    },
    onSuccess: () => {
      const label = COMMANDS.find((c) => c.type === selectedCmd)?.label ?? selectedCmd;
      setResult(`"${label}" sent to ${selected.size} device(s)`);
      setSelected(new Set());
    },
  });

  function toggleDevice(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map((d) => d.id)));
    }
  }

  const selectedDevices = devices.filter((d) => selected.has(d.id));
  const currentCmd = COMMANDS.find((c) => c.type === selectedCmd)!;

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Remote Actions</h1>
        <p className="text-sm text-gray-500">Select target devices and an action to execute</p>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">{result}</span>
          <button onClick={() => setResult(null)} className="text-green-500 hover:text-green-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Step 1: Select Devices */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
        <div className="overflow-x-auto">
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
                    No devices available
                  </td>
                </tr>
              ) : devices.map((d) => (
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
                  <td className="px-4 py-3"><OnlineBadge status={d.status} /></td>
                  <td className="px-4 py-3"><ComplianceBadge status={d.complianceStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Choose Action */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <span className="inline-flex w-5 h-5 bg-blue-600 text-white text-[11px] font-bold rounded-full items-center justify-center">
            2
          </span>
          Choose Action
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.type}
              onClick={() => setSelectedCmd(cmd.type)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedCmd === cmd.type
                  ? cmd.borderActive
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-9 h-9 ${cmd.iconBg} rounded-lg flex items-center justify-center mb-2.5`}>
                <cmd.icon size={16} className={cmd.iconCls} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-gray-800">{cmd.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{cmd.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Execute Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-6 pointer-events-none">
          <div className="bg-gray-900 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 pointer-events-auto max-w-2xl w-full">
            <div className="flex items-center gap-2 text-white text-sm flex-1 min-w-0">
              <div className={`w-6 h-6 ${currentCmd.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                <currentCmd.icon size={13} className={currentCmd.iconCls} />
              </div>
              <span className="font-semibold truncate">{currentCmd.label}</span>
              <span className="text-gray-400 text-xs shrink-0">on {selected.size} device{selected.size > 1 ? 's' : ''}</span>
              <div className="flex gap-1 ml-1 overflow-hidden">
                {selectedDevices.slice(0, 3).map((d) => (
                  <span key={d.id} className="bg-gray-700 text-gray-200 text-[11px] px-1.5 py-0.5 rounded font-mono truncate max-w-20">
                    {d.deviceIdentifier}
                  </span>
                ))}
                {selected.size > 3 && (
                  <span className="text-gray-400 text-xs">+{selected.size - 3}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 border border-gray-600 text-gray-300 text-xs rounded-lg hover:bg-gray-800 transition-colors shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-4 py-1.5 bg-white text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-100 disabled:opacity-60 transition-colors shrink-0"
            >
              {mutation.isPending ? 'Sending...' : 'Execute'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
