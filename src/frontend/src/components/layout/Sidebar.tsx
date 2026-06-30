import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Smartphone, Shield, Zap, AppWindow,
  FileBarChart, Settings, HelpCircle, LogOut, Layers, X,
} from 'lucide-react';

const navItems = [
  {
    group: 'MANAGEMENT',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/devices', icon: Smartphone, label: 'Devices' },
      { to: '/policies', icon: Shield, label: 'Policies' },
      { to: '/bulk-policies', icon: Layers, label: 'Bulk Deploy' },
      { to: '/remote-actions', icon: Zap, label: 'Remote Actions' },
      { to: '/app-management', icon: AppWindow, label: 'App Management' },
      { to: '/reports', icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/support', icon: HelpCircle, label: 'Support' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('sdm_token');
    navigate('/login');
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-gray-900 text-white shrink-0',
          'transition-transform duration-200',
          'md:relative md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700/60 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield size={15} className="text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-tight">MDM Console</p>
            <p className="text-xs text-gray-400 leading-tight">Enterprise Android</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="md:hidden p-1 text-gray-400 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
          {navItems.map(({ group, items }) => (
            <div key={group}>
              <p className="px-2 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-700/60 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Admin</p>
              <p className="text-[11px] text-gray-400 truncate">IT Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <LogOut size={13} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
