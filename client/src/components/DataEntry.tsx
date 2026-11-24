import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import {
  copyPrevious, errorText, getLineMetrics, getNpt, getUnitMetrics, saveLineMetrics, saveNpt, saveUnitMetrics,
} from '../api';
import type { Department, LineMetricRow, NptReason, UnitMetricRow } from '../types';
import { Button, Card, MONTHS, PeriodPicker, Select, Toast, useToast } from './ui';

interface Props {
  departments: Department[];
  departmentId: number | null;
  onDepartment: (id: number) => void;
  year: number;
  month: number;
  onPeriod: (y: number, m: number) => void;
}

const LINE_COLS: { key: string; label: string; group: string; money?: boolean }[] = [
  { key: 'eff_target', label: 'Target %', group: 'Efficiency' },
  { key: 'eff_ach', label: 'Ach %', group: 'Efficiency' },
  { key: 'prod_target', label: 'Target %', group: 'Productivity' },
  { key: 'prod_ach', label: 'Ach %', group: 'Productivity' },
  { key: 'profit_loss', label: 'Profit/Loss', group: 'Line cost', money: true },
  { key: 'idle_loss', label: 'Idle hour loss', group: 'Line cost', money: true },
  { key: 'cost_diff', label: 'Total diff', group: 'Line cost', money: true },
  { key: 'sew_dhu_target', label: 'Target %', group: 'Sewing DHU' },
  { key: 'sew_dhu', label: 'Ach %', group: 'Sewing DHU' },
  { key: 'fin_dhu_target', label: 'Target %', group: 'Finishing DHU' },
  { key: 'fin_dhu', label: 'Ach %', group: 'Finishing DHU' },
];

const UNIT_COLS: { key: string; label: string }[] = [
  { key: 'plan', label: 'Plan' }, { key: 'produce', label: 'Produce' },
  { key: 'eff_target', label: 'Eff. target %' }, { key: 'eff_ach', label: 'Efficiency %' },
  { key: 'earning_target', label: 'Earning target' }, { key: 'earning', label: 'Earning' },
  { key: 'dhu_target', label: 'DHU target %' }, { key: 'dhu', label: 'DHU %' },
];

const toNum = (v: string) => (v.trim() === '' ? null : Number(v.replace(/[,%$\s]/g, '')));

