import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import type { Department } from '../types';
import { Button, Card, MONTHS, PeriodPicker, Select, Toast, useToast } from './ui';

interface Props {
  departments: Department[];
  year: number;
  month: number;
  onPeriod: (y: number, m: number) => void;
}

export const PresentationExport: React.FC<Props> = ({ departments, year, month, onPeriod }) => {
  const [scope, setScope] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const t = useToast();

  const lineSlides = departments.filter((d) => d.kind === 'lines' && (scope === 'all' || String(d.id) === scope))
    .reduce((a, d) => a + d.lines.filter((l) => l.is_active).length + 2, 0);

  const exportDeck = async () => {
    setBusy(true);
    setSaved(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (scope !== 'all') params.set('department_id', scope);
      const res = await fetch(`/api/v1/reports/export-pptx?${params}`, { headers: { Accept: 'application/vnd.openxmlformats-officedocument.presentationml.presentation, application/json' } });
      if (!res.ok) {
        let msg = `Export failed (HTTP ${res.status}).`;
        try {
          const j = await res.json();
          msg = [j.error || j.message, j.details].filter(Boolean).join('\n') || msg;
        } catch { /* not json */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      const name = m ? decodeURIComponent(m[1]) : `KPI_${MONTHS[month - 1]}_${year}.pptx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSaved(name);
    } catch (e) {
      t.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Presentation</h2>
          <p className="text-sm text-slate-400">Creates an editable PowerPoint in the monthly KPI format, with everyone's photos.</p>
        </div>
        <div className="flex items-end gap-2">
          <Select label="Include" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} only</option>)}
          </Select>
          <PeriodPicker year={year} month={month} onChange={onPeriod} />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">KPI Performance — {MONTHS[month - 1]} {year}</p>
              <p className="text-xs text-slate-400 mt-1">
                Cover · KPI goals · line-wise cost achievement · one slide per line (about {lineSlides} line & summary slides) · NPT · cutting/print/other units · thank you.
                Tables, charts and text stay editable in PowerPoint.
              </p>
            </div>
          </div>
          <Button onClick={exportDeck} busy={busy} className="px-6 py-3">
            <Download className="w-4 h-4" /> {busy ? 'Creating…' : 'Export PowerPoint (.pptx)'}
          </Button>
        </div>
        {saved && (
          <p className="mt-4 text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded-lg p-3">
            Saved <b>{saved}</b> to your <b>Downloads</b> folder.
          </p>
        )}
      </Card>
      <Toast toast={t.toast} onClose={t.close} />
    </div>
  );
};
