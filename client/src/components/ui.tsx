import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2, X, User } from 'lucide-react';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const Card: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, actions, children, className = '' }) => (
  <section className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-5 ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {title && <h3 className="text-base font-bold text-white">{title}</h3>}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean };
export const Button: React.FC<BtnProps> = ({ variant = 'primary', busy, children, className = '', disabled, ...rest }) => {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    danger: 'bg-rose-600/90 hover:bg-rose-500 text-white',
    ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...rest }) => (
  <label className="block">
    {label && <span className="block text-xs font-semibold text-slate-400 mb-1">{label}</span>}
    <input
      {...rest}
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 ${className}`}
    />
  </label>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...rest }) => (
  <label className="block">
    {label && <span className="block text-xs font-semibold text-slate-400 mb-1">{label}</span>}
    <select
      {...rest}
      className={`bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer ${className}`}
    >
      {children}
    </select>
  </label>
);

/** Year + month picker. allowAverage adds a "previous-year average" option (month 0). */
export const PeriodPicker: React.FC<{
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  allowAverage?: boolean;
}> = ({ year, month, onChange, allowAverage }) => {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => now + 1 - i);
  return (
    <div className="flex items-end gap-2">
      <Select label="Month" value={month} onChange={(e) => onChange(year, Number(e.target.value))}>
        {allowAverage && <option value={0}>Full-year average ({year - 1})</option>}
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </Select>
      <Select label="Year" value={year} onChange={(e) => onChange(Number(e.target.value), month)}>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
    </div>
  );
};

/** Default period = last complete month. */
export function defaultPeriod(): { year: number; month: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export type ToastState = { type: 'ok' | 'error'; text: string } | null;
export const Toast: React.FC<{ toast: ToastState; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast?.type === 'ok') {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);
  if (!toast) return null;
  const ok = toast.type === 'ok';
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl border shadow-2xl flex items-start gap-3 ${ok ? 'bg-emerald-950 border-emerald-700 text-emerald-200' : 'bg-rose-950 border-rose-700 text-rose-200'}`}>
      {ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
      <p className="text-sm flex-1 whitespace-pre-line">{toast.text}</p>
      <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  return {
    toast,
    ok: (text: string) => setToast({ type: 'ok', text }),
    error: (text: string) => setToast({ type: 'error', text }),
    close: () => setToast(null),
  };
}

/** Photo box with click-to-upload. */
export const PhotoBox: React.FC<{
  url: string | null;
  vacant?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
  className?: string;
  busy?: boolean;
}> = ({ url, vacant, onPick, onRemove, className = 'w-24 h-28', busy }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 ${className}`}>
      {url && !vacant ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : vacant ? (
        <div className="w-full h-full flex items-center justify-center text-rose-400 text-sm font-semibold">Vacant</div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-600"><User className="w-10 h-10" /></div>
      )}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-xs text-white gap-1 cursor-pointer"
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        {url ? 'Change photo' : 'Add photo'}
      </button>
      {url && onRemove && !vacant && (
        <button type="button" onClick={onRemove} title="Remove photo" className="absolute top-1 right-1 bg-black/70 rounded p-0.5 text-white opacity-0 group-hover:opacity-100 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export const fmtPct = (v: unknown, dec = 0) => (v === null || v === undefined || v === '' ? '–' : `${Number(v).toFixed(dec)}%`);
export const fmtMoney = (v: unknown, cur = '$') => {
  if (v === null || v === undefined || v === '') return '–';
  const n = Number(v);
  return `${n < 0 ? '-' : ''}${cur}${Math.abs(Math.round(n)).toLocaleString()}`;
};
export const fmtNum = (v: unknown) => (v === null || v === undefined || v === '' ? '–' : Math.round(Number(v)).toLocaleString());
