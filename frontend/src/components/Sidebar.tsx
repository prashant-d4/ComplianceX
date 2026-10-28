import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Settings2,
  FileCheck2,
  Server,
  FolderGit2
} from 'lucide-react';
import { NavPage } from '../types/evaluation';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems: Array<{
    id: NavPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-evaluation', label: 'New Evaluation', icon: FilePlus2 },
    { id: 'history', label: 'Evaluation History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-app-border flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-app-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-blue flex items-center justify-center text-white shadow-sm">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-navy-900 text-base tracking-tight">ComplianceX</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-blue-light text-brand-blue border border-brand-blue/20">
                SIH
              </span>
            </div>
            <p className="text-xs text-slate-muted">Institutional Verification</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase text-slate-muted">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-brand-blue-light text-brand-blue font-semibold'
                  : 'text-navy-900/80 hover:bg-app-subtle hover:text-navy-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-brand-blue' : 'text-slate-muted'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-app-subtle text-slate-muted border border-app-border">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer metadata */}
      <div className="p-4 border-t border-app-border bg-[#FAFBFC] space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-muted">
          <FolderGit2 className="w-3.5 h-3.5 text-slate-light" />
          <span>Local workspace:</span>
          <span className="font-mono text-navy-900/90 text-[11px] font-medium">aicte/demo</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-muted">
          <span className="flex items-center gap-1.5">
            <Server className="w-3 h-3 text-slate-light" />
            Prototype Env
          </span>
          <span className="font-mono text-slate-muted font-medium">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
};
