import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { CompanyOverviewData, ReportingPeriod } from '../types';
import { getCompanyOverview, getReportingPeriods } from '../api';
import { CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, BarChart3, Layers, Calendar, DollarSign } from 'lucide-react';

interface ExecutiveDashboardProps {
  onSelectDepartment: (deptId: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onSelectDepartment }) => {
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [overview, setOverview] = useState<CompanyOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadOverview(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const data = await getReportingPeriods();
      setPeriods(data);
      const oct = data.find((p) => p.year === 2026 && p.month === 10);
      if (oct) {
        setSelectedPeriodId(oct.id);
      } else if (data.length > 0) {
        setSelectedPeriodId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load periods', err);
    }
  };

  const loadOverview = async (periodId: string) => {
    setLoading(true);
    try {
      const data = await getCompanyOverview(periodId);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load overview', err);
    } finally {
      setLoading(false);
    }
  };

  const getChartOption = () => {
    if (!overview) return {};

    const depts = overview.departments.map((d) => d.code);
    const planData = overview.departments.map((d) => d.plan_pcs);
    const produceData = overview.departments.map((d) => d.produce_pcs);
    const achData = overview.departments.map((d) => d.achievement_pct);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Plan Pcs', 'Produce Pcs', 'Achievement %'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '16%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: depts,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Pcs',
          nameTextStyle: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#94a3b8' },
        },
        {
          type: 'value',
          name: 'Ach %',
          min: 0,
          max: 120,
          nameTextStyle: { color: '#64748b' },
          splitLine: { show: false },
          axisLabel: {
            formatter: '{value}%',
            color: '#94a3b8',
          },
        },
      ],
      series: [
        {
          name: 'Plan Pcs',
          type: 'bar',
          data: planData,
          itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 28,
        },
        {
          name: 'Produce Pcs',
          type: 'bar',
          data: produceData,
          itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 28,
        },
        {
          name: 'Achievement %',
          type: 'line',
          yAxisIndex: 1,
          data: achData,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3, color: '#f59e0b' },
          symbolSize: 8,
        },
      ],
    };
  };

  const getStatusBadge = (color: string) => {
    switch (color) {
      case 'green':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Target Achieved</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning</span>
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Critical</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Executive Performance Scorecard</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time departmental metrics and monthly target achievements for UFL
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading performance data...</p>
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Total Target Output</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">
                {overview.summary.total_plan_pcs.toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Planned across all departments</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Actual Output</span>
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                {overview.summary.total_produce_pcs.toLocaleString()} <span className="text-xs font-normal text-slate-400">pcs</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Produced and finished goods</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Plan Achievement</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    overview.summary.overall_plan_achievement_pct >= 100
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {overview.summary.overall_plan_achievement_pct}%
                </span>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">
                {overview.summary.overall_plan_achievement_pct}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Weighted factory average</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Line Cost Profit / Loss</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p
                className={`text-2xl font-extrabold mt-2 ${
                  overview.summary.total_profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${overview.summary.total_profit_loss.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Line cost vs budgeted margin</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Department Output & Achievement Breakdown</h3>
              <span className="text-xs text-slate-400 font-medium">Interactive Apache ECharts</span>
            </div>
            <ReactECharts option={getChartOption()} style={{ height: '320px', width: '100%' }} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-3">Departmental Operational Units</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.departments.map((dept) => (
                <div
                  key={dept.department_id}
                  onClick={() => onSelectDepartment(dept.department_id)}
                  className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4.5 cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{dept.code}</span>
                      <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {dept.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">Head: {dept.head_name || 'N/A'}</p>
                    </div>
                    {getStatusBadge(dept.status_color)}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">Plan</p>
                      <p className="text-sm font-semibold text-slate-300">{dept.plan_pcs.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">Produced</p>
                      <p className="text-sm font-semibold text-emerald-400">{dept.produce_pcs.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-medium">Achieve</p>
                      <p className="text-sm font-bold text-indigo-400">{dept.achievement_pct}%</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end text-xs font-medium text-slate-400 group-hover:text-slate-200">
                    <span>View Line Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