export const DataEntry: React.FC<Props> = ({ departments, departmentId, onDepartment, year, month, onPeriod }) => {
  const dept = departments.find((d) => d.id === departmentId) ?? departments[0];
  const [lineRows, setLineRows] = useState<LineMetricRow[]>([]);
  const [unitRows, setUnitRows] = useState<UnitMetricRow[]>([]);
  const [hasPrev, setHasPrev] = useState(false);
  const [npt, setNpt] = useState<NptReason[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const t = useToast();

  const load = useCallback(async () => {
    if (!dept) return;
    try {
      if (dept.kind === 'lines') {
        const r = await getLineMetrics(dept.id, year, month);
        setLineRows(r.rows);
        setHasPrev(r.has_previous);
        if (month > 0) setNpt((await getNpt(dept.id, year, month)).reasons);
      } else {
        const r = await getUnitMetrics(dept.id, year, month);
        setUnitRows(r.rows);
        setHasPrev(r.has_previous);
      }
      setDirty(false);
    } catch (e) {
      t.error(errorText(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept?.id, dept?.kind, year, month]);

  useEffect(() => { load(); }, [load]);

  if (!dept) return <Card><p className="text-slate-400 text-sm">Add a department first (Settings → Departments & Lines).</p></Card>;

  const periodName = month === 0 ? `${year - 1} full-year average` : `${MONTHS[month - 1]} ${year}`;

  const save = async () => {
    setBusy('save');
    try {
      if (dept.kind === 'lines') {
        const r = await saveLineMetrics(dept.id, year, month, lineRows);
        setLineRows(r.rows);
        if (month > 0) setNpt((await saveNpt(dept.id, year, month, npt.filter((n) => n.reason.trim()))).reasons);
      } else {
        setUnitRows((await saveUnitMetrics(dept.id, year, month, unitRows)).rows);
      }
      setDirty(false);
      t.ok(`${dept.code} — ${periodName} saved.`);
    } catch (e) {
      t.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (mode: 'targets' | 'all') => {
    if (dirty && !window.confirm('You have unsaved changes. Copy anyway? (unsaved typing will be lost)')) return;
    setBusy(mode);
    try {
      const r = await copyPrevious(dept.id, year, month, mode);
      if (dept.kind === 'lines') setLineRows(r.rows); else setUnitRows(r.rows);
      setDirty(false);
      t.ok(r.copied ? `Copied ${mode === 'targets' ? 'targets' : 'all values'} from the previous month into empty cells (${r.copied} rows).` : 'The previous month has no data to copy.');
    } catch (e) {
      t.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const setLine = (i: number, key: string, value: string) => {
    setLineRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: toNum(value) } : r)));
    setDirty(true);
  };
  const setUnit = (i: number, key: string, value: string) => {
    setUnitRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: toNum(value) } : r)));
    setDirty(true);
  };

  const cellInput = (value: unknown, onChange: (v: string) => void, prev?: unknown) => (
    <NumCell value={value} onChange={onChange} hint={prev} />
  );

  const groups = LINE_COLS.reduce<{ group: string; span: number }[]>((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && last.group === c.group) last.span++; else acc.push({ group: c.group, span: 1 });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Monthly Data Entry</h2>
          <p className="text-sm text-slate-400">Type this month's numbers. Grey hints show last month's values. Percent fields take plain numbers (80 = 80%).</p>
        </div>
        <div className="flex items-end gap-2">
          <Select label="Department" value={dept.id} onChange={(e) => onDepartment(Number(e.target.value))}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </Select>
          <PeriodPicker year={year} month={month} onChange={onPeriod} allowAverage />
        </div>
      </div>

      <Card
        title={`${dept.code} · ${periodName}`}
        actions={
          <>
            {month > 0 && (
              <>
                <Button variant="secondary" onClick={() => copy('targets')} busy={busy === 'targets'} disabled={!hasPrev} title="Copy last month's targets into empty cells">
                  <Copy className="w-4 h-4" /> Copy last month's targets
                </Button>
                <Button variant="secondary" onClick={() => copy('all')} busy={busy === 'all'} disabled={!hasPrev} title="Copy every value from last month into empty cells">
                  <Copy className="w-4 h-4" /> Copy all of last month
                </Button>
              </>
            )}
            <Button onClick={save} busy={busy === 'save'}><Save className="w-4 h-4" /> Save{dirty ? ' *' : ''}</Button>
          </>
        }
      >
        {dept.kind === 'lines' ? (
          lineRows.length === 0 ? <p className="text-slate-400 text-sm">This department has no lines. Add lines in Settings → Departments & Lines.</p> : (
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th />
                    {groups.map((g) => <th key={g.group} colSpan={g.span} className="px-1 pb-1 text-center border-b border-slate-700">{g.group}</th>)}
                  </tr>
                  <tr className="text-[11px] text-slate-500">
                    <th className="text-left px-1 py-1">Line</th>
                    {LINE_COLS.map((c) => <th key={c.key} className="px-1 py-1 font-medium">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {lineRows.map((r, i) => (
                    <tr key={r.line_id}>
                      <td className="pr-2 py-1 font-semibold text-white whitespace-nowrap">{r.label}</td>
                      {LINE_COLS.map((c) => (
                        <td key={c.key} className="px-0.5 py-0.5">{cellInput(r[c.key], (v) => setLine(i, c.key, v), r.previous?.[c.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-3">Total diff is filled automatically as Profit/Loss + Idle hour loss when left empty. Use negative numbers for losses.</p>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500">
                  <th className="text-left px-1 py-1">Who</th>
                  {UNIT_COLS.map((c) => <th key={c.key} className="px-1 py-1 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {unitRows.map((r, i) => (
                  <tr key={r.unit_person_id}>
                    <td className="pr-2 py-1 font-semibold text-white whitespace-nowrap">{r.label}</td>
                    {UNIT_COLS.map((c) => (
                      <td key={c.key} className="px-0.5 py-0.5">{cellInput(r[c.key], (v) => setUnit(i, c.key, v), r.previous?.[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-3">The first row is the whole section; the other rows are supervisors (add them under People & Photos).</p>
          </div>
        )}
      </Card>

      {dept.kind === 'lines' && month > 0 && (
        <Card
          title={`NPT reasons — ${dept.code}, ${MONTHS[month - 1]} ${year}`}
          actions={<Button variant="secondary" onClick={() => { setNpt([...npt, { reason: '', hours: null }]); setDirty(true); }}><Plus className="w-4 h-4" /> Add reason</Button>}
        >
          {npt.length === 0 ? <p className="text-sm text-slate-400">No NPT reasons for this month.</p> : (
            <div className="space-y-2">
              {npt.map((n, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={n.reason}
                    placeholder="Reason (e.g. Fabric delay (Fabric Team))"
                    onChange={(e) => { setNpt(npt.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x))); setDirty(true); }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    value={n.hours ?? ''}
                    placeholder="Hours"
                    inputMode="decimal"
                    onChange={(e) => { setNpt(npt.map((x, j) => (j === i ? { ...x, hours: toNum(e.target.value) } : x))); setDirty(true); }}
                    className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white text-right"
                  />
                  <Button variant="ghost" onClick={() => { setNpt(npt.filter((_, j) => j !== i)); setDirty(true); }} title="Remove"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <p className="text-xs text-slate-500">Total: {npt.reduce((a, n) => a + (Number(n.hours) || 0), 0).toLocaleString()} hours. Click Save above to store.</p>
            </div>
          )}
        </Card>
      )}
      <Toast toast={t.toast} onClose={t.close} />
    </div>
  );
};

/** Number cell: keeps the typed text locally, reports every change to the parent immediately. */
const NumCell: React.FC<{ value: unknown; hint?: unknown; onChange: (v: string) => void }> = ({ value, hint, onChange }) => {
  const external = value === null || value === undefined ? '' : String(value);
  const [text, setText] = useState(external);
  useEffect(() => {
    if (toNum(text) !== (external === '' ? null : Number(external))) setText(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);
  return (
    <input
      value={text}
      onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
      placeholder={hint == null ? '' : String(hint)}
      inputMode="decimal"
      className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-sm text-white text-right focus:outline-none focus:border-indigo-500 placeholder-slate-600"
    />
  );
};
