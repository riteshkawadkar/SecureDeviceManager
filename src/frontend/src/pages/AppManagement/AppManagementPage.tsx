import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Download, Plus } from 'lucide-react';
import { listApps, approveApp, revokeApp, denyApp } from '../../api/apps';
import { AppStatus } from '../../types/app';
import StatCard from '../../components/ui/StatCard';
import SeverityBadge from '../../components/ui/SeverityBadge';

export default function AppManagementPage() {
  const qc = useQueryClient();
  const { data: appsData, isLoading } = useQuery({ queryKey: ['apps'], queryFn: () => listApps() });
  const apps = appsData?.items ?? [];

  const approved = apps.filter((a) => a.appStatus === AppStatus.Approved);
  const blocked = apps.filter((a) => a.appStatus === AppStatus.Blocked);
  const pending = apps.filter((a) => a.appStatus === AppStatus.Pending);

  const approveMutation = useMutation({
    mutationFn: approveApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
  const revokeMutation = useMutation({
    mutationFn: revokeApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
  const denyMutation = useMutation({
    mutationFn: denyApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">App Management</h1>
        <p className="text-sm text-gray-500">Control approved, blocked, and pending apps across enrolled devices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Approved Apps"
          value={approved.length}
          icon={<CheckCircle size={17} className="text-green-600" />}
          iconBg="bg-green-50"
          subtitle="+2 added this month"
        />
        <StatCard
          title="Blocked Apps"
          value={blocked.length}
          icon={<XCircle size={17} className="text-red-500" />}
          iconBg="bg-red-50"
          subtitle={`${blocked.reduce((s, a) => s + a.installs, 0)} install attempts blocked`}
        />
        <StatCard
          title="Pending Approval"
          value={pending.length}
          icon={<Clock size={17} className="text-amber-500" />}
          iconBg="bg-amber-50"
          subtitle={`${pending.filter((a) => a.severity === 'high').length} high priority`}
        />
        <StatCard
          title="Installs Tracked"
          value={isLoading ? '—' : apps.reduce((s, a) => s + a.installs, 0)}
          icon={<Download size={17} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="+114 this week"
        />
      </div>

      {/* Approved Apps Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Approved Applications</h2>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={12} /> Add App
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Application</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Installs</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {approved.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-gray-400">
                    No approved apps
                  </td>
                </tr>
              ) : approved.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base shrink-0">
                        📱
                      </div>
                      <span className="font-medium text-gray-800">{app.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{app.packageId}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{app.version}</td>
                  <td className="px-5 py-3 text-gray-700 font-medium">{app.installs}</td>
                  <td className="px-5 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {app.category}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-600">
                        Edit
                      </button>
                      <button
                        onClick={() => revokeMutation.mutate(app.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Blocked Apps */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Blocked Applications</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 hover:underline">+ Block App</button>
          </div>
          <div className="divide-y divide-gray-50">
            {blocked.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">No blocked apps</p>
            ) : blocked.map((app) => (
              <div key={app.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <XCircle size={16} className="text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{app.name}</p>
                    {app.severity && <SeverityBadge severity={app.severity} />}
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate">{app.packageId}</p>
                  {app.blockReason && <p className="text-xs text-gray-500 truncate">{app.blockReason}</p>}
                </div>
                <span className="text-red-500 text-xs font-semibold shrink-0">{app.installs}×</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Pending Approval</h2>
            {pending.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {pending.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">No pending requests</p>
            ) : pending.map((app) => (
              <div key={app.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <Clock size={15} className="text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{app.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{app.packageId}</p>
                  {app.requestedBy && (
                    <p className="text-xs text-gray-500">by {app.requestedBy}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(app.id)}
                    className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => denyMutation.mutate(app.id)}
                    className="px-2.5 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
