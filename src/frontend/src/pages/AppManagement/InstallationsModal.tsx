import { useQuery } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import { getInstallations } from '../../api/appPackages';
import type { AppPackage, InstallStatus } from '../../types/appPackage';

interface Props {
  app: AppPackage;
  onClose: () => void;
}

const STATUS_STYLES: Record<InstallStatus, string> = {
  Pending: 'bg-gray-100 text-gray-600',
  Sent: 'bg-blue-50 text-blue-700',
  Installed: 'bg-green-100 text-green-700',
  Uninstalled: 'bg-gray-100 text-gray-600',
  Failed: 'bg-red-50 text-red-600',
  Skipped: 'bg-amber-50 text-amber-700',
  Unknown: 'bg-gray-100 text-gray-500',
};

export default function InstallationsModal({ app, onClose }: Props) {
  const { data: installations = [], isLoading } = useQuery({
    queryKey: ['app-installations', app.id],
    queryFn: () => getInstallations(app.id),
  });

  return (
    <Modal title={`Deployments — ${app.name}`} onClose={onClose}>
      <div className="max-h-96 overflow-y-auto -mx-1">
        {isLoading ? (
          <p className="text-center py-8 text-sm text-gray-400">Loading...</p>
        ) : installations.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-400">This app hasn't been pushed to any device yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Device</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {installations.map((i) => (
                <tr key={i.id}>
                  <td className="px-2 py-2 text-gray-800">{i.deviceName || i.deviceId.slice(0, 8)}</td>
                  <td className="px-2 py-2 text-gray-500">{i.action}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status]}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-gray-400 text-xs">{new Date(i.createdOn).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
