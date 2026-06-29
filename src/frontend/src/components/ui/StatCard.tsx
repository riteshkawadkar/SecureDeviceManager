import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
}

export default function StatCard({ title, value, subtitle, icon, iconBg = 'bg-blue-50' }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1.5 leading-snug">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
