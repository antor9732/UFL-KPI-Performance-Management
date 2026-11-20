import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { MonthlyDataEntry } from './components/MonthlyDataEntry';
import { PersonnelManager } from './components/PersonnelManager';
import { DepartmentAnalytics } from './components/DepartmentAnalytics';
import { PresentationGenerator } from './components/PresentationGenerator';
import { SystemSettings } from './components/SystemSettings';
import { Bell } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDeptId(deptId);
    setActiveTab('departments');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-16 px-8 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Utah Fashion Ltd.</span>
            <span className="text-slate-700">/</span>
            <span className="text-sm font-semibold text-slate-200">KPI Performance Management Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              title="Notifications"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                SA
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">Super Admin</p>
                <p className="text-[10px] text-slate-400 font-medium">Enterprise Host Manager</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <ExecutiveDashboard onSelectDepartment={handleSelectDepartment} />}
            {activeTab === 'departments' && (
              <DepartmentAnalytics
                initialDeptId={selectedDeptId}
                onBack={() => setActiveTab('dashboard')}
              />
            )}
            {activeTab === 'monthly_entry' && <MonthlyDataEntry />}
            {activeTab === 'personnel' && <PersonnelManager />}
            {activeTab === 'presentation' && <PresentationGenerator />}
            {activeTab === 'system' && <SystemSettings />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
