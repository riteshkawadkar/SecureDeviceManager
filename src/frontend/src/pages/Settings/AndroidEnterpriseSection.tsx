import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { ShieldCheck, Smartphone, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getCurrentEnterprise, startEnterpriseSignup, createEnrollmentToken, syncEnterpriseDevices } from '../../api/enterprise';
import { EnterpriseStatus, EnrollmentManagementMode } from '../../types/enterprise';

export default function AndroidEnterpriseSection() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const redirectStatus = searchParams.get('enterprise'); // 'connected' | 'error' | null
  const [tokenResult, setTokenResult] = useState<{ mode: EnrollmentManagementMode; qrCodeJson: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['enterprise'],
    queryFn: getCurrentEnterprise,
  });

  const signupMutation = useMutation({
    mutationFn: startEnterpriseSignup,
    onSuccess: (res) => { window.location.href = res.url; },
  });

  const tokenMutation = useMutation({
    mutationFn: (mode: EnrollmentManagementMode) => createEnrollmentToken(mode),
    onSuccess: (res) => setTokenResult({ mode: res.managementMode, qrCodeJson: res.qrCodeJson }),
  });

  const syncMutation = useMutation({
    mutationFn: syncEnterpriseDevices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });

  const enterprise = data && 'status' in data ? data : null;
  const isActive = enterprise?.status === EnterpriseStatus.Active;
  const isPending = enterprise?.status === EnterpriseStatus.Pending;
  const isFailed = enterprise?.status === EnterpriseStatus.Failed;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck size={17} className="text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">Android Enterprise</p>
          <p className="text-xs text-gray-500 mt-0.5">Silent Play Store installs via Managed Google Play (Release 2)</p>

          {redirectStatus === 'connected' && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-xs font-medium">
              Enterprise connected successfully.
            </div>
          )}
          {redirectStatus === 'error' && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-medium">
              Enterprise signup failed. Check the API logs and try again.
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {isLoading ? (
              <span className="text-xs text-gray-400">Checking status…</span>
            ) : isActive ? (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Active — {enterprise?.googleEnterpriseId}
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                <Clock size={12} /> Signup pending
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                <XCircle size={12} /> Signup failed{enterprise?.errorMessage ? `: ${enterprise.errorMessage}` : ''}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Not connected</span>
            )}
          </div>

          {!isActive && (
            <button
              onClick={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <ExternalLink size={12} />
              {signupMutation.isPending ? 'Redirecting…' : isFailed ? 'Retry Connection' : 'Connect to Android Enterprise'}
            </button>
          )}

          {isActive && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => tokenMutation.mutate(EnrollmentManagementMode.AndroidEnterpriseFullyManaged)}
                  disabled={tokenMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  <Smartphone size={12} /> Generate Fully Managed QR
                </button>
                <button
                  onClick={() => tokenMutation.mutate(EnrollmentManagementMode.AndroidEnterpriseWorkProfile)}
                  disabled={tokenMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <Smartphone size={12} /> Generate Work Profile (BYOD) QR
                </button>
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={12} className={syncMutation.isPending ? 'animate-spin' : ''} /> Sync devices
                </button>
              </div>
              {syncMutation.data && (
                <p className="text-xs text-gray-400">
                  Synced {syncMutation.data.totalFromGoogle} device(s) from Google — {syncMutation.data.created} new, {syncMutation.data.updated} updated.
                </p>
              )}

              {tokenResult && (
                <div className="border border-gray-100 rounded-lg p-4 flex items-start gap-4 bg-gray-50/50">
                  <QRCodeCanvas value={tokenResult.qrCodeJson} size={140} level="Q" marginSize={2} />
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">
                      {tokenResult.mode === EnrollmentManagementMode.AndroidEnterpriseFullyManaged ? 'Fully Managed' : 'Work Profile (BYOD)'} enrollment QR
                    </p>
                    <p>Scan during device setup — tap the welcome screen 6× to reach the QR scanner, or type "afw#setup" on the Wi-Fi screen.</p>
                    <p>Expires within 24 hours — generate a fresh one if it isn't used in time.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
