import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import { listDevices } from '../../api/devices';
import { listDeviceGroups } from '../../api/deviceGroups';
import { pushInstall, pushUninstall } from '../../api/appPackages';
import type { AppPackage } from '../../types/appPackage';
import type { Device, PagedResult } from '../../types/device';

interface Props {
  app: AppPackage;
  action: 'install' | 'uninstall';
  onClose: () => void;
}

export default function PushInstallModal({ app, action, onClose }: Props) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'devices' | 'group'>('devices');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices', 'all-for-push'],
    queryFn: () => listDevices({ pageSize: 500 }),
  });
  const devices: Device[] = Array.isArray(devicesData)
    ? devicesData
    : (devicesData as PagedResult<Device> | undefined)?.items ?? [];

  const { data: groups = [] } = useQuery({
    queryKey: ['device-groups'],
    queryFn: listDeviceGroups,
  });

  const filteredDevices = devices.filter((d) =>
    `${d.manufacturer} ${d.model} ${d.serialNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: () => {
      const req = mode === 'group' ? { groupId } : { deviceIds: selectedDeviceIds };
      return action === 'install' ? pushInstall(app.id, req) : pushUninstall(app.id, req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-packages'] });
      queryClient.invalidateQueries({ queryKey: ['app-installations', app.id] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Push failed. Please try again.';
      setError(message);
    },
  });

  function toggleDevice(id: string) {
    setSelectedDeviceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'devices' && selectedDeviceIds.length === 0) {
      setError('Select at least one device.');
      return;
    }
    if (mode === 'group' && !groupId) {
      setError('Select a device group.');
      return;
    }
    mutation.mutate();
  }

  const title = action === 'install' ? `Push Install — ${app.name}` : `Push Uninstall — ${app.name}`;

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            type="button"
            onClick={() => setMode('devices')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'devices' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Select Devices
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'group' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Device Group
          </button>
        </div>

        {mode === 'devices' ? (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
              {loadingDevices ? (
                <p className="text-center py-6 text-xs text-gray-400">Loading devices...</p>
              ) : filteredDevices.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">No devices found</p>
              ) : filteredDevices.map((d) => (
                <label key={d.id} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDeviceIds.includes(d.id)}
                    onChange={() => toggleDevice(d.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <p className="text-gray-800 font-medium leading-tight truncate">{d.manufacturer} {d.model}</p>
                    <p className="text-xs text-gray-400 leading-tight truncate">{d.serialNumber}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{selectedDeviceIds.length} device(s) selected</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Device group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.deviceCount} devices)</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={`px-3 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 ${
              action === 'install' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {mutation.isPending ? 'Sending...' : action === 'install' ? 'Push Install' : 'Push Uninstall'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
