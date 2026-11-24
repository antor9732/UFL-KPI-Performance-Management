import React, { useEffect, useRef, useState } from 'react';
import { CloudUpload, Download, LogIn, LogOut, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import {
  backupToGoogle, errorText, getBackupStatus, getGoals, listGoogleBackups, logout, resetData, restoreBackupFile,
  restoreGoogleBackup, saveGoals, saveSettings, uploadLogo,
} from '../api';
import type { AppSettings, Department, KpiGoal, Me } from '../types';
import { Button, Card, TextInput, Toast, useToast } from './ui';
import { OrgSettings } from './OrgSettings';

interface Props {
  settings: AppSettings;
  me: Me;
  departments: Department[];
  onSettings: (s: AppSettings) => void;
  reloadAll: () => Promise<void>;
  googleFlag: string | null;
}

export const SettingsPage: React.FC<Props> = ({ settings, me, departments, onSettings, reloadAll, googleFlag }) => {
  const t = useToast();
  useEffect(() => {
    const messages: Record<string, ['ok' | 'error', string]> = {
      connected: ['ok', 'Signed in with Google. Your data was backed up to Google Drive.'],
      'connected-backup-failed': ['error', 'Signed in with Google, but the first backup failed. Try "Back up now".'],
      cancelled: ['error', 'Google sign-in was cancelled.'],
      'not-configured': ['error', 'Google sign-in is not set up yet: enter the Google Client ID and Secret below.'],
      'invalid-state': ['error', 'Google sign-in expired. Please try again.'],
      failed: ['error', 'Google sign-in failed.'],
    };
    if (googleFlag && messages[googleFlag]) {
      const [type, text] = messages[googleFlag];
      if (type === 'ok') t.ok(text); else t.error(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleFlag]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400">Company details, account & backups, departments and KPI goals.</p>
      </div>
      <CompanySection settings={settings} onSettings={onSettings} toast={t} />
      <AccountSection settings={settings} me={me} onSettings={onSettings} reloadAll={reloadAll} toast={t} />
      <OrgSettings departments={departments} reload={reloadAll} />
      <GoalsSection toast={t} />
      <DangerSection reloadAll={reloadAll} toast={t} />
      <Toast toast={t.toast} onClose={t.close} />
    </div>
  );
};

type ToastApi = ReturnType<typeof useToast>;

const CompanySection: React.FC<{ settings: AppSettings; onSettings: (s: AppSettings) => void; toast: ToastApi }> = ({ settings, onSettings, toast }) => {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  useEffect(() => setForm(settings), [settings]);
  const set = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      onSettings(await saveSettings({
        company_name: form.company_name, report_title: form.report_title, cover_quote: form.cover_quote,
        cover_quote_2: form.cover_quote_2, cover_tagline: form.cover_tagline, currency_symbol: form.currency_symbol,
      }));
      toast.ok('Company settings saved.');
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Company & presentation cover" actions={<Button onClick={save} busy={busy}><Save className="w-4 h-4" /> Save</Button>}>
      <div className="grid md:grid-cols-2 gap-4">
        <TextInput label="Company name" value={form.company_name} onChange={set('company_name')} />
        <TextInput label="Presentation title" value={form.report_title} onChange={set('report_title')} />
        <TextInput label="Cover quote" value={form.cover_quote} onChange={set('cover_quote')} />
        <TextInput label="Second quote / translation (optional)" value={form.cover_quote_2} onChange={set('cover_quote_2')} />
        <TextInput label="Cover tagline" value={form.cover_tagline} onChange={set('cover_tagline')} />
        <TextInput label="Currency symbol" value={form.currency_symbol} onChange={set('currency_symbol')} className="w-24" />
      </div>
      <div className="flex items-center gap-4 mt-5">
        <div className="w-32 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
          {settings.logo_url ? <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-500">No logo</span>}
        </div>
        <Button variant="secondary" onClick={() => logoRef.current?.click()}><Upload className="w-4 h-4" /> Upload logo</Button>
        {settings.logo_url && <Button variant="ghost" onClick={async () => onSettings(await uploadLogo(null))}>Remove</Button>}
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try { onSettings(await uploadLogo(f)); toast.ok('Logo updated.'); } catch (err) { toast.error(errorText(err)); }
        }} />
      </div>
    </Card>
  );
};

const AccountSection: React.FC<{ settings: AppSettings; me: Me; onSettings: (s: AppSettings) => void; reloadAll: () => Promise<void>; toast: ToastApi }> = ({
  settings, me, onSettings, reloadAll, toast,
}) => {
  const [clientId, setClientId] = useState(settings.google_client_id);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [backups, setBackups] = useState<{ id: string; name: string; size?: string; createdTime: string }[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [status, setStatus] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setClientId(settings.google_client_id); }, [settings.google_client_id]);
  useEffect(() => { getBackupStatus().then(setStatus).catch(() => undefined); }, [me]);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.ok(ok);
      getBackupStatus().then(setStatus).catch(() => undefined);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const restore = (fn: () => Promise<unknown>) => {
    if (!window.confirm('Restoring replaces ALL current data and photos with the backup. Continue?')) return;
    act('restore', async () => { await fn(); await reloadAll(); }, 'Backup restored.');
  };

  return (
    <Card title="Account & backups">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-950 rounded-xl p-4">
            {me.avatar_url ? <img src={me.avatar_url} alt="" className="w-11 h-11 rounded-full" referrerPolicy="no-referrer" /> : <div className="w-11 h-11 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-indigo-300">{me.name.slice(0, 2).toUpperCase()}</div>}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">{me.name}</p>
              <p className="text-xs text-slate-400 truncate">{me.is_default ? 'Default local user (no sign-in needed)' : me.email}</p>
              {me.google_connected && <p className="text-xs text-emerald-400 mt-0.5">Google Drive backup on{me.last_backup_at ? ` · last ${new Date(me.last_backup_at).toLocaleString()}` : ''}</p>}
            </div>
            {me.is_default ? (
              <Button onClick={() => { window.location.href = '/auth/google/redirect'; }} disabled={!settings.google_configured} title={settings.google_configured ? '' : 'Enter Google Client ID and Secret first'}>
                <LogIn className="w-4 h-4" /> Sign in with Google
              </Button>
            ) : (
              <Button variant="secondary" busy={busy === 'logout'} onClick={() => act('logout', async () => { await logout(); await reloadAll(); }, 'Signed out. Back to the default user.')}>
                <LogOut className="w-4 h-4" /> Sign out
              </Button>
            )}
          </div>
          {me.google_connected && (
            <div className="flex flex-wrap gap-2">
              <Button busy={busy === 'backup'} onClick={() => act('backup', backupToGoogle, 'Backed up to Google Drive.')}><CloudUpload className="w-4 h-4" /> Back up now</Button>
              <Button variant="secondary" busy={busy === 'list'} onClick={() => act('list', async () => setBackups(await listGoogleBackups()))}><RotateCcw className="w-4 h-4" /> Restore from Google Drive…</Button>
            </div>
          )}
          {backups && (
            <div className="bg-slate-950 rounded-xl p-3 max-h-60 overflow-y-auto">
              {backups.length === 0 ? <p className="text-sm text-slate-400">No backups in Google Drive yet.</p> : backups.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{b.name}</p>
                    <p className="text-xs text-slate-500">{new Date(b.createdTime).toLocaleString()}{b.size ? ` · ${(Number(b.size) / 1048576).toFixed(1)} MB` : ''}</p>
                  </div>
                  <Button variant="secondary" busy={busy === 'restore'} onClick={() => restore(() => restoreGoogleBackup(b.id))}>Restore</Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            While signed in with Google, the data and photos are backed up automatically to a folder in your Google Drive
            {status?.folder ? ` ("${status.folder}")` : ''} after changes (at most every {settings.auto_backup_minutes} minutes).
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Backup file on this computer</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { window.location.href = '/api/v1/backup/download'; }}><Download className="w-4 h-4" /> Download backup (.zip)</Button>
              <Button variant="secondary" busy={busy === 'restore'} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> Restore from file…</Button>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) restore(() => restoreBackupFile(f));
              }} />
            </div>
          </div>
          <details className="bg-slate-950 rounded-xl p-4">
            <summary className="text-sm font-semibold text-white cursor-pointer">Google sign-in setup {settings.google_configured ? '(configured)' : '(not configured)'}</summary>
            <p className="text-xs text-slate-400 mt-3">
              Create an OAuth client of type <b>Desktop app</b> in Google Cloud Console (APIs &amp; Services → Credentials), enable the
              <b> Google Drive API</b>, and paste the Client ID and Client Secret here. This is done once per installation.
            </p>
            <div className="space-y-3 mt-3">
              <TextInput label="Google Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
              <TextInput label={`Google Client Secret${settings.google_client_secret_set ? ' (saved — leave empty to keep)' : ''}`} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
              <Button busy={busy === 'google'} onClick={() => act('google', async () => { onSettings(await saveSettings({ google_client_id: clientId, google_client_secret: secret })); setSecret(''); await reloadAll(); }, 'Google settings saved.')}>
                <Save className="w-4 h-4" /> Save Google settings
              </Button>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
};

