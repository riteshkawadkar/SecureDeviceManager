import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, XCircle, Clock, Download, Plus, AppWindow, MoreHorizontal,
  Pencil, Trash2, UploadCloud, DownloadCloud, ListChecks,
} from 'lucide-react';
import { listApps, approveApp, revokeApp, denyApp } from '../../api/apps';
import { listAppPackages, deleteAppPackage } from '../../api/appPackages';
import { AppStatus } from '../../types/app';
import { AppPackageSource, type AppPackage } from '../../types/appPackage';
import StatCard from '../../components/ui/StatCard';
import SeverityBadge from '../../components/ui/SeverityBadge';
import AppFormModal from './AppFormModal';
import PushInstallModal from './PushInstallModal';
import InstallationsModal from './InstallationsModal';

type Tab = 'catalog' | 'compliance';

export default function AppManagementPage() {
  const [tab, setTab] = useState<Tab>('catalog');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">App Management</h1>
        <p className="text-sm text-gray-500">Push applications to devices and control app compliance</p>
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
        <button
          onClick={() => setTab('catalog')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === 'catalog' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          App Catalog
        </button>
        <button
          onClick={() => setTab('compliance')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === 'compliance' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          Compliance
        </button>
      </div>

      {tab === 'catalog' ? <AppCatalogTab /> : <ComplianceTab />}
    </div>
  );
}

function AppCatalogTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingApp, setEditingApp] = useState<AppPackage | null>(null);
  const [pushApp, setPushApp] = useState<{ app: AppPackage; action: 'install' | 'uninstall' } | null>(null);
  const [viewingApp, setViewingApp] = useState<AppPackage | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['app-packages', search],
    queryFn: () => listAppPackages(search || undefined),
  });
  const apps = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteAppPackage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-packages'] }),
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

  function handleDelete(app: AppPackage) {
    if (confirm(`Remove ${app.name} from the catalog? This does not uninstall it from devices.`)) {
      deleteMutation.mutate(app.id);
      setOpenMenuId(null);
    }
  }

  const totals = apps.reduce(
    (acc, a) => ({
      installed: acc.installed + a.installedCount,
      pending: acc.pending + a.pendingCount,
      failed: acc.failed + a.failedCount,
    }),
    { installed: 0, pending: 0, failed: 0 }
  );

  const menuApp = apps.find((a) => a.id === openMenuId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Apps in Catalog"
          value={apps.length}
          icon={<AppWindow size={17} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Devices Installed"
          value={totals.installed}
          icon={<CheckCircle size={17} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Pending Deploys"
          value={totals.pending}
          icon={<Clock size={17} className="text-amber-500" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Failed Deploys"
          value={totals.failed}
          icon={<XCircle size={17} className="text-red-500" />}
          iconBg="bg-red-50"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-700">Application Catalog</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or package..."
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
            />
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deployment</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Loading applications...
                    </div>
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                    No applications in the catalog yet — click "Add App" to upload one.
                  </td>
                </tr>
              ) : apps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <AppWindow size={16} className="text-blue-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{app.name}</p>
                        {app.category && <p className="text-xs text-gray-400 truncate">{app.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-400 text-xs font-mono">{app.packageId}</p>
                    <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      app.source === AppPackageSource.PlayStore ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {app.source === AppPackageSource.PlayStore ? 'Managed Play' : 'Sideload'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{app.version}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setViewingApp(app)}
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      {app.installedCount > 0 && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {app.installedCount} installed
                        </span>
                      )}
                      {app.pendingCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {app.pendingCount} pending
                        </span>
                      )}
                      {app.failedCount > 0 && (
                        <span className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                          {app.failedCount} failed
                        </span>
                      )}
                      {app.installedCount === 0 && app.pendingCount === 0 && app.failedCount === 0 && (
                        <span className="text-xs text-gray-400">Not deployed</span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      data-action-menu={app.id}
                      onClick={(e) => openMenu(app.id, e)}
                      className={`p-1.5 rounded-md transition-colors ${openMenuId === app.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                    >
                      <MoreHorizontal size={15} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openMenuId && menuPos && menuApp && createPortal(
        <div
          data-action-menu={openMenuId}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-48 bg-white rounded-lg border border-gray-100 shadow-xl py-1"
        >
          <button
            onClick={() => { setPushApp({ app: menuApp, action: 'install' }); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UploadCloud size={14} className="text-gray-400" />
            Push Install
          </button>
          <button
            onClick={() => { setPushApp({ app: menuApp, action: 'uninstall' }); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <DownloadCloud size={14} className="text-gray-400" />
            Push Uninstall
          </button>
          <button
            onClick={() => { setViewingApp(menuApp); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ListChecks size={14} className="text-gray-400" />
            View Deployments
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => { setEditingApp(menuApp); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} className="text-gray-400" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(menuApp)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Remove from catalog
          </button>
        </div>,
        document.body,
      )}

      {creating && <AppFormModal onClose={() => setCreating(false)} />}
      {editingApp && <AppFormModal app={editingApp} onClose={() => setEditingApp(null)} />}
      {pushApp && <PushInstallModal app={pushApp.app} action={pushApp.action} onClose={() => setPushApp(null)} />}
      {viewingApp && <InstallationsModal app={viewingApp} onClose={() => setViewingApp(null)} />}
    </div>
  );
}

function ComplianceTab() {
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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Approved Apps"
          value={approved.length}
          icon={<CheckCircle size={17} className="text-green-600" />}
          iconBg="bg-green-50"
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
        />
      </div>

      {/* Approved Apps Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Approved Applications</h2>
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
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <AppWindow size={16} className="text-blue-500" />
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
