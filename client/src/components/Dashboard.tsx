import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { getDashboard, errorText } from '../api';
import { Card, PeriodPicker, fmtMoney, fmtPct } from './ui';

interface Props {
  year: number;
  month: number;
  currency: string;
  onPeriod: (y: number, m: number) => void;
  onOpenDepartment: (id: number) => void;
}

export const Dashboard: React.FC<Props> = ({ year, month, currency, onPeriod, onOpenDepartment }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getDashboard(year, month).then(setData).catch((e) => setError(errorText(e)));
  }, [year, month]);

  const t = data?.totals ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineDepts = (data?.departments ?? []).filter((d: any) => d.kind === 'lines');

  const tiles = [
    { label: `Line cost YTD ${year}`, value: fmtMoney(t.cost_ytd, currency), good: (t.cost_ytd ?? 0) >= 0 },
    { label: 'Line cost this month', value: fmtMoney(t.cost_month, currency), good: (t.cost_month ?? 0) >= 0 },
    { label: 'Avg efficiency', value: fmtPct(t.eff_ach, 1), good: null },
    { label: 'Avg productivity ach.', value: fmtPct(t.prod_ach, 1), good: null },
    { label: 'Avg sewing DHU', value: fmtPct(t.sew_dhu, 2), good: null },
    { label: 'Avg finishing DHU', value: fmtPct(t.fin_dhu, 2), good: null },
  ];

  const chart = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xAxis: { type: 'category', data: lineDepts.map((d: any) => d.code), axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    series: [
      {
        name: `Line cost YTD (${currency})`,
        type: 'bar',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: lineDepts.map((d: any) => ({ value: d.cost_total ?? 0, itemStyle: { color: (d.cost_total ?? 0) >= 0 ? '#10b981' : '#f43f5e' } })),
        label: { show: true, position: 'top', color: '#e2e8f0' },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Executive Dashboard</h2>
          <p className="text-sm text-slate-400">{data?.company_name} · {data?.period?.name}</p>
        </div>
        <PeriodPicker year={year} month={month} onChange={onPeriod} />
      </div>
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">{tile.label}</p>
            <p className={`text-xl font-bold mt-1 ${tile.good === null ? 'text-white' : tile.good ? 'text-emerald-400' : 'text-rose-400'}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {lineDepts.length > 0 && (
        <Card title={`Line cost achievement by department (${year} total)`}>
          <ReactECharts option={chart} style={{ height: 280 }} notMerge />
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(data?.departments ?? []).map((d: any) => (
          <button
            key={d.id}
            onClick={() => onOpenDepartment(d.id)}
            className="text-left bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-2xl p-5 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">{d.code}</span>
              <span className="text-[11px] text-slate-500">{d.kind === 'lines' ? `${d.line_count} lines` : 'Unit'}</span>
            </div>
            <p className="text-lg font-bold text-white mt-1">{d.name}</p>
            <p className="text-xs text-slate-400">{d.head_label || '—'}</p>
            {d.kind === 'lines' ? (
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Mini label="Efficiency" value={fmtPct(d.summary.eff_ach, 1)} />
                <Mini label="Sew DHU" value={fmtPct(d.summary.sew_dhu, 2)} />
                <Mini label="Cost YTD" value={fmtMoney(d.cost_total, currency)} tone={(d.cost_total ?? 0) >= 0 ? 'good' : 'bad'} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Mini label="Efficiency" value={fmtPct(d.summary.eff_ach, 1)} />
                <Mini label="Prod. Ach" value={fmtPct(d.summary.prod_ach, 0)} />
                <Mini label="DHU" value={fmtPct(d.summary.dhu, 2)} />
              </div>
            )}
          </button>
        ))}
      </div>
      {data && data.departments.length === 0 && (
        <Card><p className="text-slate-400 text-sm">No departments yet. Add them in <b>Settings → Departments & Lines</b>.</p></Card>
      )}
    </div>
  );
};

const Mini: React.FC<{ label: string; value: string; tone?: 'good' | 'bad' }> = ({ label, value, tone }) => (
  <div className="bg-slate-950 rounded-lg py-2">
    <p className="text-[10px] text-slate-500">{label}</p>
    <p className={`text-sm font-bold ${tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
  </div>
);
