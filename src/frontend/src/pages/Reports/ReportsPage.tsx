import { FileBarChart, Download, Calendar, TrendingUp } from 'lucide-react';

const reports = [
  { title: 'Device Compliance Report', desc: 'Compliance status across all enrolled devices', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  { title: 'App Inventory Report', desc: 'Installed and blocked apps summary', icon: FileBarChart, color: 'text-purple-600', bg: 'bg-purple-50' },
  { title: 'Audit Log Export', desc: 'Full activity log with timestamps', icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
  { title: 'Policy Enforcement Report', desc: 'Policy status and enforcement history', icon: FileBarChart, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and export management reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div key={r.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-10 h-10 ${r.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <r.icon size={17} className={r.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{r.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
            </div>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shrink-0">
              <Download size={12} /> Export
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <FileBarChart size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">Advanced reporting coming soon</p>
        <p className="text-xs text-gray-400 mt-1">Charts, trends, and scheduled exports will be available here</p>
      </div>
    </div>
  );
}