const GoalsSection: React.FC<{ toast: ToastApi }> = ({ toast }) => {
  const [goals, setGoals] = useState<KpiGoal[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getGoals().then(setGoals).catch(() => undefined); }, []);
  const groups = Array.from(new Set(goals.map((g) => g.group_name)));
  const update = (i: number, k: keyof KpiGoal, v: string) => setGoals(goals.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  return (
    <Card
      title="KPI goals (goal slides)"
      actions={
        <>
          <Button variant="secondary" onClick={() => setGoals([...goals, { group_name: groups[0] || 'Sewing', category: '', target: '', responsible: '' }])}><Plus className="w-4 h-4" /> Add goal</Button>
          <Button busy={busy} onClick={async () => {
            setBusy(true);
            try { setGoals(await saveGoals(goals.filter((g) => g.category.trim() && g.group_name.trim()))); toast.ok('KPI goals saved.'); } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
          }}><Save className="w-4 h-4" /> Save goals</Button>
        </>
      }
    >
      <p className="text-xs text-slate-500 mb-3">Each group becomes one "Our Main KPI's Goal" slide, shown before the departments that use that group.</p>
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <thead><tr className="text-xs text-slate-400 text-left">{['Group', 'Category', 'Target', 'Responsible', ''].map((h) => <th key={h} className="px-1 py-1">{h}</th>)}</tr></thead>
          <tbody>
            {goals.map((g, i) => (
              <tr key={i}>
                {(['group_name', 'category', 'target', 'responsible'] as const).map((k) => (
                  <td key={k} className="px-1 py-0.5">
                    <input value={g[k] ?? ''} onChange={(e) => update(i, k, e.target.value)} list={k === 'group_name' ? 'goal-groups' : undefined}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                  </td>
                ))}
                <td><Button variant="ghost" onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="goal-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
      </div>
    </Card>
  );
};

const DangerSection: React.FC<{ reloadAll: () => Promise<void>; toast: ToastApi }> = ({ reloadAll, toast }) => (
  <Card title="Start fresh">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-400">Removes all departments, lines, people, photos, monthly figures and goals (for example the demo data). Company settings and backups in Google Drive are kept.</p>
      <Button variant="danger" onClick={async () => {
        const answer = window.prompt('This deletes all KPI data on this computer. Type DELETE to confirm.');
        if (answer !== 'DELETE') return;
        try { await resetData(); await reloadAll(); toast.ok('All data removed. Add your departments to begin.'); } catch (e) { toast.error(errorText(e)); }
      }}><Trash2 className="w-4 h-4" /> Remove all data</Button>
    </div>
  </Card>
);
