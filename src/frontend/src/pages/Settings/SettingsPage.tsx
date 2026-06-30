import { Settings, Server, Bell, Shield, Key } from 'lucide-react';
import AndroidEnterpriseSection from './AndroidEnterpriseSection';

const sections = [
  { title: 'General', desc: 'Organization name, timezone, language', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  { title: 'Server & API', desc: 'Backend URL, API keys, webhook endpoints', icon: Server, color: 'text-blue-600', bg: 'bg-blue-50' },
  { title: 'Notifications', desc: 'Email alerts, push thresholds, escalation rules', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
  { title: 'Security', desc: 'Password policy, session timeout, MFA', icon: Shield, color: 'text-red-500', bg: 'bg-red-50' },
  { title: 'API Access', desc: 'Manage API tokens and developer access', icon: Key, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">System configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:border-gray-200 hover:shadow transition-all"
          >
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon size={17} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">{s.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <AndroidEnterpriseSection />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <Settings size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">Settings panel coming soon</p>
        <p className="text-xs text-gray-400 mt-1">Full configuration UI will be available in a future release</p>
      </div>
    </div>
  );
}
