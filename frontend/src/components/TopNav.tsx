import React from 'react';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Sliders,
} from 'lucide-react';
import { NavPage, BackendConnectionStatus, BackendHealthResponse } from '../types/evaluation';

interface TopNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  connectionStatus: BackendConnectionStatus;
  healthData: BackendHealthResponse | null;
  latencyMs: number | null;
  onRefreshHealth: () => void;
  isRefreshing: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentPage,
  onNavigate,
  connectionStatus,
  healthData,
  latencyMs,
  onRefreshHealth,
  isRefreshing,
}) => {
  const navTabs: Array<{ id: NavPage; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'new-evaluation', label: 'New Evaluation' },
    { id: 'history', label: 'Evaluation History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-6 px-1">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        {/* Modern 3-loop geometric mark like reference */}
        <div className="w-9 h-9 rounded-xl bg-charcoal-900 text-gold-400 flex items-center justify-center shadow-soft">
          <svg
            className="w-5 h-5 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" opacity="0.2" />
            <path d="M12 4a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8zm-1 12.5-4-3 4-3v6zm6-3-4 3v-6l4 3z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-charcoal-900 font-sans">
            Compliance<span className="text-gold-500">X</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream-200 text-charcoal-700 border border-cream-border">
            SIH Scrutiny
          </span>
        </div>
      </div>

      {/* Floating Pill Navigation Capsule (Matching reference image) */}
      <div className="flex items-center gap-2 flex-wrap">
        <nav className="inline-flex items-center gap-1 bg-white/80 backdrop-blur-md p-1 rounded-full border border-cream-border shadow-soft">
          {navTabs.map((tab) => {
            const isActive = currentPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-charcoal-900 text-white shadow-sm'
                    : 'text-charcoal-muted hover:text-charcoal-900 hover:bg-cream-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Quick Settings Icon Button in Nav Pill */}
          <button
            onClick={() => onNavigate('settings')}
            title="System Settings"
            className={`p-1.5 rounded-full transition-colors ${
              currentPage === 'settings'
                ? 'bg-charcoal-900 text-white'
                : 'text-charcoal-muted hover:text-charcoal-900 hover:bg-cream-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Backend Connectivity Status Pill */}
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md py-1 px-3 rounded-full border border-cream-border shadow-soft text-xs">
          {connectionStatus === 'online' && (
            <div
              className="flex items-center gap-1.5 text-status-successText font-medium text-[11px]"
              title={`${healthData?.application || 'ComplianceX'} API v${healthData?.version || '0.1.0'}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-successText opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-successText"></span>
              </span>
              <span>Online</span>
              {latencyMs !== null && (
                <span className="text-[10px] font-mono text-charcoal-muted">
                  {latencyMs}ms
                </span>
              )}
            </div>
          )}

          {connectionStatus === 'offline' && (
            <div className="flex items-center gap-1.5 text-status-errorText font-medium text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}

          {connectionStatus === 'checking' && (
            <div className="flex items-center gap-1.5 text-charcoal-muted font-medium text-[11px]">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Checking</span>
            </div>
          )}

          {/* Refresh connection */}
          <button
            onClick={onRefreshHealth}
            disabled={isRefreshing}
            title="Re-check backend status"
            className="p-1 text-charcoal-muted hover:text-charcoal-900 rounded-full hover:bg-cream-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Profile Avatar Pill */}
        <div className="w-8 h-8 rounded-full bg-charcoal-900 text-white flex items-center justify-center text-xs font-semibold ring-2 ring-gold-400/80 shadow-soft cursor-pointer hover:ring-gold-400 transition-all" title="Evaluator: CX AICTE Desk">
          CX
        </div>
      </div>
    </div>
  );
};
