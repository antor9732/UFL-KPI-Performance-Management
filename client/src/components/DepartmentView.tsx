import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { getDepartmentDashboard, errorText } from '../api';
import type { Department } from '../types';
import { Card, PeriodPicker, Select, fmtMoney, fmtNum, fmtPct } from './ui';

interface Props {
  departments: Department[];
  departmentId: number | null;
  onDepartment: (id: number) => void;
  year: number;
  month: number;
  currency: string;
  onPeriod: (y: number, m: number) => void;
}

const cls = (good: boolean | null) => (good === null ? 'text-slate-200' : good ? 'text-emerald-400' : 'text-rose-400');
const ge = (a: unknown, b: unknown) => (a == null || b == null ? null : Number(a) >= Number(b));
const le = (a: unknown, b: unknown) => (a == null || b == null ? null : Number(a) <= Number(b));

export const DepartmentView: React.FC<Props> = ({ departments, departmentId, onDepartment, year, month, currency, onPeriod }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const id = departmentId ?? departments[0]?.id ?? null;

  useEffect(() => {
    if (!id) return;
    setError(null);
    getDepartmentDashboard(id, year, month).then((r) => setData(r.department)).catch((e) => setError(errorText(e)));
  }, [id, year, month]);

  if (!departments.length) return <Card><p className="text-slate-400 text-sm">No departments yet.</p></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Department Analytics</h2>
          <p className="text-sm text-slate-400">{data?.name} · {data?.head_label}</p>
        </div>
        <div className="flex items-end gap-2">
          <Select label="Department" value={id ?? ''} onChange={(e) => onDepartment(Number(e.target.value))}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </Select>
          <PeriodPicker year={year} month={month} onChange={onPeriod} />
        </div>
      </div>
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      {data?.kind === 'lines' && <LinesView d={data} currency={currency} year={year} />}
      {data?.kind === 'unit' && <UnitView d={data} />}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinesView: React.FC<{ d: any; currency: string; year: number }> = ({ d, currency, year }) => {
  const chart = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: d.line_labels, axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    series: [{
      type: 'bar',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: d.lines.map((l: any) => ({ value: l.ytd.cost_total ?? 0, itemStyle: { color: (l.ytd.cost_total ?? 0) >= 0 ? '#10b981' : '#f43f5e' } })),
      label: { show: true, position: 'top', color: '#e2e8f0' },
    }],
  };
  return (
    <>
      <Card title={`Line cost achievement ${year} — total ${fmtMoney(d.cost_total, currency)}`}>
        <ReactECharts option={chart} style={{ height: 260 }} notMerge />
      </Card>
      <Card title="This month by line">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-800">
                {['Line', 'Efficiency', 'Productivity', 'Sew DHU', 'Fin DHU', 'Cost (month)', `Cost YTD`, 'Staff'].map((h) => <th key={h} className="py-2 px-2 text-left font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {d.lines.map((l: any) => (
                <tr key={l.id} className="border-b border-slate-800/60">
                  <td className="py-2 px-2 font-semibold text-white">{l.label}</td>
                  <td className={`py-2 px-2 ${cls(ge(l.current.eff_ach, l.current.eff_target))}`}>{fmtPct(l.current.eff_ach)} <span className="text-slate-500 text-xs">/ {fmtPct(l.current.eff_target)}</span></td>
                  <td className={`py-2 px-2 ${cls(ge(l.current.prod_ach, l.current.prod_target))}`}>{fmtPct(l.current.prod_ach)} <span className="text-slate-500 text-xs">/ {fmtPct(l.current.prod_target)}</span></td>
                  <td className={`py-2 px-2 ${cls(le(l.current.sew_dhu, l.current.sew_dhu_target))}`}>{fmtPct(l.current.sew_dhu, 2)}</td>
                  <td className={`py-2 px-2 ${cls(le(l.current.fin_dhu, l.current.fin_dhu_target))}`}>{fmtPct(l.current.fin_dhu, 2)}</td>
                  <td className={`py-2 px-2 ${cls(l.current.cost_diff == null ? null : l.current.cost_diff >= 0)}`}>{fmtMoney(l.current.cost_diff, currency)}</td>
                  <td className={`py-2 px-2 font-semibold ${cls(l.ytd.cost_total == null ? null : l.ytd.cost_total >= 0)}`}>{fmtMoney(l.ytd.cost_total, currency)}</td>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <td className="py-2 px-2 text-xs text-slate-400">{l.staff.filter((s: any) => !s.vacant).map((s: any) => s.label).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {d.npt.reasons.length > 0 && (
        <Card title={`NPT this month — ${fmtNum(d.npt.total)} hours`}>
          <ul className="space-y-1 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {d.npt.reasons.map((r: any, i: number) => <li key={i} className="flex justify-between border-b border-slate-800/60 py-1"><span className="text-slate-300">{r.reason}</span><b className="text-white">{fmtNum(r.hours)}</b></li>)}
          </ul>
        </Card>
      )}
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UnitView: React.FC<{ d: any }> = ({ d }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = d.rows.filter((r: any) => !r.is_avg);
  const chart = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#cbd5e1' } },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xAxis: { type: 'category', data: rows.map((r: any) => r.label.slice(0, 3)), axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    series: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'Efficiency', type: 'bar', data: rows.map((r: any) => r.eff_ach), itemStyle: { color: '#6366f1' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'Productivity Ach', type: 'line', data: rows.map((r: any) => r.prod_ach), itemStyle: { color: '#10b981' } },
    ],
  };
  return (
    <>
      <Card title="Year to date"><ReactECharts option={chart} style={{ height: 280 }} notMerge /></Card>
      <Card title="Monthly figures">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-400 border-b border-slate-800">{['Month', 'Plan', 'Produce', 'Ach%', 'Efficiency', 'Earning', 'DHU'].map((h) => <th key={h} className="py-2 px-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {d.rows.map((r: any) => (
                <tr key={r.label} className={`border-b border-slate-800/60 ${r.is_avg ? 'text-amber-300' : ''}`}>
                  <td className="py-1.5 px-2">{r.label}</td>
                  <td className="py-1.5 px-2">{fmtNum(r.plan)}</td>
                  <td className="py-1.5 px-2">{fmtNum(r.produce)}</td>
                  <td className="py-1.5 px-2">{fmtPct(r.prod_ach)}</td>
                  <td className="py-1.5 px-2">{fmtPct(r.eff_ach, 1)}</td>
                  <td className="py-1.5 px-2">{fmtNum(r.earning)}</td>
                  <td className="py-1.5 px-2">{fmtPct(r.dhu, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};
