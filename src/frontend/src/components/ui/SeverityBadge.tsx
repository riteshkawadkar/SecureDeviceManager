interface Props {
  severity: string;
}

export default function SeverityBadge({ severity }: Props) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  const cls = map[severity.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{severity}</span>;
}
