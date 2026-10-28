import React from 'react';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { NavPage, BackendConnectionStatus, BackendHealthResponse } from '../types/evaluation';

interface HeaderProps {
  currentPage: NavPage;
  connectionStatus: BackendConnectionStatus;
  healthData: BackendHealthResponse | null;
  latencyMs: number | null;
  onRefreshHealth: () => void;
  isRefreshing: boolean;
}

const pageTitles: Record<NavPage, { title: string; subtitle: string }> = {
  overview: {
    title: 'Workspace Overview',
    subtitle: 'Institutional compliance summary and intake pipeline',
  },
  'new-evaluation': {
    title: 'New Evaluation Intake',
    subtitle: 'Submit institutional declarations and supporting PDF evidence',
  },
  history: {
    title: 'Evaluation History',
    subtitle: 'Audit logs and past compliance verification records',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Environment configuration and compliance rulesets',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  connectionStatus,
  healthData,
  latencyMs,
  onRefreshHealth,
  isRefreshing,
}) => {
  const current = pageTitles[currentPage];

  return (
    <header className="h-16 bg-white border-b border-app-border px-6 flex items-center justify-between shrink-0">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-muted hidden sm:block">
          ComplianceX <span className="mx-1 text-app-border">/</span>
        </div>
        <div>
          <h1 className="text-base font-semibold text-navy-900 leading-tight">
            {current.title}
          </h1>
        </div>
      </div>

      {/* Right Controls: Real Health Status & User Profile */}
      <div className="flex items-center gap-4">
        {/* Backend Connection Indicator */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'online' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-status-successBg/70 border border-status-successText/20 text-status-successText text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-successText opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-successText"></span>
              </span>
              <span>Backend Online</span>
              {healthData?.version && (
                <span className="text-[10px] text-status-successText/70 font-mono">
                  v{healthData.version}
                </span>
              )}
              {latencyMs !== null && (
                <span className="text-[10px] text-status-successText/80 font-mono">
                  {latencyMs}ms
                </span>
              )}
            </div>
          )}

          {connectionStatus === 'offline' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-status-errorBg border border-status-errorText/20 text-status-errorText text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          )}

          {connectionStatus === 'checking' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-app-subtle border border-app-border text-slate-muted text-xs font-medium">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Checking...</span>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefreshHealth}
            disabled={isRefreshing}
            title="Check backend connection status"
            className="p-1.5 text-slate-muted hover:text-navy-900 hover:bg-app-subtle rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-app-border"></div>

        {/* Evaluator Avatar / Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-semibold tracking-wider">
            CX
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-medium text-navy-900">Evaluator</div>
            <div className="text-[10px] text-slate-muted">AICTE Scrutiny Desk</div>
          </div>
        </div>
      </div>
    </header>
  );
};
