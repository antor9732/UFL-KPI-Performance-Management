import React, { useEffect, useState } from 'react';
import type { Department, ReportingPeriod } from '../types';
import { getDepartments, getReportingPeriods } from '../api';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';

export const PresentationGenerator: React.FC = () => {
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<string>('full'); // full, or department code
  const [selectedTheme, setSelectedTheme] = useState<string>('executive-navy');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, dData] = await Promise.all([getReportingPeriods(), getDepartments()]);
      setPeriods(pData);
      setDepartments(dData);
      const oct = pData.find((p) => p.year === 2026 && p.month === 10);
      if (oct) setSelectedPeriodId(oct.id);
      else if (pData.length > 0) setSelectedPeriodId(pData[0].id);
    } catch (err) {
      console.error('Failed to load presentation data', err);
    }
  };

  const [savedFileName, setSavedFileName] = useState<string>('');

  const handleExportPPTX = async () => {
    if (!selectedPeriodId) {
      setErrorMessage('Please select a reporting period first.');
      return;
    }
    setIsExporting(true);
    setExportComplete(false);
    setErrorMessage(null);

    const params = new URLSearchParams({ period_id: selectedPeriodId, scope: selectedScope, theme: selectedTheme });
    try {
      // Fetch the file first so real server errors are shown instead of a silent failed download.
      const res = await fetch(`/api/v1/reports/export-pptx?${params.toString()}`, {
        headers: { Accept: 'application/vnd.openxmlformats-officedocument.presentationml.presentation, application/json' },
      });

      if (!res.ok) {
        let msg = `Export failed (HTTP ${res.status}).`;
        try {
          const data = await res.json();
          msg = [data.error || data.message, data.details].filter(Boolean).join(' - ') || msg;
        } catch {
          /* not JSON */
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (blob.size === 0) throw new Error('The generated presentation file is empty.');

      const disposition = res.headers.get('Content-Disposition') || '';
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const fileName = match
        ? decodeURIComponent(match[1])
        : `UFL_KPI_Presentation_${(selectedPeriod?.name || 'Period').replace(/\s+/g, '_')}_${selectedTheme}.pptx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setSavedFileName(fileName);
      setExportComplete(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Presentation export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const slideDeckStructure = [
    { range: 'Slide 1 - 2', title: 'Cover & Executive KPI Scorecard', count: '2 Slides' },
    { range: 'Slide 3 - 17', title: 'Knit-01 (Line Cost, DHU Lines 1-9, Shipment, NPT)', count: '15 Slides' },
    { range: 'Slide 18 - 40', title: 'Knit-02 (Line Cost, DHU Lines 1-18, Leftovers, NPT)', count: '23 Slides' },
    { range: 'Slide 41 - 55', title: 'Knit-03 (Area Performance, DHU Lines 1-9, NPT)', count: '15 Slides' },
    { range: 'Slide 56 - 71', title: 'Woven Department (Area Performance, DHU 1-9, NPT)', count: '16 Slides' },
    { range: 'Slide 72 - 76', title: 'Cutting KPI & Supervisor Analytics (Fozlu, Salam, Sumon)', count: '5 Slides' },
    { range: 'Slide 77 - 80', title: 'Specialized Units (Printing, Embroidery, Schiffli)', count: '4 Slides' },
    { range: 'Slide 81 - 84', title: 'Sample Section & RFT Performance (Buyer-wise)', count: '4 Slides' },
    { range: 'Slide 85', title: 'Utah Fashion Ltd. Conclusion & Action Items', count: '1 Slide' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Automated Presentation Generator</h2>
          <p className="text-sm text-slate-400 mt-1">
            Generate 100% editable Microsoft PowerPoint (.pptx) decks matching the official 85-slide baseline.
          </p>
        </div>

        {/* Filters */}
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
            <Layers className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="full" className="bg-slate-900 text-white">
                Full 85-Slide Company Deck
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.code} className="bg-slate-900 text-white">
                  {d.name} Only
                </option>
              ))}
            </select>
          </div>

          {/* PPTX Background Style Selector */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-indigo-700/80 rounded-lg px-3 py-1.5 shadow-sm">
            <Palette className="w-4 h-4 text-amber-400" />
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
              title="Change PowerPoint Presentation Background"
            >
              <option value="executive-navy" className="bg-slate-900 text-white">
                Theme: Executive Navy (Dark)
              </option>
              <option value="corporate-white" className="bg-slate-900 text-white">
                Theme: Corporate White (Light / Printable)
              </option>
              <option value="slate-dark" className="bg-slate-900 text-white">
                Theme: Industrial Slate (Dark)
              </option>
              <option value="royal-gold" className="bg-slate-900 text-white">
                Theme: Royal Blue & Gold
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Export Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-700/40 rounded-2xl p-6 shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Screenshots • True Native PPTX Shapes, Tables & Charts</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {selectedScope === 'full' ? 'Complete 85-Slide Presentation' : `${selectedScope} Department Report`}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Target Reporting Period: <strong className="text-white">{selectedPeriod?.name}</strong>. Generates native
            editable text boxes, tabular cells with conditional color formatting, and chart series that managers can edit
            directly in Microsoft PowerPoint!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={handleExportPPTX}
            disabled={isExporting}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Native PPTX...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export PowerPoint (.pptx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl flex items-center space-x-3 bg-rose-500/10 text-rose-300 border border-rose-500/30">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {exportComplete && (
        <div className="p-4 rounded-xl flex items-center justify-between bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold">Presentation Export Ready!</p>
              <p className="text-xs text-emerald-400/80">
                {savedFileName} has been saved to your <strong>Downloads</strong> folder.
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg font-semibold">
            Saved
          </span>
        </div>
      )}

      {/* Slide Deck Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <h4 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>Deck Sequence & Slide Mapping (85 Slides)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {slideDeckStructure.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-start space-x-3"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400">{item.range}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{item.count}</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 mt-0.5 leading-snug">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
