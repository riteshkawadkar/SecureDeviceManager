import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Wifi, Smartphone, CheckCircle, Plus } from 'lucide-react';
import { listPolicies, togglePolicy } from '../../api/policies';
import Toggle from '../../components/ui/Toggle';
import SeverityBadge from '../../components/ui/SeverityBadge';

const categoryMeta: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  Security: {
    icon: <Shield size={16} className="text-red-500" />,
    bg: 'bg-red-50 border-red-100',
    text: 'text-red-700',
  },
  Network: {
    icon: <Wifi size={16} className="text-blue-500" />,
    bg: 'bg-blue-50 border-blue-100',
    text: 'text-blue-700',
  },
  DeviceFeatures: {
    icon: <Smartphone size={16} className="text-orange-500" />,
    bg: 'bg-orange-50 border-orange-100',
    text: 'text-orange-700',
  },
  Compliance: {
    icon: <CheckCircle size={16} className="text-green-500" />,
    bg: 'bg-green-50 border-green-100',
    text: 'text-green-700',
  },
};

const categories = ['Security', 'Network', 'DeviceFeatures', 'Compliance'];

export default function PoliciesPage() {
  const qc = useQueryClient();
  const { data: policies, isLoading } = useQuery({ queryKey: ['policies'], queryFn: listPolicies });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => togglePolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  const activeCounts = categories.map((cat) => ({
    cat,
    active: (policies ?? []).filter((p) => p.category === cat && p.isEnabled).length,
    total: (policies ?? []).filter((p) => p.category === cat).length,
  }));

  const passwordPolicy = (policies ?? []).find((p) => p.name === 'Password Policy Enforcement');
  let pwSettings: Record<string, string> = {};
  try {
    if (passwordPolicy) pwSettings = JSON.parse(passwordPolicy.policyJson);
  } catch { /* ignore */ }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Policy Management</h1>
        <p className="text-sm text-gray-500">Configure and deploy Android device restrictions</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activeCounts.map(({ cat, active, total }) => {
          const meta = categoryMeta[cat] ?? { icon: null, bg: 'bg-gray-50 border-gray-100', text: 'text-gray-700' };
          return (
            <div key={cat} className={`rounded-xl p-4 border ${meta.bg} flex items-center gap-3`}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                {meta.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{cat}</p>
                <p className="text-xs text-gray-500">
                  <span className={`font-medium ${meta.text}`}>{active}</span>/{total} active
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restriction Policies Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Restriction Policies</h2>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={12} /> Add Policy
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Policy
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Category
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Severity
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td>
              </tr>
            ) : (policies ?? []).map((policy) => (
              <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      {categoryMeta[policy.category]?.icon ?? <Shield size={13} className="text-gray-500" />}
                    </div>
                    <span className="font-medium text-gray-800">{policy.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-gray-500">{policy.category}</span>
                </td>
                <td className="px-5 py-3.5">
                  <SeverityBadge severity={policy.severity} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-3">
                    <span className={`text-xs font-medium ${policy.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {policy.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Toggle
                      checked={policy.isEnabled}
                      onChange={() => toggleMutation.mutate(policy.id)}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Policy Settings */}
      {passwordPolicy && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Password Policy Settings</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 hover:underline">Edit</button>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ['Minimum Length', `${pwSettings.minLength ?? 8} characters`],
              ['Complexity', pwSettings.complexity ?? 'Alphanumeric'],
              ['Expiry', `${pwSettings.expiryDays ?? 90} days`],
              ['Failed Attempts', `${pwSettings.maxFailedAttempts ?? 5} max, then wipe`],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
