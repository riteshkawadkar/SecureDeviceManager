import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Pencil, Trash2, Smartphone } from 'lucide-react';
import {
  listDeviceGroups, createDeviceGroup, updateDeviceGroup, deleteDeviceGroup,
  type CreateDeviceGroupRequest, type UpdateDeviceGroupRequest,
} from '../../api/deviceGroups';
import type { DeviceGroup } from '../../types/device';
import Modal from '../../components/ui/Modal';

interface GroupFormProps {
  title: string;
  initial?: DeviceGroup;
  onClose: () => void;
  onSave: (data: CreateDeviceGroupRequest) => void;
  isSaving: boolean;
}

function GroupFormModal({ title, initial, onClose, onSave, isSaving }: GroupFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, category: category.trim() || undefined });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Team"
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Department, Region"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function DeviceGroupsPage() {
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ['device-groups'], queryFn: listDeviceGroups });

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DeviceGroup | null>(null);

  const createMutation = useMutation({
    mutationFn: createDeviceGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-groups'] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateDeviceGroupRequest) => updateDeviceGroup(editing!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-groups'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeviceGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-groups'] }),
  });

  function handleDelete(group: DeviceGroup) {
    if (confirm(`Delete group "${group.name}"? Devices in this group will become ungrouped.`)) {
      deleteMutation.mutate(group.id);
    }
  }

  return (
    <div className="space-y-5">
      {showCreate && (
        <GroupFormModal
          title="Create Device Group"
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate(data)}
          isSaving={createMutation.isPending}
        />
      )}
      {editing && (
        <GroupFormModal
          title="Edit Device Group"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMutation.mutate(data)}
          isSaving={updateMutation.isPending}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <Layers size={18} className="text-gray-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Device Groups</h1>
            <p className="text-sm text-gray-500">Organize devices by department, region, or category</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> New Group
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Devices</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading groups...</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No device groups yet</td></tr>
              ) : groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{group.name}</td>
                  <td className="px-4 py-3">
                    {group.category ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {group.category}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{group.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone size={13} className="text-gray-400" /> {group.deviceCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing(group)}
                        aria-label={`Edit ${group.name}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${group.name}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
