import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal';
import { resetUserPassword } from '../../api/users';
import type { User } from '../../types/user';

interface Props {
  user: User;
  onClose: () => void;
}

export default function ResetPasswordModal({ user, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user.id, { newPassword }),
    onSuccess: () => setDone(true),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal title={`Reset Password — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Password reset. Share the new password with the user through a secure channel.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
              {mutation.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
