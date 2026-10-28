import React from 'react';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Cpu,
  BookOpenCheck
} from 'lucide-react';
import { BackendConnectionStatus, BackendHealthResponse } from '../types/evaluation';

interface SettingsPageProps {
  connectionStatus: BackendConnectionStatus;
  healthData: BackendHealthResponse | null;
  latencyMs: number | null;
  onRefreshHealth: () => void;
  isRefreshing: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  connectionStatus,
  healthData,
  latencyMs,
  onRefreshHealth,
  isRefreshing,
}) => {
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="pb-1 border-b border-cream-border/60">
        <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
          System Configuration & Settings
        </h2>
        <p className="text-[11px] text-charcoal-muted">
          Review environment parameters, API gateway connection, and statutory evaluation rules
        </p>
      </div>

      {/* Environment Metadata */}
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-cream-border/60">
          <Server className="w-4 h-4 text-gold-500" />
          <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
            Environment Metadata
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-border space-y-0.5">
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider font-semibold">
              Application
            </span>
            <p className="font-bold text-charcoal-900 text-sm">
              {healthData?.application || 'ComplianceX'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-border space-y-0.5">
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider font-semibold">
              Release Track
            </span>
            <p className="font-bold text-charcoal-900 text-sm">
              Stage 1 (Frontend & Gateway)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-border space-y-0.5">
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider font-semibold">
              Deployment
            </span>
            <p className="font-bold text-charcoal-900 text-sm">
              Local Prototype (SIH Edition)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-border space-y-0.5">
            <span className="text-[10px] text-charcoal-muted uppercase tracking-wider font-semibold">
              Frameworks
            </span>
            <p className="font-bold text-charcoal-900 text-sm">
              FastAPI + React 18 + Vite
            </p>
          </div>
        </div>
      </div>

      {/* API Gateway Connection */}
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-cream-border/60">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gold-500" />
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
              API Gateway Diagnostics
            </h3>
          </div>
          <button
            onClick={onRefreshHealth}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-200 hover:bg-cream-300 text-charcoal-900 text-[11px] font-semibold border border-cream-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Now</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-cream-50 border border-cream-border">
          <div className="flex items-center gap-3">
            {connectionStatus === 'online' && (
              <div className="w-9 h-9 rounded-full bg-status-successBg text-status-successText flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {connectionStatus === 'offline' && (
              <div className="w-9 h-9 rounded-full bg-status-errorBg text-status-errorText flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {connectionStatus === 'checking' && (
              <div className="w-9 h-9 rounded-full bg-cream-200 text-charcoal-muted flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
            )}

            <div>
              <div className="text-xs font-bold text-charcoal-900">
                Endpoint:{' '}
                <span className="font-mono font-normal text-charcoal-muted">
                  GET /api/health
                </span>
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">
                {connectionStatus === 'online' && (
                  <span>
                    Responding successfully (Version: {healthData?.version || '0.1.0'}
                    {latencyMs !== null ? `, Latency: ${latencyMs}ms` : ''})
                  </span>
                )}
                {connectionStatus === 'offline' && (
                  <span className="text-status-errorText">
                    FastAPI backend is unreachable on port 8000. Start backend using uvicorn.
                  </span>
                )}
                {connectionStatus === 'checking' && (
                  <span>Querying backend health endpoint...</span>
                )}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              connectionStatus === 'online'
                ? 'bg-status-successBg text-status-successText border border-status-successText/20'
                : connectionStatus === 'offline'
                ? 'bg-status-errorBg text-status-errorText border border-status-errorText/20'
                : 'bg-cream-200 text-charcoal-muted border border-cream-border'
            }`}
          >
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Deterministic Rules Transparency */}
      <div className="bg-white rounded-panel border border-cream-border p-5 shadow-panel space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-cream-border/60">
          <BookOpenCheck className="w-4 h-4 text-gold-500" />
          <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
            Statutory AICTE Norms
          </h3>
        </div>

        <div className="bg-[#FAFDFB] border border-emerald-200 p-4 rounded-2xl space-y-1.5 text-xs">
          <p className="text-charcoal-900 font-semibold leading-relaxed">
            Deterministic Compliance Verification
          </p>
          <p className="text-charcoal-muted text-[11px] leading-relaxed">
            All compliance checks strictly reference explicitly codified AICTE Approval Process Handbook guidelines (such as minimum Student-to-Faculty Ratios, built-up areas, and Fire Safety NOC validities).
          </p>
        </div>
      </div>
    </div>
  );
};
