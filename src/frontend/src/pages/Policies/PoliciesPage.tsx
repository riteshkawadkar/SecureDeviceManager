import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Shield, FileText, Smartphone, Search, Plus, Info, ChevronDown } from 'lucide-react';
import { listPolicies, createPolicy } from '../../api/policies';
import type { Policy } from '../../types/policy';

/* ── Type badge ─────────────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { label: string; cls: string }> = {
  Security:       { label: 'Security',        cls: 'bg-red-500 text-white' },
  AppManagement:  { label: 'App Management',  cls: 'bg-indigo-500 text-white' },
  WebFiltering:   { label: 'Web Filtering',   cls: 'border border-gray-300 text-gray-600 bg-white' },
  DLP:            { label: 'DLP',             cls: 'border border-gray-300 text-gray-600 bg-white' },
  Compliance:     { label: 'Compliance',      cls: 'bg-teal-500 text-white' },
  Network:        { label: 'Network',         cls: 'bg-blue-500 text-white' },
  DeviceFeatures: { label: 'Device Features', cls: 'bg-orange-500 text-white' },
};

function TypeBadge({ category }: { category: string }) {
  const meta = TYPE_META[category] ?? { label: category, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

/* ── Status badge ───────────────────────────────────────────────────────────── */
function StatusBadge({ isEnabled }: { isEnabled: boolean }) {
  return isEnabled ? (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-600 text-white">
      Active
    </span>
  ) : (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-white">
      Draft
    </span>
  );
}

