import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wifi, Shield, Globe, Bluetooth, Plus, X } from 'lucide-react';
import {
  getWifiProfiles, getVpnProfiles, getBlockedDomains, getAllowedDomains,
  deleteBlockedDomain, deleteAllowedDomain,
} from '../../api/network';
import StatCard from '../../components/ui/StatCard';

export default function NetworkPage() {
  const qc = useQueryClient();
  const { data: wifi } = useQuery({ queryKey: ['wifi'], queryFn: getWifiProfiles });
  const { data: vpn } = useQuery({ queryKey: ['vpn'], queryFn: getVpnProfiles });
  const { data: blocked } = useQuery({ queryKey: ['blocked-domains'], queryFn: getBlockedDomains });
  const { data: allowed } = useQuery({ queryKey: ['allowed-domains'], queryFn: getAllowedDomains });

  const deleteBlocked = useMutation({
    mutationFn: deleteBlockedDomain,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-domains'] }),
  });
  const deleteAllowed = useMutation({
    mutationFn: deleteAllowedDomain,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-domains'] }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Network</h1>
        <p className="text-sm text-gray-500">Wi-Fi profiles, VPN, and web traffic controls</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Wi-Fi Profiles"
          value={wifi?.length ?? 0}
          subtitle={`${wifi?.filter((w) => w.isActive).length ?? 0} currently active`}
          icon={<Wifi size={17} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="VPN Profiles"
          value={vpn?.length ?? 0}
          subtitle={`${vpn?.filter((v) => v.isActive).length ?? 0} active connections`}
          icon={<Shield size={17} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Blocked Domains"
          value={blocked?.length ?? 0}
          subtitle={`${blocked?.reduce((s, d) => s + d.blockedToday, 0) ?? 0} requests blocked today`}
          icon={<Globe size={17} className="text-red-500" />}
          iconBg="bg-red-50"
        />
        <StatCard
          title="Bluetooth"
          value="Policy"
          subtitle="Blocking enforced on all devices"
          icon={<Bluetooth size={17} className="text-amber-500" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Wi-Fi + VPN side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Wi-Fi Profiles */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Wi-Fi Profiles</h2>
            <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline">
              <Plus size={12} /> Add Profile
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">SSID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Security</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Band</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Devices</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(wifi ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-sm text-gray-400">No Wi-Fi profiles</td>
                  </tr>
                ) : (wifi ?? []).map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{w.ssid}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{w.security}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{w.band}</td>
                    <td className="px-4 py-2.5 text-gray-700">{w.deviceCount}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VPN Profiles */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">VPN Profiles</h2>
            <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline">
              <Plus size={12} /> Add Profile
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Server</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Protocol</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Devices</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(vpn ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-sm text-gray-400">No VPN profiles</td>
                  </tr>
                ) : (vpn ?? []).map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{v.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{v.server}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{v.protocol}</td>
                    <td className="px-4 py-2.5 text-gray-700">{v.deviceCount}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Blocked + Allowed Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Blocked Domains */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Blocked Domains</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 hover:underline">+ Block Domain</button>
          </div>
          <div className="divide-y divide-gray-50">
            {(blocked ?? []).length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400">No blocked domains</p>
            ) : (blocked ?? []).map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <Globe size={13} className="text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.domain}</p>
                  <span className="text-[11px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">{d.category}</span>
                </div>
                <span className="text-red-500 text-xs font-semibold shrink-0">{d.blockedToday} today</span>
                <button
                  onClick={() => deleteBlocked.mutate(d.id)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Remove domain"
                >
                  <X size={12} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Allowed Domains */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Allowlist</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 hover:underline">+ Add Domain</button>
          </div>
          <div className="divide-y divide-gray-50">
            {(allowed ?? []).length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400">No allowed domains</p>
            ) : (allowed ?? []).map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <Globe size={13} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.domain}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">{d.category}</span>
                    {d.description && <span className="text-xs text-gray-400 truncate">{d.description}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteAllowed.mutate(d.id)}
                  className="text-xs border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors text-gray-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
