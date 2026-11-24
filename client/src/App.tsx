import React, { useCallback, useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { getDepartments, getMe, getSettings } from './api';
import type { AppSettings, Department, Me } from './types';
import { Sidebar, TABS, type TabId } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DepartmentView } from './components/DepartmentView';
import { DataEntry } from './components/DataEntry';
import { People } from './components/People';
import { PresentationExport } from './components/PresentationExport';
import { SettingsPage } from './components/SettingsPage';
import { defaultPeriod } from './components/ui';

/** Hash routing: #dashboard, #settings?google=connected ... */
function readHash(): { tab: TabId; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '');
  const [path, q] = raw.split('?');
  const tab = (TABS.some((t) => t.id === path) ? path : 'dashboard') as TabId;
  return { tab, query: new URLSearchParams(q || '') };
}

export const App: React.FC = () => {
  const [tab, setTab] = useState<TabId>(readHash().tab);
  const [googleFlag, setGoogleFlag] = useState<string | null>(readHash().query.get('google'));
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [period, setPeriod] = useState(defaultPeriod());
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadAll = useCallback(async () => {
    try {
      const [s, m, d] = await Promise.all([getSettings(), getMe(), getDepartments()]);
      setSettings(s);
      setMe(m);
      setDepartments(d);
      setLoadError(null);
    } catch {
      setLoadError('Cannot reach the local KPI engine. Please close and reopen the application.');
    }
  }, []);
  const reloadDepartments = useCallback(async () => setDepartments(await getDepartments()), []);

  useEffect(() => { reloadAll(); }, [reloadAll]);
  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setTab(h.tab);
      setGoogleFlag(h.query.get('google'));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (googleFlag) {
      // keep the message, clean the URL
      window.history.replaceState(null, '', `#${tab}`);
    }
  }, [googleFlag, tab]);
  useEffect(() => {
    if (settings) document.title = `${settings.company_name} — KPI Performance`;
  }, [settings]);

  const select = (t: TabId) => {
    setTab(t);
    setGoogleFlag(null);
    window.history.replaceState(null, '', `#${t}`);
  };
  const onPeriod = (year: number, month: number) => setPeriod({ year, month });
  const dataPeriodMonth = period.month;

  if (loadError) return <div className="h-screen flex items-center justify-center bg-slate-950 text-rose-300 p-8 text-center">{loadError}</div>;
  if (!settings || !me) return <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading…</div>;

  const currency = settings.currency_symbol || '$';
  const reportMonth = dataPeriodMonth === 0 ? 12 : dataPeriodMonth;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      <Sidebar active={tab} onSelect={select} companyName={settings.company_name} logoUrl={settings.logo_url} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 px-8 border-b border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-slate-300 truncate">{settings.company_name} · KPI Performance Management</span>
          <div className="flex items-center gap-3">
            {me.is_default && settings.google_configured && (
              <button onClick={() => { window.location.href = '/auth/google/redirect'; }} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500 cursor-pointer">
                <LogIn className="w-3.5 h-3.5" /> Sign in with Google
              </button>
            )}
            <button onClick={() => select('settings')} className="flex items-center gap-2 cursor-pointer" title="Account & backups">
              {me.avatar_url ? <img src={me.avatar_url} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" /> : (
                <div className="w-8 h-8 rounded-full bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold">{me.name.slice(0, 2).toUpperCase()}</div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{me.name}</p>
                <p className="text-[10px] text-slate-400">{me.google_connected ? 'Google Drive backup on' : 'Local user'}</p>
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {tab === 'dashboard' && (
              <Dashboard year={period.year} month={reportMonth} currency={currency} onPeriod={onPeriod}
                onOpenDepartment={(id) => { setDeptId(id); select('departments'); }} />
            )}
            {tab === 'departments' && (
              <DepartmentView departments={departments} departmentId={deptId} onDepartment={setDeptId}
                year={period.year} month={reportMonth} currency={currency} onPeriod={onPeriod} />
            )}
            {tab === 'data' && (
              <DataEntry departments={departments} departmentId={deptId} onDepartment={setDeptId}
                year={period.year} month={period.month} onPeriod={onPeriod} />
            )}
            {tab === 'people' && <People departments={departments} departmentId={deptId} onDepartment={setDeptId} reload={reloadDepartments} />}
            {tab === 'presentation' && <PresentationExport departments={departments} year={period.year} month={reportMonth} onPeriod={onPeriod} />}
            {tab === 'settings' && (
              <SettingsPage settings={settings} me={me} departments={departments} onSettings={setSettings} reloadAll={reloadAll} googleFlag={googleFlag} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
