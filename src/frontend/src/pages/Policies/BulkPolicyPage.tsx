import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Shield, Smartphone, Wifi, Bluetooth, Camera, Lock, Globe,
  Package, ChevronRight, ChevronLeft, CheckCircle2, Search,
  ChevronDown, Layers, HardDrive, AlertTriangle, Loader2,
} from 'lucide-react';
import { listDevices, sendBulkCommand } from '../../api/devices';
import type { BulkCommandResult } from '../../api/devices';
import { ComplianceBadge, LiveStatusBadge } from '../../components/ui/StatusBadge';
import type { Device, PagedResult } from '../../types/device';
import { ComplianceStatus } from '../../types/device';

// ─── Policy definitions ────────────────────────────────────────────────────────

type ParamType = 'text' | 'number' | 'select' | 'textarea';

type PolicyParam = {
  key: string;
  label: string;
  type: ParamType;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number;
};

type PolicyDef = {
  id: string;
  category: string;
  icon: React.ElementType;
  label: string;
  description: string;
  requiresOwner: boolean;
  /** If present, the item has a binary direction (e.g. block vs allow). */
  binaryAction?: { trueLabel: string; falseLabel: string; trueCmd: string; falseCmd: string };
  /** Used when there is no binary direction. */
  fixedCmd?: string;
  params?: PolicyParam[];
  /** When set, params are only shown when action === this value. */
  showParamsWhen?: boolean;
};

const POLICY_DEFS: PolicyDef[] = [
  // ── Security ────────────────────────────────────────────────────────────────
  {
    id: 'password',
    category: 'Security',
    icon: Shield,
    label: 'Password Policy',
    description: 'Enforce minimum password complexity and length on all target devices',
    requiresOwner: false,
    fixedCmd: 'SetPasswordPolicy',
    params: [
      { key: 'minLength', label: 'Minimum Length', type: 'number', defaultValue: 8, placeholder: '8' },
      {
        key: 'quality',
        label: 'Complexity',
        type: 'select',
        options: ['NUMERIC', 'NUMERIC_COMPLEX', 'ALPHABETIC', 'ALPHANUMERIC', 'COMPLEX'],
        defaultValue: 'ALPHANUMERIC',
      },
    ],
  },
  {
    id: 'camera',
    category: 'Security',
    icon: Camera,
    label: 'Camera Access',
    description: 'Enable or disable the device camera system-wide',
    requiresOwner: false,
    binaryAction: { trueLabel: 'Disable', falseLabel: 'Enable', trueCmd: 'DisableCamera', falseCmd: 'EnableCamera' },
  },
  // ── Network ─────────────────────────────────────────────────────────────────
  {
    id: 'wifi',
    category: 'Network',
    icon: Wifi,
    label: 'Wi-Fi Control',
    description: 'Prevent users from modifying Wi-Fi settings',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Block changes', falseLabel: 'Allow changes', trueCmd: 'DisableWifi', falseCmd: 'EnableWifi' },
  },
  {
    id: 'bluetooth',
    category: 'Network',
    icon: Bluetooth,
    label: 'Bluetooth',
    description: 'Enable or disable Bluetooth adapter',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Disable', falseLabel: 'Enable', trueCmd: 'DisableBluetooth', falseCmd: 'EnableBluetooth' },
  },
  {
    id: 'usb',
    category: 'Network',
    icon: HardDrive,
    label: 'USB Transfer',
    description: 'Block or allow USB file transfer',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Block', falseLabel: 'Allow', trueCmd: 'BlockUsb', falseCmd: 'UnblockUsb' },
  },
  // ── Apps & Restrictions ─────────────────────────────────────────────────────
  {
    id: 'appInstall',
    category: 'Apps & Restrictions',
    icon: Package,
    label: 'App Installation',
    description: 'Control whether users can install applications',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Restrict', falseLabel: 'Allow', trueCmd: 'DisableAppInstall', falseCmd: 'EnableAppInstall' },
  },
  {
    id: 'kiosk',
    category: 'Apps & Restrictions',
    icon: Smartphone,
    label: 'Kiosk Mode',
    description: 'Lock device to a single application (task-lock / screen-pinning)',
    requiresOwner: true,
    binaryAction: { trueLabel: 'Enable', falseLabel: 'Disable', trueCmd: 'EnableKiosk', falseCmd: 'DisableKiosk' },
    params: [{ key: 'packageName', label: 'App Package Name', type: 'text', placeholder: 'com.example.app' }],
    showParamsWhen: true,
  },
  {
    id: 'webRestrictions',
    category: 'Apps & Restrictions',
    icon: Globe,
    label: 'Web Restrictions',
    description: 'Apply URL block/allow lists to Chrome via managed configuration',
    requiresOwner: true,
    fixedCmd: 'SetWebRestrictions',
    params: [
      { key: 'blockedUrls', label: 'Blocked URLs (one per line)', type: 'textarea', placeholder: '*.evil.com\nadult.com' },
      { key: 'allowedUrls', label: 'Allowed URLs (one per line)', type: 'textarea', placeholder: 'safe.internal\nwork.com' },
    ],
  },
];

