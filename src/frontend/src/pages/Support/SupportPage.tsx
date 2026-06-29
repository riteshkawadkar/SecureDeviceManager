import { HelpCircle, MessageSquare, BookOpen, ExternalLink } from 'lucide-react';

const links = [
  { title: 'Documentation', desc: 'Guides, API reference, and setup instructions', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', href: '#' },
  { title: 'Contact IT Support', desc: 'Reach the IT help desk for technical issues', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', href: 'mailto:support@corp.com' },
  { title: 'Release Notes', desc: 'What\'s new in each version of MDM Console', icon: ExternalLink, color: 'text-purple-600', bg: 'bg-purple-50', href: '#' },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Support</h1>
        <p className="text-sm text-gray-500">Get help with MDM Console</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {links.map((l) => (
          <a
            key={l.title}
            href={l.href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:border-gray-200 hover:shadow transition-all"
          >
            <div className={`w-10 h-10 ${l.bg} rounded-xl flex items-center justify-center`}>
              <l.icon size={17} className={l.color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{l.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{l.desc}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <HelpCircle size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">Need further help?</p>
        <p className="text-xs text-gray-400 mt-1">
          Email{' '}
          <a href="mailto:support@corp.com" className="text-blue-600 hover:underline">
            support@corp.com
          </a>{' '}
          and our IT team will get back to you within 24 hours.
        </p>
      </div>
    </div>
  );
}
