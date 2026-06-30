import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, Pencil, KeyRound, Trash2 } from 'lucide-react';
import { listUsers, deleteUser, listRoles } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import UserFormModal from './UserFormModal';
import ResetPasswordModal from './ResetPasswordModal';
import type { User } from '../../types/user';

export default function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: listRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-action-menu]')) setOpenMenuId(null);
    }
    function onScroll() { setOpenMenuId(null); }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  function openMenu(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(id);
  }

  function handleDelete(user: User) {
    if (confirm(`Remove ${user.firstName} ${user.lastName}? This cannot be undone.`)) {
      deleteMutation.mutate(user.id);
      setOpenMenuId(null);
    }
  }

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} admin console users</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 shrink-0"
        >
          <Plus size={14} /> Add User
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-72"
      />

      {/* Mobile card list */}
      <div className="md:hidden bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">No users found</p>
          ) : filtered.map((u) => (
            <div key={u.id} className="flex items-start gap-3 px-4 py-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xs text-blue-600 font-bold">{u.firstName[0]}{u.lastName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900 leading-tight truncate">{u.firstName} {u.lastName}</p>
                  <button
                    data-action-menu={u.id}
                    onClick={(e) => openMenu(u.id, e)}
                    aria-label="User actions"
                    className={`p-2 rounded-md shrink-0 -mr-1 touch-manipulation ${openMenuId === u.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                  >
                    <MoreHorizontal size={15} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 leading-tight truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <RoleBadge role={u.roleName} />
                  <StatusDot active={u.isActive} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table — tablet/desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-gray-400">No users found</td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs text-blue-600 font-bold">{u.firstName[0]}{u.lastName[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400 leading-tight">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.roleName} /></td>
                  <td className="px-4 py-3"><StatusDot active={u.isActive} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdOn).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      data-action-menu={u.id}
                      onClick={(e) => openMenu(u.id, e)}
                      className={`p-1.5 rounded-md transition-colors ${openMenuId === u.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                    >
                      <MoreHorizontal size={15} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portal dropdown */}
      {openMenuId && menuPos && createPortal(
        <div
          data-action-menu={openMenuId}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 bg-white rounded-lg border border-gray-100 shadow-xl py-1"
        >
          <button
            onClick={() => { setEditingUser(filtered.find((u) => u.id === openMenuId) ?? null); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} className="text-gray-400" />
            Edit
          </button>
          <button
            onClick={() => { setResettingUser(filtered.find((u) => u.id === openMenuId) ?? null); setOpenMenuId(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <KeyRound size={14} className="text-gray-400" />
            Reset Password
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => {
              const user = filtered.find((u) => u.id === openMenuId);
              if (user) handleDelete(user);
            }}
            disabled={openMenuId === me?.id || deleteMutation.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>,
        document.body,
      )}

      {creating && (
        <UserFormModal roles={roles} onClose={() => setCreating(false)} />
      )}
      {editingUser && (
        <UserFormModal roles={roles} user={editingUser} onClose={() => setEditingUser(null)} />
      )}
      {resettingUser && (
        <ResetPasswordModal user={resettingUser} onClose={() => setResettingUser(null)} />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    SuperAdmin: 'bg-purple-50 text-purple-700 border-purple-100',
    Admin: 'bg-blue-50 text-blue-700 border-blue-100',
    Operator: 'bg-amber-50 text-amber-700 border-amber-100',
    Viewer: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role] ?? styles.Viewer}`}>
      {role}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className={active ? 'text-green-700' : 'text-gray-500'}>{active ? 'Active' : 'Inactive'}</span>
    </span>
  );
}
