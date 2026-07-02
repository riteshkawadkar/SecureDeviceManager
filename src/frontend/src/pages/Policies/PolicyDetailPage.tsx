import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Info, Pencil, Trash2, Shield, Clock, CheckCircle, Tablet, Globe, X, Play, Camera,
} from 'lucide-react';
import { getPolicy, updatePolicy, deletePolicy, togglePolicy, enforcePolicy } from '../../api/policies';
import type { Policy, UpdatePolicyRequest, PolicyEnforceResult } from '../../types/policy';

/* ── Shared badge helpers (mirrors PoliciesPage) ───────────────────────────── */
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
interface StatProps { title: string; value: string | number; subtitle: string; subtitleCls?: string; icon: React.ReactNode }
function StatCard({ title, value, subtitle, subtitleCls = 'text-gray-400', icon }: StatProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        <p className={`text-xs mt-1.5 ${subtitleCls}`}>{subtitle}</p>
      </div>
      <div className="text-gray-300 shrink-0 mt-0.5">{icon}</div>
    </div>
  );
}

/* ── Delete confirmation modal ──────────────────────────────────────────────── */
function DeleteModal({ name, onCancel, onConfirm, isDeleting }: {
  name: string; onCancel: () => void; onConfirm: () => void; isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog" aria-modal="true" aria-label="Delete Policy"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Delete Policy</h2>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <strong className="text-gray-900">{name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────────────── */
const CATEGORIES = ['Security', 'AppManagement', 'WebFiltering', 'DLP', 'Compliance', 'Network', 'DeviceFeatures'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
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

function EditModal({ policy, onClose, onSave, isSaving }: {
  policy: Policy; onClose: () => void;
  onSave: (data: UpdatePolicyRequest) => void; isSaving: boolean;
}) {
  const [name, setName] = useState(policy.name);
  const [category, setCategory] = useState(policy.category);
  const [severity, setSeverity] = useState(policy.severity);
  const [commandType, setCommandType] = useState(policy.commandType ?? '');
  const initialTypes = policy.applicableEnrollmentTypes
    ? policy.applicableEnrollmentTypes.split(',').map((t) => t.trim())
    : ['Corporate', 'BYOD'];
  const [appliesToCorporate, setAppliesToCorporate] = useState(initialTypes.includes('Corporate'));
  const [appliesToByod, setAppliesToByod] = useState(initialTypes.includes('BYOD'));

  const commandOptions = COMMAND_OPTIONS[category] ?? [];

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const opts = COMMAND_OPTIONS[newCategory] ?? [];
    setCommandType(opts[0]?.value ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const applicableEnrollmentTypes = [appliesToCorporate && 'Corporate', appliesToByod && 'BYOD'].filter(Boolean).join(',');
    onSave({ name: name.trim(), category, severity, policyJson: policy.policyJson, commandType, applicableEnrollmentTypes });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog" aria-modal="true" aria-label="Edit Policy"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Edit Policy</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-gray-600 mb-1">Policy Name</label>
            <input
              id="edit-name" type="text" name="name" autoComplete="off" spellCheck={false}
              value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-category" className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                id="edit-category" name="category" value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{TYPE_META[c]?.label ?? c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="edit-severity" className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <select
                id="edit-severity" name="severity" value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {commandOptions.length > 0 && (
            <div>
              <label htmlFor="edit-command" className="block text-xs font-medium text-gray-600 mb-1">Command</label>
              <select
                id="edit-command" name="commandType" value={commandType}
                onChange={(e) => setCommandType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <option value="">— None —</option>
                {commandOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >Cancel</button>
            <button
              type="submit" disabled={isSaving || !name.trim() || (!appliesToCorporate && !appliesToByod)}
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── PolicyJson renderer (generic fallback) ─────────────────────────────────── */
function PolicySettings({ policyJson }: { policyJson: string }) {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(policyJson); } catch { /* ignore */ }

  const entries = Object.entries(parsed).filter(([k]) => k !== 'description');
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 italic">No settings configured.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (c) => c.toUpperCase())
          .trim();

        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {(value as string[]).map((v) => (
                  <span key={v} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                    {String(v)}
                  </span>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm text-gray-800">{String(value)}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function parsePolicyJson(json: string): Record<string, unknown> {
  try { return JSON.parse(json) as Record<string, unknown>; } catch { return {}; }
}

function getPolicyType(policy: Policy): string {
  const p = parsePolicyJson(policy.policyJson);
  return typeof p.type === 'string' ? p.type : '';
}

/* ── Website Restrictions inline editor ─────────────────────────────────────── */
function WebRestrictionSettings({ policy, onSave, isSaving }: {
  policy: Policy;
  onSave: (policyJson: string) => void;
  isSaving: boolean;
}) {
  const [blockedUrls, setBlockedUrls] = useState<string[]>(() => {
    const p = parsePolicyJson(policy.policyJson);
    return Array.isArray(p.blockedUrls) ? (p.blockedUrls as string[]) : [];
  });
  const [allowedUrls, setAllowedUrls] = useState<string[]>(() => {
    const p = parsePolicyJson(policy.policyJson);
    return Array.isArray(p.allowedUrls) ? (p.allowedUrls as string[]) : [];
  });
  const [newBlocked, setNewBlocked] = useState('');
  const [newAllowed, setNewAllowed] = useState('');

  useEffect(() => {
    const p = parsePolicyJson(policy.policyJson);
    setBlockedUrls(Array.isArray(p.blockedUrls) ? (p.blockedUrls as string[]) : []);
    setAllowedUrls(Array.isArray(p.allowedUrls) ? (p.allowedUrls as string[]) : []);
  }, [policy.policyJson]);

  const isDirty = useMemo(() => {
    const p = parsePolicyJson(policy.policyJson);
    const savedBlocked = Array.isArray(p.blockedUrls) ? (p.blockedUrls as string[]) : [];
    const savedAllowed = Array.isArray(p.allowedUrls) ? (p.allowedUrls as string[]) : [];
    return (
      JSON.stringify(blockedUrls) !== JSON.stringify(savedBlocked) ||
      JSON.stringify(allowedUrls) !== JSON.stringify(savedAllowed)
    );
  }, [blockedUrls, allowedUrls, policy.policyJson]);

  const addBlocked = () => {
    const url = newBlocked.trim();
    if (url && !blockedUrls.includes(url)) {
      setBlockedUrls((prev) => [...prev, url]);
      setNewBlocked('');
    }
  };

  const addAllowed = () => {
    const url = newAllowed.trim();
    if (url && !allowedUrls.includes(url)) {
      setAllowedUrls((prev) => [...prev, url]);
      setNewAllowed('');
    }
  };

  const handleSave = () => {
    const base = parsePolicyJson(policy.policyJson);
    onSave(JSON.stringify({ ...base, blockedUrls, allowedUrls }));
  };

  return (
    <div className="space-y-6">
      {/* Browser applicability notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Globe size={16} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Applies to Google Chrome on Android</p>
          <p className="text-xs text-blue-600 mt-1">
            URL filters are pushed via <strong>Android Managed Configurations</strong> using the Chrome Enterprise{' '}
            <code className="bg-blue-100 px-1 rounded">URLBlocklist</code> and{' '}
            <code className="bg-blue-100 px-1 rounded">URLAllowlist</code> policies.
            Only <strong>Google Chrome</strong> respects these managed config keys — Firefox, Samsung Internet,
            Opera, and other browsers on the same device are <em>not</em> affected.
          </p>
        </div>
      </div>

      {/* Pattern syntax hint */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-700">Chrome URL filter pattern syntax</p>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p><code className="bg-white border border-gray-200 px-1 rounded">*.example.com</code> — all subdomains of example.com</p>
          <p><code className="bg-white border border-gray-200 px-1 rounded">example.com/path</code> — a specific path prefix</p>
          <p><code className="bg-white border border-gray-200 px-1 rounded">https://example.com</code> — HTTPS only</p>
          <p><code className="bg-white border border-gray-200 px-1 rounded">*</code> — everything (use in blocklist with a specific allowlist)</p>
        </div>
      </div>

      {/* Blocked URLs */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-0.5">Blocked URLs</p>
        <p className="text-xs text-gray-500 mb-3">
          Chrome will show an error page for any URL matching these patterns.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newBlocked}
            onChange={(e) => setNewBlocked(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBlocked(); } }}
            placeholder="e.g. *.facebook.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          />
          <button
            type="button"
            onClick={addBlocked}
            disabled={!newBlocked.trim()}
            className="px-3 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
          >
            + Block
          </button>
        </div>
        {blockedUrls.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No blocked URLs — all URLs are accessible in Chrome.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blockedUrls.map((url) => (
              <span
                key={url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"
              >
                {url}
                <button
                  type="button"
                  onClick={() => setBlockedUrls((prev) => prev.filter((u) => u !== url))}
                  aria-label={`Remove ${url} from blocked list`}
                  className="hover:text-red-900 focus-visible:outline-none rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Allowed URLs */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-0.5">Allowed URLs</p>
        <p className="text-xs text-gray-500 mb-3">
          These URLs are explicitly permitted in Chrome, overriding any matching block rule above.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newAllowed}
            onChange={(e) => setNewAllowed(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllowed(); } }}
            placeholder="e.g. intranet.company.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          />
          <button
            type="button"
            onClick={addAllowed}
            disabled={!newAllowed.trim()}
            className="px-3 py-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition-colors"
          >
            + Allow
          </button>
        </div>
        {allowedUrls.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No explicit allowlist — Chrome access is determined solely by the block rules above.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowedUrls.map((url) => (
              <span
                key={url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
              >
                {url}
                <button
                  type="button"
                  onClick={() => setAllowedUrls((prev) => prev.filter((u) => u !== url))}
                  aria-label={`Remove ${url} from allowed list`}
                  className="hover:text-green-900 focus-visible:outline-none rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400">
          {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

/* ── Camera Settings ────────────────────────────────────────────────────────── */
const CAMERA_COMMAND_LABELS: Record<string, string> = {
  DisableCamera: 'Disable Camera',
  EnableCamera: 'Enable Camera',
};

function CameraSettings({ commandType }: { commandType: string }) {
  const isDisable = commandType === 'DisableCamera';
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-lg p-4 border ${
        isDisable ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
      }`}>
        <Camera size={16} className={`shrink-0 mt-0.5 ${isDisable ? 'text-red-500' : 'text-green-600'}`} aria-hidden="true" />
        <div>
          <p className={`text-sm font-semibold ${isDisable ? 'text-red-800' : 'text-green-800'}`}>
            {isDisable ? 'Camera will be disabled on enrolled devices' : 'Camera will be re-enabled on enrolled devices'}
          </p>
          <p className={`text-xs mt-1 ${isDisable ? 'text-red-600' : 'text-green-600'}`}>
            Uses Android <strong>DevicePolicyManager.setCameraDisabled()</strong> via Device Admin.
            Only requires Device Admin — no Device Owner needed.
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {[
          ['Command', CAMERA_COMMAND_LABELS[commandType] ?? commandType],
          ['Payload', 'None required'],
          ['Privilege', 'Device Admin'],
          ['Effect', isDisable ? 'Blocks all camera apps' : 'Restores camera access'],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
            <dd className="text-sm font-semibold text-gray-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-gray-400">
        Click <strong>Enforce on Devices</strong> in the header to dispatch this command to all enrolled devices now.
      </p>
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────────── */
type Tab = 'settings' | 'assignments' | 'overview';

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('settings');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [enforceResult, setEnforceResult] = useState<PolicyEnforceResult | null>(null);

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePolicyRequest) => updatePolicy(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy', id] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePolicy(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      navigate('/policies');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () => togglePolicy(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy', id] });
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const enforceMutation = useMutation({
    mutationFn: () => enforcePolicy(id!),
    onSuccess: (result) => {
      setEnforceResult(result);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" aria-label="Loading…" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Shield size={40} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
        <p className="font-medium">Policy not found.</p>
        <Link to="/policies" className="text-sm text-violet-600 hover:underline mt-2 inline-block">
          Back to Policies
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'assignments', label: 'Assignments (0)' },
    { key: 'overview', label: 'Overview' },
  ];

  return (
    <>
      {showEdit && (
        <EditModal
          policy={policy}
          onClose={() => setShowEdit(false)}
          onSave={(data) => updateMutation.mutate(data, { onSuccess: () => setShowEdit(false) })}
          isSaving={updateMutation.isPending}
        />
      )}
      {showDelete && (
        <DeleteModal
          name={policy.name}
          onCancel={() => setShowDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => navigate('/policies')}
              aria-label="Back to Policies"
              className="mt-1 p-1 rounded-md text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors shrink-0"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 text-balance">{policy.name}</h1>
                <TypeBadge category={policy.category} />
                <EnrollmentTypesBadges applicableEnrollmentTypes={policy.applicableEnrollmentTypes} />
                <button
                  onClick={() => toggleMutation.mutate()}
                  disabled={toggleMutation.isPending}
                  aria-label={policy.isEnabled ? 'Deactivate policy' : 'Activate policy'}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-full"
                >
                  <StatusBadge isEnabled={policy.isEnabled} />
                </button>
              </div>
              {getDescription(policy) && (
                <p className="text-sm text-gray-500 mt-0.5">{getDescription(policy)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              aria-label="About this policy"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              <Info size={15} aria-hidden="true" />
            </button>
            {policy.commandType && (
              <button
                onClick={() => { setEnforceResult(null); enforceMutation.mutate(); }}
                disabled={enforceMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
              >
                <Play size={14} aria-hidden="true" />
                {enforceMutation.isPending ? 'Enforcing…' : 'Enforce on Devices'}
              </button>
            )}
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>

        {/* ── Enforce result banner ── */}
        {enforceResult && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle size={16} className="text-green-600 shrink-0" aria-hidden="true" />
            <p className="text-sm text-green-800">
              Command dispatched to <strong>{enforceResult.commandsSent}</strong> of{' '}
              <strong>{enforceResult.totalDevices}</strong> enrolled device{enforceResult.totalDevices !== 1 ? 's' : ''}.
            </p>
            <button
              onClick={() => setEnforceResult(null)}
              aria-label="Dismiss"
              className="ml-auto text-green-500 hover:text-green-700 focus-visible:outline-none"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {enforceMutation.isError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-800">
              {(enforceMutation.error as Error)?.message ?? 'Failed to enforce policy. Check that the policy has a command configured.'}
            </p>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Assignments"
            value={0}
            subtitle="Devices and groups"
            icon={<Tablet size={22} />}
          />
          <StatCard
            title="Enforced"
            value={0}
            subtitle="Successfully applied"
            icon={<CheckCircle size={22} />}
          />
          <StatCard
            title="Pending"
            value={0}
            subtitle="Awaiting enforcement"
            icon={<Clock size={22} />}
          />
          <StatCard
            title="Compliance Rate"
            value="0%"
            subtitle="0 failed enforcements"
            subtitleCls="text-gray-400"
            icon={<Shield size={22} />}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                role="tab"
                aria-selected={isActive}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  isActive
                    ? 'border-violet-600 text-gray-900 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        {tab === 'settings' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Policy Settings</h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-5">Configured rules and requirements for this policy</p>
            {(policy.commandType === 'DisableCamera' || policy.commandType === 'EnableCamera') ? (
              <CameraSettings commandType={policy.commandType} />
            ) : getPolicyType(policy) === 'website_restrictions' ? (
              <WebRestrictionSettings
                policy={policy}
                onSave={(policyJson) =>
                  updateMutation.mutate({
                    name: policy.name,
                    category: policy.category,
                    severity: policy.severity,
                    policyJson,
                    commandType: policy.commandType,
                  })
                }
                isSaving={updateMutation.isPending}
              />
            ) : (
              <PolicySettings policyJson={policy.policyJson} />
            )}
          </div>
        )}

        {tab === 'assignments' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Tablet size={36} className="mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">No assignments yet</p>
              <p className="text-xs mt-1">Assign this policy to devices or groups to enforce it.</p>
            </div>
          </div>
        )}

        {tab === 'overview' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Policy Overview</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Name', policy.name],
                ['Type', TYPE_META[policy.category]?.label ?? policy.category],
                ['Severity', policy.severity],
                ['Status', policy.isEnabled ? 'Active' : 'Draft'],
                ['Applies To', policy.applicableEnrollmentTypes || 'Corporate,BYOD'],
                ['Command', policy.commandType || '—'],
                ['Created', new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(policy.createdOn))],
                ['Created By', 'Admin User'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
                  <dd className="text-sm font-semibold text-gray-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </>
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