// ─── Templates ────────────────────────────────────────────────────────────────

type TemplateId = 'securityBaseline' | 'kioskMode' | 'byod' | 'networkLockdown';

type PolicyItemState = {
  enabled: boolean;
  /** true = restrictive direction (disable/block), false = permissive (enable/allow) */
  action: boolean;
  params: Record<string, string | number>;
};

type PolicyState = Record<string, PolicyItemState>;

function defaultState(): PolicyState {
  const state: PolicyState = {};
  for (const def of POLICY_DEFS) {
    const params: Record<string, string | number> = {};
    for (const p of def.params ?? []) {
      if (p.defaultValue !== undefined) params[p.key] = p.defaultValue;
    }
    state[def.id] = { enabled: false, action: true, params };
  }
  return state;
}

type TemplateDef = {
  label: string;
  description: string;
  icon: React.ElementType;
  settings: Partial<PolicyState>;
};

const TEMPLATES: Record<TemplateId, TemplateDef> = {
  securityBaseline: {
    label: 'Security Baseline',
    description: 'Password policy, camera off, USB blocked — minimum corporate hardening',
    icon: Shield,
    settings: {
      password: { enabled: true, action: true, params: { minLength: 8, quality: 'ALPHANUMERIC' } },
      camera: { enabled: true, action: true, params: {} },
      usb: { enabled: true, action: true, params: {} },
    },
  },
  kioskMode: {
    label: 'Kiosk Mode',
    description: 'Pin one app, block Wi-Fi and Bluetooth changes, restrict installs',
    icon: Smartphone,
    settings: {
      kiosk: { enabled: true, action: true, params: { packageName: '' } },
      wifi: { enabled: true, action: true, params: {} },
      bluetooth: { enabled: true, action: true, params: {} },
      appInstall: { enabled: true, action: true, params: {} },
    },
  },
  byod: {
    label: 'BYOD Policy',
    description: 'Restrict installs and apply web filters for personal devices',
    icon: Package,
    settings: {
      appInstall: { enabled: true, action: true, params: {} },
      webRestrictions: { enabled: true, action: true, params: { blockedUrls: '', allowedUrls: '' } },
    },
  },
  networkLockdown: {
    label: 'Network Lockdown',
    description: 'Block Wi-Fi changes, Bluetooth, and USB transfer',
    icon: Wifi,
    settings: {
      wifi: { enabled: true, action: true, params: {} },
      bluetooth: { enabled: true, action: true, params: {} },
      usb: { enabled: true, action: true, params: {} },
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLiveStatus(lastSeen: string | null): 'online' | 'offline' | 'inactive' | 'never' {
  if (!lastSeen) return 'never';
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 5) return 'online';
  if (mins < 1440) return 'offline';
  return 'inactive';
}

type CommandEntry = { commandType: string; payload: object };

function buildCommands(state: PolicyState): CommandEntry[] {
  const cmds: CommandEntry[] = [];
  for (const def of POLICY_DEFS) {
    const s = state[def.id];
    if (!s?.enabled) continue;

    const commandType = def.binaryAction
      ? s.action ? def.binaryAction.trueCmd : def.binaryAction.falseCmd
      : def.fixedCmd!;

    let payload: object;
    if (def.id === 'webRestrictions') {
      payload = {
        blockedUrls: String(s.params.blockedUrls ?? '').split('\n').map((u) => u.trim()).filter(Boolean),
        allowedUrls: String(s.params.allowedUrls ?? '').split('\n').map((u) => u.trim()).filter(Boolean),
      };
    } else if (def.id === 'kiosk' && !s.action) {
      payload = {};
    } else {
      payload = { ...s.params };
    }

    cmds.push({ commandType, payload });
  }
  return cmds;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkPolicyPage() {
  const [step, setStep]                       = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | 'custom' | null>(null);
  const [policyState, setPolicyState]         = useState<PolicyState>(defaultState());

  const [search, setSearch]                   = useState('');
  const [statusFilter, setStatusFilter]       = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [selected, setSelected]               = useState<Set<string>>(new Set());

  const [results, setResults] = useState<{ total: number; succeeded: number; failed: number } | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: rawDevices } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => listDevices({ pageSize: 200 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const isPagedResult = (d: unknown): d is PagedResult<Device> =>
    !!d && typeof (d as PagedResult<Device>).total === 'number';
  const allDevices: Device[] = isPagedResult(rawDevices)
    ? rawDevices.items
    : Array.isArray(rawDevices) ? rawDevices : [];

  const devices = useMemo(() => allDevices.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || d.deviceIdentifier.toLowerCase().includes(q)
      || (d.model ?? '').toLowerCase().includes(q)
      || (d.assignedUserName ?? '').toLowerCase().includes(q);
    const matchStatus     = !statusFilter     || getLiveStatus(d.lastSeen) === statusFilter;
    const matchCompliance = !complianceFilter || String(d.complianceStatus) === complianceFilter;
    return matchSearch && matchStatus && matchCompliance;
  }), [allDevices, search, statusFilter, complianceFilter]);

  // ── Policy state helpers ───────────────────────────────────────────────────

  function applyTemplate(id: TemplateId | 'custom') {
    setSelectedTemplate(id);
    if (id === 'custom') { setPolicyState(defaultState()); return; }
    const tmpl = TEMPLATES[id];
    const next = defaultState();
    for (const [key, val] of Object.entries(tmpl.settings)) {
      next[key] = { ...next[key], ...(val as PolicyItemState) };
    }
    setPolicyState(next);
  }

  function updateItem(id: string, patch: Partial<PolicyItemState>) {
    setPolicyState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    if (selectedTemplate !== 'custom') setSelectedTemplate('custom');
  }

  function updateParam(id: string, key: string, value: string | number) {
    setPolicyState((prev) => ({
      ...prev,
      [id]: { ...prev[id], params: { ...prev[id].params, [key]: value } },
    }));
    if (selectedTemplate !== 'custom') setSelectedTemplate('custom');
  }

  // ── Device selection helpers ───────────────────────────────────────────────

  function toggleDevice(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(selected.size === devices.length && devices.length > 0
      ? new Set()
      : new Set(devices.map((d) => d.id)));
  }

  function quickSelect(predicate: (d: Device) => boolean) {
    setSelected(new Set(allDevices.filter(predicate).map((d) => d.id)));
  }

  // ── Deployment ────────────────────────────────────────────────────────────

  const enabledCommands = buildCommands(policyState);

  const mutation = useMutation({
    mutationFn: async () => {
      const deviceIds = Array.from(selected);
      let total = 0, succeeded = 0, failed = 0;
      for (const cmd of enabledCommands) {
        const r: BulkCommandResult = await sendBulkCommand({ deviceIds, commandType: cmd.commandType, payload: cmd.payload });
        total += r.total;
        succeeded += r.succeeded;
        failed += r.failed;
      }
      return { total, succeeded, failed };
    },
    onSuccess: (data) => { setResults(data); setStep(4); },
  });

  // ── Step indicator ────────────────────────────────────────────────────────

  const STEPS = ['Configure Policy', 'Select Targets', 'Review & Deploy'];
  const categories = [...new Set(POLICY_DEFS.map((d) => d.category))];

  return (
    <div className="space-y-5 pb-10">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bulk Policy Deployment</h1>
        <p className="text-sm text-gray-500">Configure a policy bundle and push it to multiple devices at once</p>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className={`inline-flex w-5 h-5 rounded-full text-[11px] font-bold items-center justify-center shrink-0 ${
                  step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                <span className={`text-sm font-medium ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300 mx-1" />}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — Configure Policy
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <>
          {/* Template cards */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Start from a template</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(Object.entries(TEMPLATES) as [TemplateId, TemplateDef][]).map(([id, tmpl]) => {
                const Icon = tmpl.icon;
                const active = selectedTemplate === id;
                return (
                  <button
                    key={id}
                    onClick={() => applyTemplate(id)}
                    className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      active ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-blue-500' : 'bg-gray-100'}`}>
                      <Icon size={14} className={active ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold leading-tight ${active ? 'text-blue-700' : 'text-gray-700'}`}>{tmpl.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
              {/* Custom option */}
              <button
                onClick={() => applyTemplate('custom')}
                className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedTemplate === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTemplate === 'custom' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <Layers size={14} className={selectedTemplate === 'custom' ? 'text-white' : 'text-gray-500'} />
                </div>
                <div>
                  <p className={`text-xs font-semibold leading-tight ${selectedTemplate === 'custom' ? 'text-blue-700' : 'text-gray-700'}`}>Custom</p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Build your own policy bundle</p>
                </div>
              </button>
            </div>
          </div>

          {/* Policy settings — grouped by category */}
          {categories.map((cat) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {POLICY_DEFS.filter((d) => d.category === cat).map((def) => {
                  const s = policyState[def.id];
                  const Icon = def.icon;
                  const showParams = def.params && (
                    def.showParamsWhen === undefined ? true : s.action === def.showParamsWhen
                  );
                  return (
                    <div
                      key={def.id}
                      className={`px-5 py-4 transition-opacity ${s.enabled ? '' : 'opacity-50'}`}
                    >
                      {/* Row: checkbox + icon + label + binary toggle */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) => updateItem(def.id, { enabled: e.target.checked })}
                          className="w-4 h-4 accent-blue-600 shrink-0 mt-1 cursor-pointer"
                        />
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={13} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{def.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              def.requiresOwner ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {def.requiresOwner ? 'Device Owner' : 'Device Admin'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 leading-tight">{def.description}</p>
                        </div>

                        {/* Binary toggle — only when item is enabled */}
                        {def.binaryAction && s.enabled && (
                          <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
                            <button
                              onClick={() => updateItem(def.id, { action: true })}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                s.action ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {def.binaryAction.trueLabel}
                            </button>
                            <button
                              onClick={() => updateItem(def.id, { action: false })}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                !s.action ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {def.binaryAction.falseLabel}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Parameter fields — indented under icon */}
                      {s.enabled && showParams && def.params && (
                        <div className="mt-3 ml-[3.75rem] grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {def.params.map((p) => (
                            <div key={p.key}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{p.label}</label>
                              {p.type === 'select' ? (
                                <div className="relative">
                                  <select
                                    value={String(s.params[p.key] ?? p.defaultValue ?? '')}
                                    onChange={(e) => updateParam(def.id, p.key, e.target.value)}
                                    className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  >
                                    {p.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                              ) : p.type === 'textarea' ? (
                                <textarea
                                  rows={3}
                                  value={String(s.params[p.key] ?? '')}
                                  onChange={(e) => updateParam(def.id, p.key, e.target.value)}
                                  placeholder={p.placeholder}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono resize-none"
                                />
                              ) : (
                                <input
                                  type={p.type === 'number' ? 'number' : 'text'}
                                  value={String(s.params[p.key] ?? p.defaultValue ?? '')}
                                  onChange={(e) =>
                                    updateParam(def.id, p.key, p.type === 'number' ? Number(e.target.value) : e.target.value)
                                  }
                                  placeholder={p.placeholder}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Step 1 footer */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{enabledCommands.length}</span>{' '}
              command{enabledCommands.length !== 1 ? 's' : ''} configured
            </p>
            <button
              onClick={() => setStep(2)}
              disabled={enabledCommands.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next: Select Targets <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — Select Target Devices
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Select Target Devices</h2>
                {selected.size > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{selected.size} selected</span>
                    <button onClick={() => setSelected(new Set())} className="text-xs text-red-500 hover:underline">
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by device ID, model or user…"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  />
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[130px]"
                  >
                    <option value="">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="inactive">Inactive</option>
                    <option value="never">Never seen</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={complianceFilter}
                    onChange={(e) => setComplianceFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[150px]"
                  >
                    <option value="">All Compliance</option>
                    <option value="1">Compliant</option>
                    <option value="2">Non-Compliant</option>
                    <option value="3">Pending</option>
                    <option value="0">Unknown</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Quick select chips */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 self-center">Quick select:</span>
                <button
                  onClick={() => setSelected(new Set(allDevices.map((d) => d.id)))}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  All devices
                </button>
                <button
                  onClick={() => quickSelect((d) => getLiveStatus(d.lastSeen) === 'online')}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  Online only
                </button>
                <button
                  onClick={() => quickSelect((d) => d.complianceStatus === ComplianceStatus.NonCompliant)}
                  className="text-xs px-3 py-1 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  Non-Compliant
                </button>
              </div>
            </div>

            {/* Device table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={devices.length > 0 && selected.size === devices.length}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Device</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">OS</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Online</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-sm text-gray-400">
                        No devices match your filters
                      </td>
                    </tr>
                  ) : (
                    devices.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => toggleDevice(d.id)}
                        className={`cursor-pointer transition-colors ${
                          selected.has(d.id) ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(d.id)}
                            onChange={() => toggleDevice(d.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 leading-tight">{d.deviceIdentifier}</p>
                          <p className="text-xs text-gray-400">{d.model}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.assignedUserName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{d.androidVersion}</td>
                        <td className="px-4 py-3"><LiveStatusBadge lastSeen={d.lastSeen} /></td>
                        <td className="px-4 py-3"><ComplianceBadge status={d.complianceStatus} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 2 footer */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{selected.size}</span>{' '}
                device{selected.size !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={() => setStep(3)}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Review & Deploy <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — Review & Deploy
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">

            {/* Stats */}
            <div className="px-5 py-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Deployment Summary</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-700">{enabledCommands.length}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Commands</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-700">{selected.size}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Target Devices</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-2xl font-bold text-purple-700">{enabledCommands.length * selected.size}</p>
                  <p className="text-xs text-purple-500 mt-0.5">Total Operations</p>
                </div>
              </div>
            </div>

            {/* Commands */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Commands to deploy</p>
              <div className="space-y-2">
                {enabledCommands.map((cmd, i) => {
                  const def = POLICY_DEFS.find((d) =>
                    d.binaryAction
                      ? d.binaryAction.trueCmd === cmd.commandType || d.binaryAction.falseCmd === cmd.commandType
                      : d.fixedCmd === cmd.commandType,
                  );
                  const Icon = def?.icon ?? Shield;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                        <Icon size={13} className="text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{cmd.commandType}</p>
                        {Object.keys(cmd.payload).length > 0 && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                            {JSON.stringify(cmd.payload)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 self-center">× {selected.size}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target device chips */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Target devices ({selected.size})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allDevices.filter((d) => selected.has(d.id)).slice(0, 16).map((d) => (
                  <span key={d.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                    {d.deviceIdentifier}
                  </span>
                ))}
                {selected.size > 16 && (
                  <span className="text-xs text-gray-400 self-center">+{selected.size - 16} more</span>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="px-5 py-3 bg-amber-50/60">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Commands marked <strong>Device Owner</strong> only execute on devices where the agent has Device Owner privileges.
                  All commands are queued — offline devices will receive them on next connection (Hangfire retries up to 5×).
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 footer */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <button
              onClick={() => setStep(2)}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {mutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Deploying…</>
                : <>Deploy Policy <Lock size={13} /></>}
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4 — Results
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 4 && results && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Policy Deployed</h2>
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-semibold text-gray-800">{results.succeeded}</span> of{' '}
            <span className="font-semibold text-gray-800">{results.total}</span> operations dispatched successfully
          </p>
          {results.failed > 0 && (
            <p className="text-sm text-amber-600 mb-2">
              {results.failed} operation{results.failed > 1 ? 's' : ''} failed — devices without a push token will retry via Hangfire
            </p>
          )}
          <p className="text-xs text-gray-400 mb-8">
            Commands are queued with up to 5 retries. Check device command history to confirm execution.
          </p>
          <button
            onClick={() => {
              setStep(1);
              setResults(null);
              setPolicyState(defaultState());
              setSelected(new Set());
              setSelectedTemplate(null);
            }}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            New Deployment
          </button>
        </div>
      )}
    </div>
  );
}
