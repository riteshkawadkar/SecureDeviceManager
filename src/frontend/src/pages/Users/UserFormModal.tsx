import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import { createUser, updateUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import type { Role, User } from '../../types/user';

interface Props {
  roles: Role[];
  user?: User;
  onClose: () => void;
}

export default function UserFormModal({ roles, user, onClose }: Props) {
  const isEdit = !!user;
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? '');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateUser(user.id, { firstName, lastName, roleId, isActive })
        : createUser({ firstName, lastName, email, password, roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setError(message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate();
  }

  const isSelf = isEdit && user.id === me?.id;

  return (
    <Modal title={isEdit ? 'Edit User' : 'Add User'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isEdit}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={isSelf}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {isSelf && <p className="text-xs text-gray-400 mt-1">You cannot change your own role.</p>}
        </div>

        {isEdit && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">Active</label>
            <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} disabled={isSelf} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
