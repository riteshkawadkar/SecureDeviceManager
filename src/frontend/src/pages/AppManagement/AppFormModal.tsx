import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import { createAppPackage, updateAppPackage } from '../../api/appPackages';
import type { AppPackage } from '../../types/appPackage';

interface Props {
  app?: AppPackage;
  onClose: () => void;
}

export default function AppFormModal({ app, onClose }: Props) {
  const isEdit = !!app;
  const queryClient = useQueryClient();

  const [name, setName] = useState(app?.name ?? '');
  const [packageId, setPackageId] = useState(app?.packageId ?? '');
  const [version, setVersion] = useState(app?.version ?? '');
  const [versionCode, setVersionCode] = useState(app?.versionCode?.toString() ?? '');
  const [apkUrl, setApkUrl] = useState(app?.apkUrl ?? '');
  const [iconUrl, setIconUrl] = useState(app?.iconUrl ?? '');
  const [category, setCategory] = useState(app?.category ?? '');
  const [isSystemApp, setIsSystemApp] = useState(app?.isSystemApp ?? false);
  const [runAfterInstall, setRunAfterInstall] = useState(app?.runAfterInstall ?? false);
  const [showIcon, setShowIcon] = useState(app?.showIcon ?? true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        packageId,
        version,
        versionCode: versionCode ? Number(versionCode) : null,
        apkUrl,
        iconUrl: iconUrl || null,
        category: category || null,
        isSystemApp,
        runAfterInstall,
        showIcon,
      };
      return isEdit ? updateAppPackage(app.id, payload) : createAppPackage(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-packages'] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setError(message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate();
  }

  return (
    <Modal title={isEdit ? 'Edit Application' : 'Add Application'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Application name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Field Service App"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Package ID</label>
            <input
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              required
              disabled={isEdit}
              placeholder="com.example.app"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Productivity"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Version name</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
              placeholder="1.0.5"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Version code</label>
            <input
              type="number"
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              placeholder="105"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">APK URL</label>
          <input
            value={apkUrl}
            onChange={(e) => setApkUrl(e.target.value)}
            required
            placeholder="https://cdn.example.com/app-1.0.5.apk"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Hosted APK link the device downloads and silently installs.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon URL (optional)</label>
          <input
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://cdn.example.com/app-icon.png"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-2.5 border-t border-gray-100 pt-3.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-gray-700">Show icon on device</label>
              <p className="text-xs text-gray-400">Display the launcher icon after install.</p>
            </div>
            <Toggle checked={showIcon} onChange={() => setShowIcon((v) => !v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-gray-700">Run after install</label>
              <p className="text-xs text-gray-400">Launch the app once silently installed.</p>
            </div>
            <Toggle checked={runAfterInstall} onChange={() => setRunAfterInstall((v) => !v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-gray-700">System app</label>
              <p className="text-xs text-gray-400">Install as a privileged system app.</p>
            </div>
            <Toggle checked={isSystemApp} onChange={() => setIsSystemApp((v) => !v)} />
          </div>
        </div>

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
            className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
