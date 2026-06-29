import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Trash2, ArrowLeft, AlertTriangle, Smartphone } from 'lucide-react';
import { getDevice, listViolations, sendCommand } from '../../api/devices';
import { listPolicies } from '../../api/policies';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import { formatRelativeTime, formatDate } from '../../utils/formatters';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => getDevice(id!),
  });
  const { data: violations } = useQuery({
    queryKey: ['violations', id],
    queryFn: () => listViolations(id!),
  });
  const { data: policies } = useQuery({ queryKey: ['policies'], queryFn: listPolicies });

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

  const enabledPolicies = (policies ?? []).filter((p) => p.isEnabled);
  const disabledPolicies = (policies ?? []).filter((p) => !p.isEnabled);

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
              <div key={label} className="flex items-start gap-4">
                <dt className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</dt>
                <dd className="text-sm text-gray-900 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-5">
          {/* Applied Policies */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Applied Policies</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {enabledPolicies.length === 0 && disabledPolicies.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No policies found</p>
              ) : (
                <>
                  {enabledPolicies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-sm text-gray-700">{p.name}</span>
                      <span className="text-xs text-green-600 font-semibold">Active</span>
                    </div>
                  ))}
                  {disabledPolicies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-sm text-gray-400">{p.name}</span>
                      <span className="text-xs text-gray-400">Off</span>
                    </div>
                  ))}
                </>
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
