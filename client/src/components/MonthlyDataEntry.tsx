import React, { useEffect, useState } from 'react';
import type { Department, KpiSubmission, ProductionRecord, ReportingPeriod } from '../types';
import {
  getDepartments,
  getReportingPeriods,
  getSubmissions,
  getSubmissionDetails,
  clonePreviousPeriod,
  batchUpdateSubmission,
  approveSubmission,
} from '../api';
import {
  CopyPlus,
  Save,
  CheckCircle,
  Calendar,
  Building2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';

export const MonthlyDataEntry: React.FC = () => {
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [activeSubmission, setActiveSubmission] = useState<KpiSubmission | null>(null);
  const [editableRows, setEditableRows] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadInitialDropdowns();
  }, []);

  useEffect(() => {
    if (selectedPeriodId && selectedDeptId) {
      loadSubmission(selectedPeriodId, selectedDeptId);
    }
  }, [selectedPeriodId, selectedDeptId]);

  const loadInitialDropdowns = async () => {
    try {
      const [periodsData, deptsData] = await Promise.all([getReportingPeriods(), getDepartments()]);
      setPeriods(periodsData);
      setDepartments(deptsData);

      const nov = periodsData.find((p) => p.year === 2026 && p.month === 11);
      if (nov) {
        setSelectedPeriodId(nov.id);
      } else if (periodsData.length > 0) {
        setSelectedPeriodId(periodsData[0].id);
      }

      if (deptsData.length > 0) {
        setSelectedDeptId(deptsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load filters', err);
    }
  };

  const loadSubmission = async (periodId: string, deptId: string) => {
    setLoading(true);
    setNotification(null);
    try {
      const subs = await getSubmissions(periodId, deptId);
      if (subs.length > 0) {
        const full = await getSubmissionDetails(subs[0].id);
        setActiveSubmission(full);
        setEditableRows(full.production_records || []);
      } else {
        setActiveSubmission(null);
        setEditableRows([]);
      }
    } catch (err) {
      console.error('Error loading submission', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClonePreviousMonth = async () => {
    if (!selectedPeriodId) return;
    setActionLoading(true);
    setNotification(null);
    try {
      const result = await clonePreviousPeriod(selectedPeriodId, undefined, selectedDeptId || undefined);
      setNotification({
        type: 'success',
        message: result.message || 'Successfully cloned previous month baseline data!',
      });
      await loadSubmission(selectedPeriodId, selectedDeptId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to clone previous month data.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCellChange = (id: string, field: keyof ProductionRecord, val: any) => {
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: Number(val) || 0 };

        if (field === 'produce_pcs' || field === 'plan_pcs') {
          const plan = field === 'plan_pcs' ? Number(val) || 0 : row.plan_pcs;
          const produce = field === 'produce_pcs' ? Number(val) || 0 : row.produce_pcs;
          updated.pcs_ach_pct = plan > 0 ? Number(((produce / plan) * 100).toFixed(2)) : 0;
        }

        if (field === 'produce_hours' || field === 'plan_hours') {
          const planH = field === 'plan_hours' ? Number(val) || 0 : row.plan_hours;
          const produceH = field === 'produce_hours' ? Number(val) || 0 : row.produce_hours;
          updated.hour_ach_pct = planH > 0 ? Number(((produceH / planH) * 100).toFixed(2)) : 0;
        }

        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!activeSubmission) return;
    setActionLoading(true);
    setNotification(null);
    try {
      await batchUpdateSubmission(activeSubmission.id, {
        production_records: editableRows,
      });
      setNotification({
        type: 'success',
        message: 'All modified lines saved successfully!',
      });
      await loadSubmission(selectedPeriodId, selectedDeptId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save changes.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeSubmission) return;
    setActionLoading(true);
    try {
      await approveSubmission(activeSubmission.id, 'Management Sign-off');
      setNotification({
        type: 'success',
        message: 'Monthly report finalized and approved!',
      });
      await loadSubmission(selectedPeriodId, selectedDeptId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Failed to approve submission.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);
  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Monthly Roll-Forward & Data Entry</h2>
          <p className="text-sm text-slate-400 mt-1">
            Copy previous month’s baseline lines, targets & budgets in 1-click. Edit only what changed!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-800/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-indigo-950/20">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Automation Feature</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Entering data for {selectedPeriod?.name}?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Clicking the button below copies all production lines, standard hourly targets, and budgeted costs from the
            previous month. You only need to type in the actual output or changes!
          </p>
        </div>

        <button
          onClick={handleClonePreviousMonth}
          disabled={actionLoading}
          className="shrink-0 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          {actionLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CopyPlus className="w-4 h-4" />
          )}
          <span>Copy Previous Month Baseline</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading line records...</p>
        </div>
      ) : editableRows.length > 0 ? (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-white">
                {selectedDept?.name} Lines ({editableRows.length} active)
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                  activeSubmission?.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                Status: {activeSubmission?.status}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>

              {activeSubmission?.status !== 'approved' && (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Approve & Lock</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Line Name</th>
                  <th className="py-3 px-4">Plan Pcs</th>
                  <th className="py-3 px-4 bg-slate-800/40 text-emerald-400">Actual Produced Pcs (Edit)</th>
                  <th className="py-3 px-4">Pcs Ach %</th>
                  <th className="py-3 px-4">Plan Hours</th>
                  <th className="py-3 px-4 bg-slate-800/40 text-indigo-400">Actual Hours (Edit)</th>
                  <th className="py-3 px-4">Hour Ach %</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {editableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {row.line?.line_number || 'Line'}
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={row.plan_pcs}
                        onChange={(e) => handleCellChange(row.id, 'plan_pcs', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-2 px-4 bg-slate-800/20">
                      <input
                        type="number"
                        value={row.produce_pcs}
                        onChange={(e) => handleCellChange(row.id, 'produce_pcs', e.target.value)}
                        className="w-28 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold font-mono rounded px-2.5 py-1 focus:border-emerald-400 focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={
                          row.pcs_ach_pct >= 100
                            ? 'text-emerald-400'
                            : row.pcs_ach_pct >= 90
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {row.pcs_ach_pct}%
                      </span>
                    </td>

                    <td className="py-2 px-4">
                      <input
                        type="number"
                        step="0.1"
                        value={row.plan_hours}
                        onChange={(e) => handleCellChange(row.id, 'plan_hours', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-2 px-4 bg-slate-800/20">
                      <input
                        type="number"
                        step="0.1"
                        value={row.produce_hours}
                        onChange={(e) => handleCellChange(row.id, 'produce_hours', e.target.value)}
                        className="w-24 bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 font-bold font-mono rounded px-2.5 py-1 focus:border-indigo-400 focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {row.hour_ach_pct}%
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.pcs_ach_pct >= 100
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {row.pcs_ach_pct >= 100 ? 'On Track' : 'Below Target'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <CopyPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">No Entry Draft for this Month Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Click the "Copy Previous Month Baseline" button above to pull all 9 production lines and targets from{' '}
            {selectedPeriod?.name === 'November 2026' ? 'October 2026' : 'the prior period'}.
          </p>
          <button
            onClick={handleClonePreviousMonth}
            disabled={actionLoading}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Baseline for {selectedPeriod?.name}</span>
          </button>
        </div>
      )}
    </div>
  );
};
