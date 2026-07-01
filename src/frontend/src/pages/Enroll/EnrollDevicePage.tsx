import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Download, Mail, Check, Smartphone, Shield,
  Package, Info, ChevronLeft, Hash, Zap, QrCode, Clock, Loader2, Copy, X,
} from 'lucide-react';
import { createToken } from '../../api/enrollment';
import { listDevices } from '../../api/devices';
import type { Device, PagedResult } from '../../types/device';

type EnrollMethod = 'qr' | 'token' | 'zero-touch';

const STEP_LABELS = ['Install Agent', 'Choose & Generate', 'Device Connects', 'Auto-Configure'];

const isPagedResult = (d: unknown): d is PagedResult<Device> =>
  !!d && typeof (d as PagedResult<Device>).total === 'number';

export default function EnrollDevicePage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<EnrollMethod>('qr');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenData, setTokenData] = useState<{ token: string; expiresOn: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<{ id: string; identifier: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const tokenCreatedAtRef = useRef<Date | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qrValue = tokenData
    ? `sdm://enroll?token=${encodeURIComponent(tokenData.token)}`
    : '';

  // Dynamic step indicator: driven entirely from state
  const currentPhase = connectedDevice ? 3 : isPolling ? 2 : appInstalled ? 1 : 0;
  const steps = STEP_LABELS.map((label, i) => ({
    label,
    done: i < currentPhase,
    active: i === currentPhase,
  }));

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        const data = await listDevices({ page: 1, pageSize: 10 });
        const devices = isPagedResult(data) ? data.items : Array.isArray(data) ? data : [];
        const found = devices.find(
          (d) => tokenCreatedAtRef.current && new Date(d.createdOn) > tokenCreatedAtRef.current,
        );
        if (found) {
          setConnectedDevice({ id: found.id, identifier: found.deviceIdentifier });
          setIsPolling(false);
        }
      } catch {
        // silently ignore transient errors — polling continues
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isPolling]);

  function handleMethodChange(m: EnrollMethod) {
    setMethod(m);
    setTokenData(null);
    setConnectedDevice(null);
    setCopied(false);
    setIsPolling(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setConnectedDevice(null);
    try {
      const res = await createToken({ maxDevices: 1, expiresInMinutes: 1440 });
      tokenCreatedAtRef.current = new Date();
      setTokenData(res);
      setIsPolling(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownloadQr() {
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrollment-qr.png';
    a.click();
  }

  function handleOpenEmailClient() {
    const apkUrl = `${window.location.origin}/api/enrollment/agent-apk`;
    const subject = 'Install SDM Agent — Device Enrollment Instructions';
    const tokenLine = tokenData
      ? `Open the SDM Agent app and tap "Enter Token", then type this code:\n\n    ${tokenData.token}\n\nYour device will be configured automatically once enrolled.\n\nToken expires: ${new Date(tokenData.expiresOn).toLocaleString()}`
      : `Open the SDM Agent app. Your enrollment code will be shared separately.`;

    const body = `Hi,

Please follow these steps to enroll your Android device with SecureDeviceManager.

──── STEP 1: INSTALL SDM AGENT ────

Download the SDM Agent app and install it on your Android device:
${apkUrl}

Transfer the APK to your device via USB, email, or a shared drive, then open it to install.

If prompted, enable "Install from unknown sources":
  Settings → Apps → Special app access → Install unknown apps
  → allow for your browser or file manager

──── STEP 2: ENROLL YOUR DEVICE ────

${tokenLine}

If you have trouble, contact your IT administrator.`;

    const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setShowEmailModal(false);
  }

  function handleCopyToken() {
    if (!tokenData) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Enroll New Device</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Install the SDM Agent on the Android device, then scan the QR code or enter the enrollment token to register it.
        </p>
      </div>

      {/* Step Indicator — updates as user progresses */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex items-start">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step.done
                      ? 'bg-blue-600 text-white'
                      : step.active
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}
                >
                  {step.done ? <Check size={15} /> : i + 1}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium text-center whitespace-nowrap ${
                    step.done || step.active ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mb-5 ${step.done ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left / Main ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* How it works */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex gap-3">
            <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold">How it works:</span>{' '}
              Install the SDM Agent APK on the device, then generate a{' '}
              {method === 'qr' ? 'QR code to scan during setup' : 'token to enter in the agent app'}.
              Device info is captured automatically on first check-in — no manual entry needed.
            </p>
          </div>

          {/* 1 · Install Agent App */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <span
                className={`w-6 h-6 ${currentPhase > 0 ? 'bg-blue-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
              >
                {currentPhase > 0 ? <Check size={12} /> : '1'}
              </span>
              Install Agent App
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Download the SDM Agent APK and install it on the Android device you want to enroll.
              </p>

              <a
                href="/api/enrollment/agent-apk"
                download="sdm-agent.apk"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={14} />
                Download SDM Agent APK
              </a>

              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex gap-2.5">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                  <p>
                    <span className="font-semibold">Sideload instructions:</span> Transfer the APK to the device (USB, email, or shared drive), then open it to install.
                  </p>
                  <p>
                    If prompted, enable <span className="font-semibold">Install from unknown sources</span> via{' '}
                    Settings → Apps → Special app access → Install unknown apps.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={appInstalled}
                  onChange={(e) => setAppInstalled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                  SDM Agent app is installed on the device
                </span>
              </label>
            </div>
          </div>

          {/* 2 · Enrollment Method */}
          <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-opacity ${!appInstalled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <span
                className={`w-6 h-6 ${currentPhase > 1 ? 'bg-blue-600' : appInstalled ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
              >
                {currentPhase > 1 ? <Check size={12} /> : '2'}
              </span>
              Enrollment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* QR Code — recommended */}
              <MethodCard
                selected={method === 'qr'}
                onSelect={() => handleMethodChange('qr')}
                icon={
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                }
                iconBg="bg-blue-50"
                badge="Recommended"
                badgeClass="text-green-600 bg-green-50"
                title="QR Code Enrollment"
                description="Open the SDM Agent app and tap 'Scan QR Code'. Point the camera at the code to enroll."
              />

              {/* Token — manual */}
              <MethodCard
                selected={method === 'token'}
                onSelect={() => handleMethodChange('token')}
                icon={<Hash size={18} className="text-purple-600" />}
                iconBg="bg-purple-50"
                badge="Manual"
                badgeClass="text-purple-600 bg-purple-50"
                title="Enrollment Token"
                description="Generate a short token (e.g. A3XK-Q7MH-P2NB) and type it in the SDM Agent app."
              />

              {/* Zero-Touch — coming soon */}
              <ComingSoonMethodCard
                icon={<Zap size={18} className="text-gray-400" />}
                title="Zero-Touch Enrollment"
                description="Pre-configure devices in bulk via Google Zero-Touch portal. Auto-enrolls on first boot."
              />
            </div>
          </div>

          {/* 3 · Assignment — Coming Soon */}
          <ComingSoonSection
            number={3}
            title="Assignment"
            subtitle="— group the device and auto-select an appropriate policy"
            description="Device assignment to groups, departments, and users will be available in an upcoming release. Currently, device details are captured automatically when the device checks in post-enrollment."
          />

          {/* What Happens After Enrollment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">What Happens After Enrollment</h2>
            <div className="space-y-4">
              <AfterEnrollItem
                icon={<Smartphone size={16} className="text-blue-600" />}
                iconBg="bg-blue-50"
                title="Device Info Sync"
                badge="On first check-in"
                badgeClass="text-blue-600 bg-blue-50"
                description="Model, IMEI, serial number, OS version, battery, and storage are automatically fetched upon first check-in."
              />
              <AfterEnrollItem
                icon={<Shield size={16} className="text-green-600" />}
                iconBg="bg-green-50"
                title="Policy Auto-Apply"
                badge="After enrollment"
                badgeClass="text-green-600 bg-green-50"
                description="The assigned policy profile is pushed and enforced automatically after the device completes enrollment."
              />
              <AfterEnrollItem
                icon={<Package size={16} className="text-amber-500" />}
                iconBg="bg-amber-50"
                title="App Catalogue Sync"
                badge="Within 5 minutes"
                badgeClass="text-amber-600 bg-amber-50"
                description="Approved apps are queued for silent install. Blocked app list is deployed to enforce installation restrictions."
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {method === 'qr' ? (
            /* QR Code Panel */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 text-center mb-4">Enrollment QR Code</h3>

              <div ref={qrContainerRef} className="flex justify-center mb-4">
                {qrValue ? (
                  <QRCodeCanvas value={qrValue} size={160} level="Q" marginSize={2} />
                ) : (
                  <div className="w-40 h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2">
                    <QrCode size={28} className="text-gray-300" />
                    <p className="text-xs text-gray-400 text-center px-3 leading-relaxed">
                      {appInstalled ? 'Click below to generate' : 'Install the agent first'}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center mb-4">
                Open SDM Agent → Scan QR Code → point at this code.
              </p>

              {tokenData ? (
                <button
                  onClick={handleDownloadQr}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download size={14} />
                  Download QR
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !appInstalled}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <QrCode size={14} />
                  {isGenerating ? 'Generating...' : 'Generate QR Code'}
                </button>
              )}

              {!appInstalled && !tokenData && (
                <p className="text-xs text-amber-600 text-center mt-2 font-medium">
                  Install the agent app first (Step 1)
                </p>
              )}

              <div className="mt-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail size={14} />
                  Send via Email
                </button>
              </div>

              {tokenData && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Token expires {new Date(tokenData.expiresOn).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            /* Enrollment Token Panel */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 text-center mb-4">Enrollment Token</h3>

              {tokenData ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                    <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Token</p>
                    <p className="font-mono text-2xl font-bold text-gray-800 text-center tracking-widest select-all">
                      {tokenData.token}
                    </p>
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Open SDM Agent → Enter Token → type the code above
                    </p>
                  </div>
                  <button
                    onClick={handleCopyToken}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Token'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    <Hash size={14} />
                    {isGenerating ? 'Generating...' : 'Regenerate'}
                  </button>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail size={14} />
                    Send via Email
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    Token expires {new Date(tokenData.expiresOn).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 mb-4">
                    <Hash size={26} className="text-gray-300" />
                    <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
                      {appInstalled ? 'Click below to generate a token' : 'Install the agent first'}
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !appInstalled}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Hash size={14} />}
                    {isGenerating ? 'Generating...' : 'Generate Token'}
                  </button>
                  {!appInstalled ? (
                    <p className="text-xs text-amber-600 text-center mt-2 font-medium">
                      Install the agent app first (Step 1)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
                      Open SDM Agent → Enter Token → type the generated code.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Awaiting Connection — live polling after QR/token is generated */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            {connectedDevice ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                  <Check size={22} className="text-green-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Device Connected!</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  <span className="font-medium text-gray-600">{connectedDevice.identifier}</span> enrolled
                  successfully and is now visible in your device list.
                </p>
                <button
                  onClick={() => navigate(`/devices/${connectedDevice.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Smartphone size={13} />
                  View Device
                </button>
              </div>
            ) : isPolling ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Loader2 size={22} className="text-blue-500 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Waiting for Device</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  {method === 'qr'
                    ? 'Open SDM Agent on the device and tap "Scan QR Code".'
                    : 'Open SDM Agent on the device and tap "Enter Token".'}{' '}
                  This panel updates automatically when the device checks in.
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs text-blue-600 font-medium">Polling for connection...</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                  <Smartphone size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Awaiting Device Connection</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  {appInstalled
                    ? method === 'qr'
                      ? 'Generate the QR code above, then scan it in the SDM Agent app.'
                      : 'Generate the token above, then enter it in the SDM Agent app.'
                    : 'Install the SDM Agent on the device first, then generate an enrollment code.'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs text-amber-600 font-medium">Pending enrollment...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          emailTo={emailTo}
          tokenData={tokenData}
          method={method}
          onEmailChange={setEmailTo}
          onSend={handleOpenEmailClient}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Footer */}
      <div className="flex items-center pt-2 pb-4">
        <button
          onClick={() => navigate('/devices')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={15} />
          Back to Devices
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

interface MethodCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
  badgeClass: string;
  title: string;
  description: string;
}

function MethodCard({ selected, onSelect, icon, iconBg, badge, badgeClass, title, description }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border-2 p-4 transition-all w-full ${
        selected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-1">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      <div
        className={`w-4 h-4 rounded border-2 mt-3 flex items-center justify-center ${
          selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
        }`}
      >
        {selected && <Check size={10} className="text-white" />}
      </div>
    </button>
  );
}

function ComingSoonMethodCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative rounded-xl border-2 border-gray-100 p-4 bg-gray-50/50 opacity-60 cursor-not-allowed select-none">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">{icon}</div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-gray-500 bg-gray-100">
          <Clock size={10} />
          Coming Soon
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ComingSoonSection({
  number,
  title,
  subtitle,
  description,
}: {
  number: number;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-3 mb-3">
        <span className="w-6 h-6 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
          {number}
        </span>
        {title}
        <span className="text-xs text-gray-300 font-normal">{subtitle}</span>
      </h2>
      <ComingSoonBanner text={description} />
    </div>
  );
}

function ComingSoonBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
      <Clock size={14} className="text-gray-400 shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coming Soon — </span>
        <span className="text-xs text-gray-400">{text}</span>
      </div>
    </div>
  );
}

interface AfterEnrollItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
}

interface EmailModalProps {
  emailTo: string;
  tokenData: { token: string; expiresOn: string } | null;
  method: EnrollMethod;
  onEmailChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}

function EmailModal({ emailTo, tokenData, method, onEmailChange, onSend, onClose }: EmailModalProps) {
  const apkUrl = `${window.location.origin}/api/enrollment/agent-apk`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Mail size={15} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Send Enrollment Instructions</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Recipient Email
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Email preview */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Email Preview
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-xs text-gray-600 leading-relaxed font-mono">
              <div>
                <span className="text-gray-400">Step 1 — </span>
                <span className="font-semibold text-gray-700">Install SDM Agent</span>
                <br />
                <a href={apkUrl} className="text-blue-600 break-all">{apkUrl}</a>
                <p className="text-gray-400 mt-1 not-italic font-sans">
                  Enable "Install from unknown sources" if prompted during install.
                </p>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <span className="text-gray-400">Step 2 — </span>
                <span className="font-semibold text-gray-700">
                  {method === 'qr' ? 'Scan QR or Enter Token' : 'Enter Token'}
                </span>
                {tokenData ? (
                  <p className="mt-1 text-gray-800 text-base font-bold tracking-widest">{tokenData.token}</p>
                ) : (
                  <p className="text-gray-400 italic mt-1 font-sans not-italic">
                    (generate a token first — it will appear here)
                  </p>
                )}
              </div>
            </div>
          </div>

          {!tokenData && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
              <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Generate a QR code or token first so the enrollment code is included in the email.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={!emailTo.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={14} />
            Open Email Client
          </button>
        </div>
      </div>
    </div>
  );
}

function AfterEnrollItem({ icon, iconBg, title, badge, badgeClass, description }: AfterEnrollItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>{badge}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
