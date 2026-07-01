import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import { createAppPackage, updateAppPackage, uploadApk } from '../../api/appPackages';
import type { AppPackage } from '../../types/appPackage';

interface Props {
  app?: AppPackage;
  onClose: () => void;
}

type ApkSource = 'upload' | 'url';

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

  const [apkSource, setApkSource] = useState<ApkSource>('url');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsUploading(true);
    try {
      const result = await uploadApk(file);
      setApkUrl(result.url);
      setUploadedFileName(file.name);
    } catch {
      setError('APK upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!apkUrl) {
      setError(apkSource === 'upload' ? 'Please upload an APK file.' : 'APK URL is required.');
      return;
    }
    mutation.mutate();
  }

  function switchSource(src: ApkSource) {
    setApkSource(src);
    if (src !== apkSource) {
      setApkUrl('');
      setUploadedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

        {/* APK source toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">APK source</label>
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit">
            <button
              type="button"
              onClick={() => switchSource('upload')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                apkSource === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload APK
            </button>
            <button
              type="button"
              onClick={() => switchSource('url')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                apkSource === 'url'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enter URL
            </button>
          </div>
        </div>

        {apkSource === 'upload' ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk"
              onChange={handleFileChange}
              className="hidden"
              id="apk-file-input"
            />
            <label
              htmlFor="apk-file-input"
              className={`flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadedFileName
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                </>
              ) : uploadedFileName ? (
                <>
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700 font-medium truncate">{uploadedFileName}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">Click to replace</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-sm text-gray-500">Click to select an <span className="font-semibold">.apk</span> file</span>
                </>
              )}
            </label>
            <p className="text-xs text-gray-400 mt-1">File is uploaded to the SDM server and served to devices from there.</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">APK URL</label>
            <input
              value={apkUrl}
              onChange={(e) => setApkUrl(e.target.value)}
              placeholder="https://cdn.example.com/app-1.0.5.apk"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Any public URL works — S3 pre-signed, CDN, Azure Blob, or your own server.</p>
          </div>
        )}

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
            disabled={mutation.isPending || isUploading}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
