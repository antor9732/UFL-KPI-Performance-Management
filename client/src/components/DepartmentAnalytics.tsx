import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { Department } from '../types';
import { getDepartmentDetails, getDepartments } from '../api';
import { Building2, ArrowLeft, TrendingUp } from 'lucide-react';

interface DepartmentAnalyticsProps {
  initialDeptId?: string;
  onBack: () => void;
}

export const DepartmentAnalytics: React.FC<DepartmentAnalyticsProps> = ({ initialDeptId, onBack }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDeptId || '');
  const [deptData, setDeptData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      loadDeptDetails(selectedDeptId);
    }
  }, [selectedDeptId]);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
      if (!selectedDeptId && data.length > 0) {
        setSelectedDeptId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadDeptDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await getDepartmentDetails(id);
      setDeptData(res);
    } catch (err) {
      console.error('Failed to load department details', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendChartOption = () => {
    if (!deptData || !deptData.monthly_trends) return {};

    const months = deptData.monthly_trends.map((t: any) => t.period_name.split(' ')[0]);
    const planPcs = deptData.monthly_trends.map((t: any) => t.plan_pcs);
    const producePcs = deptData.monthly_trends.map((t: any) => t.produce_pcs);
    const achPct = deptData.monthly_trends.map((t: any) => t.achievement_pct);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Plan Pcs', 'Produce Pcs', 'Ach %'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
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
          axisLabel: { formatter: '{value}%', color: '#94a3b8' },
        },
      ],
      series: [
        {
          name: 'Plan Pcs',
          type: 'bar',
          data: planPcs,
          itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 24,
        },
        {
          name: 'Produce Pcs',
          type: 'bar',
          data: producePcs,
          itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 24,
        },
        {
          name: 'Ach %',
          type: 'line',
          yAxisIndex: 1,
          data: achPct,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3, color: '#f59e0b' },
        },
      ],
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Department Drill-Down</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Detailed line-level and monthly historical performance records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-sm">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading department analytics...</p>
        </div>
      ) : deptData ? (
        <>
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                {deptData.department?.code}
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">{deptData.department?.name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Department In-Charge: <strong className="text-slate-200">{deptData.department?.head_name}</strong> •{' '}
                {deptData.lines?.length || 0} Production Lines Active
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>2026 Year-to-Date Monthly Trend</span>
              </h4>
            </div>
            <ReactECharts option={getTrendChartOption()} style={{ height: '320px', width: '100%' }} />
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <h4 className="text-base font-bold text-white mb-4">Assigned Production Lines</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deptData.lines?.map((line: any) => (
                <div
                  key={line.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-200">{line.line_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supervisor: {line.supervisor?.full_name || 'Floor Supervisor'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
