import React from 'react';
import {
  LayoutDashboard,
  Factory,
  CopyPlus,
  Users2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'departments', label: 'Department Analytics', icon: Factory },
    { id: 'monthly_entry', label: 'Monthly Data & Clone', icon: CopyPlus, badge: 'Quick-Fill' },
    { id: 'personnel', label: 'Roles & Photo Avatars', icon: Users2, badge: 'Editable' },
    { id: 'presentation', label: 'Presentation & Reports', icon: FileSpreadsheet },
    { id: 'system', label: 'System & Backup', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide leading-tight">UFL KPI</h1>
            <p className="text-xs text-slate-400 font-medium">Performance System</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Host Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs">
            <p className="text-slate-300 font-semibold">Local Host Server</p>
            <p className="text-[11px] text-slate-500">Source of Truth • Active</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
