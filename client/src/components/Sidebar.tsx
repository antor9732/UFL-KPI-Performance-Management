import React from 'react';
import { CopyPlus, Factory, FileSpreadsheet, LayoutDashboard, Settings, TrendingUp, Users2 } from 'lucide-react';

export const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'departments', label: 'Department Analytics', icon: Factory },
  { id: 'data', label: 'Monthly Data Entry', icon: CopyPlus },
  { id: 'people', label: 'People & Photos', icon: Users2 },
  { id: 'presentation', label: 'Presentation', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings & Backup', icon: Settings },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export const Sidebar: React.FC<{ active: TabId; onSelect: (t: TabId) => void; companyName: string; logoUrl: string | null }> = ({ active, onSelect, companyName, logoUrl }) => (
  <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 select-none">
    <div className="p-5 border-b border-slate-800 flex items-center gap-3">
      {logoUrl ? (
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0"><img src={logoUrl} alt="" className="max-w-full max-h-full object-contain" /></div>
      ) : (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0"><TrendingUp className="w-6 h-6 text-white" /></div>
      )}
      <div className="min-w-0">
        <h1 className="text-sm font-bold text-white leading-tight truncate" title={companyName}>{companyName}</h1>
        <p className="text-xs text-slate-400">KPI Performance System</p>
      </div>
    </div>
    <nav className="p-3 space-y-1 flex-1">
      {TABS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
    <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">Data is stored on this computer.</div>
  </aside>
);
