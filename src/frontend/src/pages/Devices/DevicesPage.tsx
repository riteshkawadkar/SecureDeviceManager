import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { listDevices, deleteDevice } from '../../api/devices';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import type { Device, PagedResult } from '../../types/device';

export default function DevicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [osFilter, setOsFilter] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const pageSize = 10;

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-action-menu]')) setOpenMenuId(null);
    }
    function onScroll() { setOpenMenuId(null); }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  function openMenu(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(id);
  }

  function handleDelete(id: string) {
    if (confirm('Remove this device from management? This cannot be undone.')) {
      deleteMutation.mutate(id);
      setOpenMenuId(null);
    }
  }

  const params = {
    search: search || undefined,
    status: statusFilter || undefined,
    androidVersion: osFilter || undefined,
    page,
    pageSize,
  };

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['devices', params],
    queryFn: () => listDevices(params),
    refetchInterval: 60_000,          // re-fetch every 60 s while tab is active
    refetchIntervalInBackground: false, // pause when tab is hidden
  });

  const isPagedResult = (d: unknown): d is PagedResult<Device> =>
    !!d && typeof (d as PagedResult<Device>).total === 'number';

  const devices = isPagedResult(data) ? data.items : Array.isArray(data) ? data : [];
  const total = isPagedResult(data) ? data.total : Array.isArray(data) ? data.length : 0;

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Devices</h1>
          <p className="text-sm text-gray-500">{total} enrolled Android devices</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => navigate('/devices/enroll')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus size={14} /> Enroll Device
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          value={osFilter}
          onChange={(e) => { setOsFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All OS Versions</option>
          <option value="Android 14">Android 14</option>
          <option value="Android 13">Android 13</option>
          <option value="Android 12">Android 12</option>
          <option value="Android 11">Android 11</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, model..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
        />
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-gray-600">
        <span className="font-semibold text-gray-500 uppercase tracking-wide text-[11px]">Status guide</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-green-700">Online</span>
          <span className="text-gray-400">— checked in within the last 5 min</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span className="font-medium text-gray-600">Offline</span>
          <span className="text-gray-400">— last seen 5 min – 24 h ago</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <span className="font-medium text-yellow-700">Inactive</span>
          <span className="text-gray-400">— no contact for more than 24 h</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span className="font-medium text-gray-500">Never</span>
          <span className="text-gray-400">— enrolled but never sent a heartbeat</span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Device
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  OS
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Compliance
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Last Seen
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Enrolled
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Loading devices...
                    </div>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                    No devices found
                  </td>
                </tr>
              ) : devices.map((device) => (
                <tr
                  key={device.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs text-blue-600 font-bold">A</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">{device.deviceIdentifier}</p>
                        <p className="text-xs text-gray-400 leading-tight">{device.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{device.assignedUserName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{device.androidVersion}</td>
                  <td className="px-4 py-3"><LiveStatusBadge lastSeen={device.lastSeen} /></td>
                  <td className="px-4 py-3"><ComplianceBadge status={device.complianceStatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs" title={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : undefined}>
                    {formatRelativeTime(device.lastSeen)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(device.createdOn)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      data-action-menu={device.id}
                      onClick={(e) => openMenu(device.id, e)}
                      className={`p-1.5 rounded-md transition-colors ${openMenuId === device.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                    >
                      <MoreHorizontal size={15} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              {total === 0
                ? 'No results'
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} devices`}
            </p>
            {dataUpdatedAt > 0 && (
              <p className="text-xs text-gray-400">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </div>
      </div>

      {/* Portal dropdown — rendered into document.body to escape overflow-x-auto */}
      {openMenuId && menuPos && createPortal(
        <div
          data-action-menu={openMenuId}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 bg-white rounded-lg border border-gray-100 shadow-xl py-1"
        >
          <button
            onClick={() => { navigate(`/devices/${openMenuId}`); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={14} className="text-gray-400" />
            View Details
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => handleDelete(openMenuId)}
            disabled={deleteMutation.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            Remove Device
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
