import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  compliant: number;
  nonCompliant: number;
  pending: number;
  rate: number;
}

export default function ComplianceDonut({ compliant, nonCompliant, pending, rate }: Props) {
  const data = [
    { name: 'Compliant', value: compliant, color: '#22c55e' },
    { name: 'Non-Compliant', value: nonCompliant, color: '#ef4444' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <PieChart width={180} height={180}>
          <Pie
            data={data}
            cx={85}
            cy={85}
            innerRadius={55}
            outerRadius={80}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{rate}%</p>
            <p className="text-xs text-gray-500">Compliant</p>
          </div>
        </div>
      </div>
      <div className="space-y-1 mt-2 w-full">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </div>
            <span className="text-gray-500">{Math.round((d.value / (compliant + nonCompliant + pending)) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