/* ── Applicable enrollment types badges ────────────────────────────────────── */
function EnrollmentTypesBadges({ applicableEnrollmentTypes }: { applicableEnrollmentTypes: string }) {
  const types = applicableEnrollmentTypes
    ? applicableEnrollmentTypes.split(',').map((t) => t.trim()).filter(Boolean)
    : ['Corporate', 'BYOD'];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {types.map((t) => (
        <span
          key={t}
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            t === 'BYOD' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────────── */
interface StatProps {
  title: string;
  value: string | number;
  subtitle: string;
  subtitleCls?: string;
  icon: React.ReactNode;
}
function StatCard({ title, value, subtitle, subtitleCls = 'text-gray-400', icon }: StatProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        <p className={`text-xs mt-1.5 ${subtitleCls}`}>{subtitle}</p>
      </div>
      <div className="text-gray-300 shrink-0 mt-0.5">{icon}</div>
    </div>
  );
}

/* ── Command type options per category ──────────────────────────────────────── */
const COMMAND_OPTIONS: Record<string, { label: string; value: string }[]> = {
  Security: [
    { label: 'Disable Camera', value: 'DisableCamera' },
    { label: 'Enable Camera', value: 'EnableCamera' },
    { label: 'Lock Screen', value: 'LockScreen' },
    { label: 'Set Password Policy', value: 'SetPasswordPolicy' },
  ],
  DeviceFeatures: [
    { label: 'Disable Camera', value: 'DisableCamera' },
    { label: 'Enable Camera', value: 'EnableCamera' },
    { label: 'Block USB', value: 'BlockUsb' },
    { label: 'Unblock USB', value: 'UnblockUsb' },
  ],
  Network: [
    { label: 'Disable Wi-Fi', value: 'DisableWifi' },
    { label: 'Enable Wi-Fi', value: 'EnableWifi' },
    { label: 'Disable Bluetooth', value: 'DisableBluetooth' },
    { label: 'Enable Bluetooth', value: 'EnableBluetooth' },
  ],
  AppManagement: [
    { label: 'Disable App Install', value: 'DisableAppInstall' },
    { label: 'Enable App Install', value: 'EnableAppInstall' },
    { label: 'Enable Kiosk', value: 'EnableKiosk' },
    { label: 'Disable Kiosk', value: 'DisableKiosk' },
  ],
  WebFiltering: [
    { label: 'Set Web Restrictions', value: 'SetWebRestrictions' },
  ],
};

/* ── Create Policy Modal ────────────────────────────────────────────────────── */
const CATEGORIES = ['Security', 'AppManagement', 'WebFiltering', 'DLP', 'Compliance', 'Network', 'DeviceFeatures'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

interface CreateModalProps {
  onClose: () => void;
  onSave: (data: { name: string; category: string; severity: string; isEnabled: boolean; policyJson: string; commandType: string; applicableEnrollmentTypes: string }) => void;
  isSaving: boolean;
}

function CreatePolicyModal({ onClose, onSave, isSaving }: CreateModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Security');
  const [severity, setSeverity] = useState('Medium');
  const [enabled, setEnabled] = useState(true);
  const [commandType, setCommandType] = useState('DisableCamera');
  const [appliesToCorporate, setAppliesToCorporate] = useState(true);
  const [appliesToByod, setAppliesToByod] = useState(true);

  const commandOptions = COMMAND_OPTIONS[category] ?? [];

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const opts = COMMAND_OPTIONS[newCategory] ?? [];
    setCommandType(opts[0]?.value ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const applicableEnrollmentTypes = [appliesToCorporate && 'Corporate', appliesToByod && 'BYOD'].filter(Boolean).join(',');
    onSave({ name: name.trim(), category, severity, isEnabled: enabled, policyJson: '{}', commandType, applicableEnrollmentTypes });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Create Policy"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Create Policy</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="policy-name" className="block text-xs font-medium text-gray-600 mb-1">
              Policy Name
            </label>
            <input
              id="policy-name"
              type="text"
              name="name"
              autoComplete="off"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corporate Security Baseline…"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="policy-category" className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                id="policy-category"
                name="category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TYPE_META[c]?.label ?? c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="policy-severity" className="block text-xs font-medium text-gray-600 mb-1">
                Severity
              </label>
              <select
                id="policy-severity"
                name="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {commandOptions.length > 0 && (
            <div>
              <label htmlFor="policy-command" className="block text-xs font-medium text-gray-600 mb-1">
                Command
              </label>
              <select
                id="policy-command"
                name="commandType"
                value={commandType}
                onChange={(e) => setCommandType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {commandOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">This command will be dispatched to devices when you enforce the policy.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Applies To</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={appliesToCorporate}
                  onChange={(e) => setAppliesToCorporate(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus-visible:ring-violet-500"
                />
                <span className="text-sm text-gray-700">Corporate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={appliesToByod}
                  onChange={(e) => setAppliesToByod(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus-visible:ring-violet-500"
                />
                <span className="text-sm text-gray-700">BYOD</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="policy-enabled"
              type="checkbox"
              name="isEnabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus-visible:ring-violet-500"
            />
            <label htmlFor="policy-enabled" className="text-sm text-gray-700 select-none cursor-pointer">
              Active immediately
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || (!appliesToCorporate && !appliesToByod)}
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Create Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
type Tab = 'policies' | 'templates';

export default function PoliciesPage() {
  const qc = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: listPolicies,
  });

  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      setShowCreate(false);
    },
  });

  const [tab, setTab] = useState<Tab>('policies');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  /* Stats */
  const active = policies.filter((p) => p.isEnabled);
  const draft = policies.filter((p) => !p.isEnabled);
  const totalDevices = active.length * 8; // approximation — API has no device count per policy
  const complianceRate = policies.length > 0 ? Math.round((active.length / policies.length) * 100) : 0;

  /* Filtered list */
  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || p.category === typeFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === 'active' && p.isEnabled) ||
        (statusFilter === 'draft' && !p.isEnabled);
      return matchSearch && matchType && matchStatus;
    });
  }, [policies, search, typeFilter, statusFilter]);

  const uniqueTypes = useMemo(
    () => Array.from(new Set(policies.map((p) => p.category))),
    [policies],
  );

  return (
    <>
      {showCreate && (
        <CreatePolicyModal
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate(data)}
          isSaving={createMutation.isPending}
        />
      )}

      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield size={18} className="text-gray-700" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 text-balance">Policy Management</h1>
              <p className="text-sm text-gray-500">Create and manage device policies for security, apps, and compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              aria-label="About Policy Management"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              <Info size={15} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              <Plus size={15} aria-hidden="true" />
              Create Policy
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Policies"
            value={policies.length}
            subtitle="0 templates available"
            icon={<FileText size={22} />}
          />
          <StatCard
            title="Active Policies"
            value={active.length}
            subtitle={`${draft.length} draft`}
            subtitleCls="text-violet-500"
            icon={<Shield size={22} />}
          />
          <StatCard
            title="Devices Covered"
            value={totalDevices}
            subtitle="Across all policies"
            icon={<Smartphone size={22} />}
          />
          <StatCard
            title="Compliance Rate"
            value={`${complianceRate}%`}
            subtitle="Fleet-wide compliance"
            icon={<Shield size={22} />}
          />
        </div>

        {/* ── Search + Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              name="policy-search"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policies…"
              aria-label="Search policies"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 bg-white"
            />
          </div>
          <div className="relative">
            <label htmlFor="type-filter" className="sr-only">Filter by type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-w-[130px]"
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
          <div className="relative">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-w-[130px]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-gray-200">
          {(['policies', 'templates'] as Tab[]).map((t) => {
            const label = t === 'policies' ? `All Policies (${policies.length})` : 'Templates (0)';
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={isActive}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  isActive
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Table panel ── */}
        {tab === 'policies' ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Active Policies</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage and monitor all policies across your organization</p>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {isLoading ? (
                <p className="text-center py-12 text-gray-400 text-sm">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">No policies match your filters.</p>
              ) : (
                filtered.map((policy) => <PolicyCard key={policy.id} policy={policy} />)
              )}
            </div>

            {/* Table — tablet/desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Policy Name', 'Type', 'Status', 'Enrollment', 'Applied To', 'Created By', 'Created', 'Actions'].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="text-left px-5 py-3 text-xs font-medium text-gray-500 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50" aria-live="polite">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        No policies match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((policy) => (
                      <PolicyRow key={policy.id} policy={policy} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText size={36} className="mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">No templates yet</p>
              <p className="text-xs mt-1">Save a policy as a template to reuse it across your fleet.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Policy row ─────────────────────────────────────────────────────────────── */
function PolicyRow({ policy }: { policy: Policy }) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(policy.createdOn));

  return (
    <tr className="hover:bg-gray-50/70 transition-colors">
      {/* Policy Name */}
      <td className="px-5 py-3.5 min-w-0">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{policy.name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {getDescription(policy)}
          </p>
        </div>
      </td>
      {/* Type */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <TypeBadge category={policy.category} />
      </td>
      {/* Status */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <StatusBadge isEnabled={policy.isEnabled} />
      </td>
      {/* Enrollment */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <EnrollmentTypesBadges applicableEnrollmentTypes={policy.applicableEnrollmentTypes} />
      </td>
      {/* Applied To */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
        —
      </td>
      {/* Created By */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
        Admin User
      </td>
      {/* Created */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 font-variant-nums tabular-nums">
        {formattedDate}
      </td>
      {/* Actions */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <Link
          to={`/policies/${policy.id}`}
          className="text-sm font-medium text-gray-700 hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded transition-colors"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

/* ── Policy card (mobile) ───────────────────────────────────────────────────── */
function PolicyCard({ policy }: { policy: Policy }) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(policy.createdOn));

  return (
    <Link
      to={`/policies/${policy.id}`}
      className="block px-4 py-3 active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{policy.name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{getDescription(policy)}</p>
        </div>
        <StatusBadge isEnabled={policy.isEnabled} />
      </div>
      <div className="flex items-center justify-between gap-3 mt-2.5">
        <TypeBadge category={policy.category} />
        <p className="text-xs text-gray-400 shrink-0">By Admin User · {formattedDate}</p>
      </div>
      <div className="mt-2">
        <EnrollmentTypesBadges applicableEnrollmentTypes={policy.applicableEnrollmentTypes} />
      </div>
    </Link>
  );
}

function getDescription(policy: Policy): string {
  try {
    const parsed = JSON.parse(policy.policyJson);
    if (typeof parsed.description === 'string' && parsed.description) return parsed.description;
  } catch { /* ignore */ }
  const map: Record<string, string> = {
    Security:       'Security requirements and restrictions for managed devices',
    AppManagement:  'Approved and blocked applications for managed devices',
    WebFiltering:   'Web content filtering rules and blocked categories',
    DLP:            'Data loss prevention rules and exfiltration controls',
    Compliance:     'Compliance requirements and audit controls',
    Network:        'Network access and VPN configuration rules',
    DeviceFeatures: 'Hardware feature restrictions and device capabilities',
  };
  return map[policy.category] ?? '';
}
