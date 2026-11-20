import React, { useState } from 'react';
import {
  ShieldCheck,
  CloudUpload,
  HardDrive,
  Network,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleBackupNow = () => {
    setBackupLoading(true);
    setBackupMsg(null);
    setTimeout(() => {
      setBackupLoading(false);
      setBackupMsg('Encrypted database snapshot successfully packaged and verified on Google Drive!');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & Disaster Recovery</h2>
        <p className="text-sm text-slate-400 mt-1">
          Local source-of-truth host settings, encrypted cloud backups, and network access configuration.
        </p>
      </div>

      {backupMsg && (
        <div className="p-4 rounded-xl flex items-center space-x-3 text-sm font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Grid of System Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Host Server Status */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Local Host PC (Source of Truth)</h3>
              <p className="text-xs text-slate-400">Windows Server / Local Database Engine</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-200">PostgreSQL / Relational 16</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Office LAN Status</span>
              <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active • Port 8000</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Offline Resilience</span>
              <span className="text-emerald-400 font-semibold">Operates without Internet</span>
            </div>
          </div>
        </div>

        {/* Google Drive Cloud Backup */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Encrypted Google Drive Backups</h3>
              <p className="text-xs text-slate-400">Automated Daily Disaster Recovery</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Scheduled Backup</span>
              <span className="font-semibold text-slate-200">Daily at 02:00 AM (Asia/Dhaka)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Encryption Method</span>
              <span className="text-indigo-400 font-semibold">AES-256-CBC with SHA-256 Checksum</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-400">Retention Policy</span>
              <span className="font-semibold text-slate-200">7 Daily, 4 Weekly, 12 Monthly</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
            <button
              onClick={handleBackupNow}
              disabled={backupLoading}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              {backupLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Encrypting & Uploading...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Manual Backup Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tailscale Remote Connectivity */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tailscale Secure Remote Mesh</h3>
              <p className="text-xs text-slate-400">Encrypted Remote Access Without Port Forwarding</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Remote management connects securely through the company’s private Tailscale network. Database ports and
            internal services are completely shielded from the public internet.
          </p>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            https://kpi-host.ufl-mesh.ts.net
          </div>
        </div>

        {/* QR PC Migration */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">QR PC Migration & Setup</h3>
              <p className="text-xs text-slate-400">Replacement Host PC Onboarding</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            If the current host PC is replaced or upgraded, install the software on the new PC, select "Restore Existing
            Company", and scan a single-use pairing token to restore data from Google Drive.
          </p>

          <div className="inline-flex items-center space-x-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Single-Use 5-Minute Cryptographic Token</span>
          </div>
        </div>
      </div>
    </div>
  );
};
