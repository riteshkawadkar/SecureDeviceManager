import type { OsDistributionItem } from '../../types/dashboard';

interface Props {
  data: OsDistributionItem[];
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

export default function OsBarChart({ data }: Props) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.version} className="flex items-center gap-3">
          <span className="text-sm text-gray-700 w-24 shrink-0">{item.version}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full"
              style={{
                width: `${Math.round((item.count / data[0].count) * 100)}%`,
                backgroundColor: COLORS[i % COLORS.length]
              }}
            />
          </div>
          <span className="text-sm text-gray-500 w-12 text-right">{item.count}</span>
        </div>
      ))}
      <p className="text-xs text-gray-400 text-right">Total enrolled: {data.reduce((s, d) => s + d.count, 0)}</p>
    </div>
  );
}
