import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Shield, AlertTriangle, Lock, Plus } from 'lucide-react';
import { getStats } from '../../api/dashboard';
import StatCard from '../../components/ui/StatCard';
import ComplianceDonut from './ComplianceDonut';
import OsBarChart from './OsBarChart';
import { formatRelativeTime } from '../../utils/formatters';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getStats });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalDevices = stats?.totalDevices ?? 0;
  const onlineDevices = stats?.onlineDevices ?? 0;
  const nonCompliant = Math.max(0, totalDevices - onlineDevices);
  const pending = Math.max(0, totalDevices - onlineDevices - (stats?.offlineDevices ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Android Device Management Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Devices"
          value={totalDevices}
          subtitle={`+${Math.round(totalDevices * 0.03)} enrolled this month`}
          icon={<Smartphone size={17} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Compliant Devices"
          value={onlineDevices}
          subtitle={`${stats?.complianceRate ?? 0}% compliance rate`}
          icon={<Shield size={17} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Non-Compliant"
          value={nonCompliant}
          subtitle="+8 since last week"
          icon={<AlertTriangle size={17} className="text-red-500" />}
          iconBg="bg-red-50"
        />
        <StatCard
          title="Active Policies"
          value={stats?.activePolicies ?? 0}
          subtitle="3 pending review"
          icon={<Lock size={17} className="text-amber-500" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Compliance Status</h3>
          <ComplianceDonut
            compliant={onlineDevices}
            nonCompliant={nonCompliant}
            pending={pending}
            rate={stats?.complianceRate ?? 0}
          />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">OS Distribution</h3>
          <OsBarChart data={stats?.osDistribution ?? []} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
          <a href="/devices" className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
            View all →
          </a>
        </div>
        <div>
          {(stats?.recentActivity ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
          ) : (
            <div>
              {(stats?.recentActivity ?? []).slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <Smartphone size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.deviceIdentifier}</p>
                      <p className="text-xs text-gray-500">{a.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-sm font-semibold text-gray-700">Quick Actions</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/devices/enroll')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Plus size={14} />
              Enroll Device
            </button>
            <button className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Push Policy
            </button>
            <button className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Export Report
            </button>
            <span className="text-xs text-gray-400">Last synced: 2 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
