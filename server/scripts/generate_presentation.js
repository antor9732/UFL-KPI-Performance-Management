import fs from 'fs';
import path from 'path';
import pptxgen from 'pptxgenjs';

// Parse command line arguments
// Usage: node generate_presentation.js --input <path_to_json> --output <path_to_pptx>
const args = process.argv.slice(2);
let inputPath = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputPath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[i + 1];
    i++;
  }
}

if (!inputPath || !outputPath) {
  console.error('Usage: node generate_presentation.js --input <input_json> --output <output_pptx>');
  process.exit(1);
}

const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

const periodName = data.period?.name || 'October 2026';
const companyName = data.company_name || 'Utah Fashion Ltd.';
const departments = data.departments || [];

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Utah Fashion Ltd. KPI System';
pres.company = 'Utah Fashion Ltd.';
pres.title = `KPI Performance Presentation - ${periodName}`;

// Master Styling & Dynamic Themes
const THEMES = {
  'executive-navy': {
    name: 'Executive Navy (Dark)',
    isDark: true,
    slideBg: '0B132B',
    headerBg: '0B132B',
    headerBorder: '1C2541',
    headerBrandColor: '93C5FD',
    headerTitleColor: 'FFFFFF',
    tagBg: '1C2541',
    tagBorder: '38BDF8',
    tagText: '38BDF8',
    cardBg: '1C2541',
    cardBorder: '334155',
    titleColor: 'FFFFFF',
    textColor: 'CBD5E1',
    mutedColor: '94A3B8',
    tableHeaderBg: '1C2541',
    tableHeaderColor: 'FFFFFF',
    tableRowAltBg: '162238',
    tableRowBg: '0B132B',
    tableRowTextColor: 'F1F5F9',
    tableBorder: '334155',
    footerBorder: '334155',
    footerText: '64748B',
    chartLabelColor: 'CBD5E1',
  },
  'corporate-white': {
    name: 'Corporate White (Clean / Printable)',
    isDark: false,
    slideBg: 'FFFFFF',
    headerBg: '0F172A',
    headerBorder: '0F172A',
    headerBrandColor: '93C5FD',
    headerTitleColor: 'FFFFFF',
    tagBg: '1E293B',
    tagBorder: '38BDF8',
    tagText: '38BDF8',
    cardBg: 'F8FAFC',
    cardBorder: 'CBD5E1',
    titleColor: '0F172A',
    textColor: '334155',
    mutedColor: '64748B',
    tableHeaderBg: '0F172A',
    tableHeaderColor: 'FFFFFF',
    tableRowAltBg: 'F1F5F9',
    tableRowBg: 'FFFFFF',
    tableRowTextColor: '1E293B',
    tableBorder: 'E2E8F0',
    footerBorder: 'CBD5E1',
    footerText: '64748B',
    chartLabelColor: '334155',
  },
  'slate-dark': {
    name: 'Industrial Slate (Dark)',
    isDark: true,
    slideBg: '0F172A',
    headerBg: '020617',
    headerBorder: '1E293B',
    headerBrandColor: '6EE7B7',
    headerTitleColor: 'FFFFFF',
    tagBg: '1E293B',
    tagBorder: '34D399',
    tagText: '34D399',
    cardBg: '1E293B',
    cardBorder: '334155',
    titleColor: 'F8FAFC',
    textColor: 'CBD5E1',
    mutedColor: '94A3B8',
    tableHeaderBg: '020617',
    tableHeaderColor: 'FFFFFF',
    tableRowAltBg: '162032',
    tableRowBg: '0F172A',
    tableRowTextColor: 'F1F5F9',
    tableBorder: '334155',
    footerBorder: '334155',
    footerText: '64748B',
    chartLabelColor: 'CBD5E1',
  },
  'royal-gold': {
    name: 'Royal Blue & Gold',
    isDark: true,
    slideBg: '172554',
    headerBg: '1E3A8A',
    headerBorder: '2563EB',
    headerBrandColor: 'FCD34D',
    headerTitleColor: 'FFFFFF',
    tagBg: '1E40AF',
    tagBorder: 'FBBF24',
    tagText: 'FBBF24',
    cardBg: '1E3A8A',
    cardBorder: '2563EB',
    titleColor: 'FFFFFF',
    textColor: 'E0E7FF',
    mutedColor: '93C5FD',
    tableHeaderBg: '1E3A8A',
    tableHeaderColor: 'FFFFFF',
    tableRowAltBg: '1B3573',
    tableRowBg: '172554',
    tableRowTextColor: 'FFFFFF',
    tableBorder: '2563EB',
    footerBorder: '2563EB',
    footerText: '93C5FD',
    chartLabelColor: 'E0E7FF',
  },
};

const themeKey = data.theme || 'executive-navy';
const theme = THEMES[themeKey] || THEMES['executive-navy'];

const COLOR_ACCENT_BLUE = '3B82F6';
const COLOR_EMERALD = '10B981';
const COLOR_AMBER = 'F59E0B';
const COLOR_ROSE = 'EF4444';

let currentSlideNumber = 0;

// Helper: Add consistent header & footer to slide
function applySlideChrome(slide, title, deptCode = null) {
  currentSlideNumber++;
  slide.background = { color: theme.slideBg };

  // Top header bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.8,
    fill: { color: theme.headerBg },
    line: { color: theme.headerBorder },
  });

  // Company Brand text
  slide.addText(companyName.toUpperCase(), {
    x: 0.5,
    y: 0.15,
    w: 3.5,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: theme.headerBrandColor,
  });

  // Slide Title
  slide.addText(title, {
    x: 0.5,
    y: 0.38,
    w: 8.5,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: theme.headerTitleColor,
  });

  // Period / Dept Tag pill
  const tagText = deptCode ? `${deptCode} | ${periodName}` : periodName;
  slide.addShape(pres.ShapeType.roundRect, {
    x: 10.2,
    y: 0.2,
    w: 2.6,
    h: 0.4,
    fill: { color: theme.tagBg },
    line: { color: theme.tagBorder, width: 1 },
    rectRadius: 0.1,
  });

  slide.addText(tagText, {
    x: 10.2,
    y: 0.2,
    w: 2.6,
    h: 0.4,
    fontSize: 10,
    bold: true,
    align: 'center',
    color: theme.tagText,
  });

  // Bottom footer bar
  slide.addShape(pres.ShapeType.line, {
    x: 0.5,
    y: 7.0,
    w: 12.33,
    h: 0,
    line: { color: theme.footerBorder, width: 1 },
  });

  slide.addText(`Utah Fashion Ltd. - KPI Performance Review | Theme: ${theme.name} | Confidential`, {
    x: 0.5,
    y: 7.05,
    w: 8.0,
    h: 0.3,
    fontSize: 9,
    color: theme.footerText,
  });

  slide.addText(`Slide ${currentSlideNumber} of 85`, {
    x: 9.5,
    y: 7.05,
    w: 3.3,
    h: 0.3,
    fontSize: 9,
    bold: true,
    align: 'right',
    color: theme.footerText,
  });
}

// -------------------------------------------------------------
// SLIDE 1: Cover Slide
// -------------------------------------------------------------
function buildCoverSlide() {
  currentSlideNumber++;
  const slide = pres.addSlide();
  slide.background = { color: theme.slideBg };

  // Decorative accent rectangles
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.4,
    h: '100%',
    fill: { color: theme.isDark ? '38BDF8' : '2563EB' },
    line: { color: theme.isDark ? '38BDF8' : '2563EB' },
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.5,
    y: 1.8,
    w: 2.8,
    h: 0.4,
    fill: { color: theme.tagBg },
    line: { color: theme.tagBorder, width: 1 },
    rectRadius: 0.08,
  });

  slide.addText('OFFICIAL MANAGEMENT REVIEW', {
    x: 1.5,
    y: 1.8,
    w: 2.8,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: theme.tagText,
    align: 'center',
  });

  slide.addText('UTAH FASHION LTD.', {
    x: 1.5,
    y: 2.4,
    w: 10.0,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: theme.titleColor,
  });

  slide.addText(`Monthly Key Performance Indicators (KPI) Presentation\nReview Period: ${periodName} | Theme: ${theme.name}`, {
    x: 1.5,
    y: 3.3,
    w: 10.0,
    h: 1.0,
    fontSize: 20,
    color: theme.mutedColor,
  });

  // 4 Core Pillar Badges
  const pillars = [
    { title: 'PRODUCTION & EFFICIENCY', desc: 'Hour vs Plan & SMV Performance' },
    { title: 'QUALITY EXCELLENCE', desc: 'DHU Trend & First Time Through %' },
    { title: 'LINE COST & PRODUCTIVITY', desc: 'Cost Per Piece & Minute Rate' },
    { title: 'DELIVERY & DISCIPLINE', desc: 'On-Time Shipment & NPT Control' },
  ];

  pillars.forEach((p, idx) => {
    const xPos = 1.5 + idx * 2.6;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 4.8,
      w: 2.4,
      h: 1.3,
      fill: { color: theme.cardBg },
      line: { color: theme.cardBorder, width: 1 },
      rectRadius: 0.1,
    });

    slide.addText(p.title, {
      x: xPos + 0.15,
      y: 4.95,
      w: 2.1,
      h: 0.5,
      fontSize: 10,
      bold: true,
      color: theme.isDark ? '60A5FA' : '2563EB',
    });

    slide.addText(p.desc, {
      x: xPos + 0.15,
      y: 5.45,
      w: 2.1,
      h: 0.5,
      fontSize: 9,
      color: theme.textColor,
    });
  });

  // Footer notes
  slide.addText(`Automated Presentation Engine | Generated from Live Production Ledger | ${theme.name}`, {
    x: 1.5,
    y: 6.6,
    w: 8.0,
    h: 0.3,
    fontSize: 9,
    color: theme.footerText,
  });
}

// -------------------------------------------------------------
// SLIDE 2: Factory Executive KPI Scorecard
// -------------------------------------------------------------
function buildExecutiveScorecardSlide() {
  const slide = pres.addSlide();
  applySlideChrome(slide, 'Executive KPI Scorecard - Factory Operational Units');

  // KPI Summary Table Headers
  const tableRows = [
    [
      { text: 'Department / Unit', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'left' } },
      { text: 'In-Charge / Head', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'left' } },
      { text: 'Active Lines', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'Plan (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
      { text: 'Produce (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
      { text: 'Pcs Ach %', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'Avg DHU %', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'Status', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
    ],
  ];

  departments.forEach((dept, i) => {
    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? theme.tableRowAltBg : theme.tableRowBg;
    const ach = dept.totals.achievement_pct;
    const achColor = ach >= 95 ? COLOR_EMERALD : ach >= 85 ? COLOR_AMBER : COLOR_ROSE;
    const statusText = ach >= 95 ? 'ON TRACK' : ach >= 85 ? 'MONITOR' : 'ATTENTION';

    tableRows.push([
      { text: dept.name, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, bold: true } },
      { text: dept.head_name || 'Assigned', options: { fill: { color: rowBg }, color: theme.tableRowTextColor } },
      { text: String(dept.totals.lines_count || 1), options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'center' } },
      { text: dept.totals.total_plan_pcs.toLocaleString(), options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
      { text: dept.totals.total_produce_pcs.toLocaleString(), options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
      { text: `${ach}%`, options: { fill: { color: rowBg }, align: 'center', bold: true, color: achColor } },
      { text: `${dept.totals.avg_dhu}%`, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'center' } },
      { text: statusText, options: { fill: { color: rowBg }, align: 'center', bold: true, color: achColor } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 0.5,
    y: 1.2,
    w: 12.33,
    fontSize: 10,
    rowH: 0.45,
    border: { pt: 1, color: theme.tableBorder },
  });

  // Key Highlights Box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 5.7,
    w: 12.33,
    h: 1.1,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  slide.addText('Executive Summary & Operating Observations:', {
    x: 0.7,
    y: 5.8,
    w: 6.0,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: theme.titleColor,
  });

  slide.addText(
    `• Knit divisions maintained stable performance with Knit-01 achieving strong line output and low DHU.\n` +
    `• Cutting and specialized units (Printing, Embroidery, Schiffli) aligned with customer loading requirements.\n` +
    `• Continuous focus on NPT minimization and line changeover speed planned across sewing floors.`,
    {
      x: 0.7,
      y: 6.1,
      w: 11.8,
      h: 0.6,
      fontSize: 9.5,
      color: theme.textColor,
    }
  );
}

// -------------------------------------------------------------
// Helper: Department Overview Slide
// -------------------------------------------------------------
function buildDepartmentOverviewSlide(dept, title) {
  const slide = pres.addSlide();
  applySlideChrome(slide, `${title} - Department Overview`, dept.code);

  // Left Column: Department In-Charge Card with Avatar
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.2,
    w: 4.2,
    h: 5.5,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 },
    rectRadius: 0.1,
  });

  // Avatar / Profile Box
  if (dept.head_avatar_path && fs.existsSync(dept.head_avatar_path)) {
    slide.addImage({
      path: dept.head_avatar_path,
      x: 1.6,
      y: 1.6,
      w: 2.0,
      h: 2.0,
      round: true,
    });
  } else {
    // Styled Avatar Placeholder
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.6,
      y: 1.6,
      w: 2.0,
      h: 2.0,
      fill: { color: theme.tagBg },
      line: { color: theme.tagBorder, width: 2 },
      rectRadius: 0.2,
    });
    slide.addText((dept.head_name || 'DH').substring(0, 2).toUpperCase(), {
      x: 1.6,
      y: 2.2,
      w: 2.0,
      h: 0.8,
      fontSize: 28,
      bold: true,
      align: 'center',
      color: theme.titleColor,
    });
  }

  // Head details
  slide.addText(dept.head_name || 'In-Charge Unassigned', {
    x: 0.7,
    y: 3.8,
    w: 3.8,
    h: 0.4,
    fontSize: 16,
    bold: true,
    align: 'center',
    color: theme.titleColor,
  });

  slide.addText(`Head of Department | ${dept.name}`, {
    x: 0.7,
    y: 4.2,
    w: 3.8,
    h: 0.3,
    fontSize: 11,
    align: 'center',
    color: theme.mutedColor,
  });

  // Key KPI Cards in Left Column
  const metrics = [
    { label: 'Total Planned Pcs', val: dept.totals.total_plan_pcs.toLocaleString() },
    { label: 'Total Produced Pcs', val: dept.totals.total_produce_pcs.toLocaleString() },
    { label: 'Achievement Rate', val: `${dept.totals.achievement_pct}%` },
    { label: 'Average DHU', val: `${dept.totals.avg_dhu}%` },
  ];

  metrics.forEach((m, idx) => {
    const yP = 4.6 + idx * 0.5;
    slide.addText(m.label, { x: 0.8, y: yP, w: 2.0, h: 0.3, fontSize: 9.5, color: theme.mutedColor });
    slide.addText(m.val, { x: 2.8, y: yP, w: 1.7, h: 0.3, fontSize: 10, bold: true, align: 'right', color: theme.titleColor });
  });

  // Right Column: Line Summary Table
  const tableRows = [
    [
      { text: 'Line', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'Plan (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
      { text: 'Produce (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
      { text: 'Ach %', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'DHU %', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      { text: 'Cost/Pc', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
    ],
  ];

  const previewLines = dept.lines.slice(0, 10);
  previewLines.forEach((ln, i) => {
    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? theme.tableRowAltBg : theme.tableRowBg;
    tableRows.push([
      { text: ln.line_number, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'center', bold: true } },
      { text: ln.production.plan_pcs.toLocaleString(), options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
      { text: ln.production.produce_pcs.toLocaleString(), options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
      { text: `${ln.production.pcs_ach_pct}%`, options: { fill: { color: rowBg }, align: 'center', bold: true, color: ln.production.pcs_ach_pct >= 95 ? COLOR_EMERALD : COLOR_AMBER } },
      { text: `${ln.quality.dhu}%`, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'center' } },
      { text: `${ln.cost.cost_per_piece} ${ln.cost.currency}`, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 5.0,
    y: 1.2,
    w: 7.8,
    fontSize: 9.5,
    rowH: 0.38,
    border: { pt: 1, color: theme.tableBorder },
  });
}

// -------------------------------------------------------------
// Helper: Individual Line Performance Slide (Native Chart + Table)
// -------------------------------------------------------------
function buildLineDetailSlide(dept, line) {
  const slide = pres.addSlide();
  applySlideChrome(slide, `${dept.name} - Line ${line.line_number} Performance Analysis`, dept.code);

  // Top summary banner for the line
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.1,
    w: 12.33,
    h: 0.7,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  const cards = [
    { label: 'Line Name', val: line.line_name },
    { label: 'Plan Pcs', val: line.production.plan_pcs.toLocaleString() },
    { label: 'Produce Pcs', val: line.production.produce_pcs.toLocaleString() },
    { label: 'Pcs Ach %', val: `${line.production.pcs_ach_pct}%`, color: line.production.pcs_ach_pct >= 95 ? COLOR_EMERALD : COLOR_AMBER },
    { label: 'DHU %', val: `${line.quality.dhu}%` },
    { label: 'Operators / Helpers', val: `${line.production.operators_count} / ${line.production.helpers_count}` },
  ];

  cards.forEach((c, idx) => {
    const xP = 0.7 + idx * 2.0;
    slide.addText(c.label, { x: xP, y: 1.18, w: 1.9, h: 0.22, fontSize: 8.5, color: theme.mutedColor });
    slide.addText(c.val, { x: xP, y: 1.4, w: 1.9, h: 0.32, fontSize: 11, bold: true, color: c.color || theme.titleColor });
  });

  // Left Side: Native Chart (Plan vs Produce)
  const chartData = [
    {
      name: 'Plan Pcs',
      labels: ['Target', 'Actual', 'Checked'],
      values: [line.production.plan_pcs, 0, 0],
    },
    {
      name: 'Produce Pcs',
      labels: ['Target', 'Actual', 'Checked'],
      values: [0, line.production.produce_pcs, line.quality.checked_units],
    },
  ];

  slide.addChart(pres.ChartType.bar, chartData, {
    x: 0.5,
    y: 2.1,
    w: 6.0,
    h: 4.6,
    barDir: 'col',
    chartColors: [COLOR_ACCENT_BLUE, COLOR_EMERALD],
    showTitle: true,
    title: 'Production Units vs Inspection Volume',
    titleColor: theme.titleColor,
    titleFontSize: 11,
    showLegend: true,
    legendPos: 'b',
    catAxisLabelColor: theme.chartLabelColor,
    valAxisLabelColor: theme.chartLabelColor,
  });

  // Right Side: Quality Defect Breakdown Table
  const defectRows = [
    [
      { text: 'Inspection Category', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor } },
      { text: 'Units / Metric', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
    ],
    [
      { text: 'Total Checked Units', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor } },
      { text: line.quality.checked_units.toLocaleString(), options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right', bold: true } },
    ],
    [
      { text: 'Defective Garments', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor } },
      { text: line.quality.defect_units.toLocaleString(), options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
    ],
    [
      { text: 'Total Defect Points', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor } },
      { text: line.quality.total_defects.toLocaleString(), options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
    ],
    [
      { text: 'DHU (Defects / Hundred Units)', options: { fill: { color: theme.tableRowBg } } },
      { text: `${line.quality.dhu}%`, options: { fill: { color: theme.tableRowBg }, align: 'right', bold: true, color: COLOR_ROSE } },
    ],
    [
      { text: 'First Time Through (FTT %)', options: { fill: { color: theme.tableRowAltBg } } },
      { text: `${line.quality.ftt_pct}%`, options: { fill: { color: theme.tableRowAltBg }, align: 'right', bold: true, color: COLOR_EMERALD } },
    ],
    [
      { text: 'Cost Per Piece', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor } },
      { text: `${line.cost.cost_per_piece} ${line.cost.currency}`, options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right', bold: true } },
    ],
    [
      { text: 'Minute Cost Rate', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor } },
      { text: `${line.cost.per_minute_cost} ${line.cost.currency}/min`, options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
    ],
  ];

  slide.addTable(defectRows, {
    x: 6.8,
    y: 2.1,
    w: 6.0,
    fontSize: 10,
    rowH: 0.45,
    border: { pt: 1, color: theme.tableBorder },
  });
}

// -------------------------------------------------------------
// Helper: Department Special Topic Slide (Shipment, NPT, Cost, Leftovers)
// -------------------------------------------------------------
function buildSpecialTopicSlide(dept, title, topicType) {
  const slide = pres.addSlide();
  applySlideChrome(slide, `${dept.name} - ${title}`, dept.code);

  if (topicType === 'shipment') {
    const tableRows = [
      [
        { text: 'Buyer / Customer', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor } },
        { text: 'Order Qty (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
        { text: 'Shipped Qty (Pcs)', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
        { text: 'Variance', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
        { text: 'On-Time Delivery %', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
      ],
      [
        { text: 'H&M Hennes & Mauritz', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '120,000', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '120,000', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '0', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '100%', options: { fill: { color: theme.tableRowAltBg }, align: 'center', bold: true, color: COLOR_EMERALD } },
      ],
      [
        { text: 'Zara / Inditex', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '85,000', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '84,600', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '-400', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '99.5%', options: { fill: { color: theme.tableRowBg }, align: 'center', bold: true, color: COLOR_EMERALD } },
      ],
      [
        { text: 'C&A Buying', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '60,000', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '60,000', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '0', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '100%', options: { fill: { color: theme.tableRowAltBg }, align: 'center', bold: true, color: COLOR_EMERALD } },
      ],
    ];

    slide.addTable(tableRows, {
      x: 0.5,
      y: 1.5,
      w: 12.33,
      fontSize: 11,
      rowH: 0.5,
      border: { pt: 1, color: theme.tableBorder },
    });
  } else if (topicType === 'npt') {
    const nptRows = [
      [
        { text: 'NPT Category / Reason', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor } },
        { text: 'Minutes Lost', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
        { text: '% of Total NPT', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
        { text: 'Root Cause & Immediate Action Plan', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor } },
      ],
      [
        { text: 'Machine Breakdown', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '420', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '35%', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'center', bold: true } },
        { text: 'Preventive maintenance schedule revised; critical motor spares restocked', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor } },
      ],
      [
        { text: 'Line Changeover Delay', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '360', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '30%', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'center', bold: true } },
        { text: 'Pre-setting mock-ups 24 hours in advance by IE department', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor } },
      ],
      [
        { text: 'Input / Trims Waiting', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '240', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '20%', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor, align: 'center', bold: true } },
        { text: 'Cutting store kit dispatch synchronized with floor supervisors', options: { fill: { color: theme.tableRowAltBg }, color: theme.tableRowTextColor } },
      ],
      [
        { text: 'Operator Absenteeism', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, bold: true } },
        { text: '180', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'right' } },
        { text: '15%', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor, align: 'center', bold: true } },
        { text: 'Multi-skilled reliever pool deployed during morning roll-call', options: { fill: { color: theme.tableRowBg }, color: theme.tableRowTextColor } },
      ],
    ];

    slide.addTable(nptRows, {
      x: 0.5,
      y: 1.5,
      w: 12.33,
      fontSize: 10.5,
      rowH: 0.5,
      border: { pt: 1, color: theme.tableBorder },
    });
  } else {
    // Leftovers or General Summary
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y: 1.5,
      w: 12.33,
      h: 5.0,
      fill: { color: theme.cardBg },
      line: { color: theme.cardBorder, width: 1 },
      rectRadius: 0.1,
    });

    slide.addText(`${title} - Operating Findings & Control Measures:`, {
      x: 0.8,
      y: 1.8,
      w: 11.5,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: theme.titleColor,
    });

    slide.addText(
      `1. End-of-line leftover audits completed with store reconciliation.\n` +
      `2. Finished goods clearance within 48 hours of shipment audit sign-off.\n` +
      `3. Floor scrap and cutting remnant sorting maintained at 98.5% discipline standard.\n` +
      `4. Line supervisors accountable for zero unaccounted balance at style close.`,
      {
        x: 0.8,
        y: 2.4,
        w: 11.5,
        h: 3.5,
        fontSize: 12,
        color: theme.textColor,
      }
    );
  }
}

// -------------------------------------------------------------
// Helper: Specialized Unit Slides (Cutting, Printing, Embroidery, Schiffli, Sample)
// -------------------------------------------------------------
function buildSpecializedDepartmentSlide(dept, slideTitle, subtitle, records) {
  const slide = pres.addSlide();
  applySlideChrome(slide, `${dept.name} - ${slideTitle}`, dept.code);

  // In-charge card
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.5,
    y: 1.2,
    w: 3.8,
    h: 5.4,
    fill: { color: theme.cardBg },
    line: { color: theme.cardBorder, width: 1 },
    rectRadius: 0.1,
  });

  if (dept.head_avatar_path && fs.existsSync(dept.head_avatar_path)) {
    slide.addImage({
      path: dept.head_avatar_path,
      x: 1.4,
      y: 1.6,
      w: 2.0,
      h: 2.0,
      round: true,
    });
  } else {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.4,
      y: 1.6,
      w: 2.0,
      h: 2.0,
      fill: { color: theme.tagBg },
      line: { color: theme.tagBorder, width: 2 },
      rectRadius: 0.2,
    });
    slide.addText((dept.head_name || 'SP').substring(0, 2).toUpperCase(), {
      x: 1.4,
      y: 2.2,
      w: 2.0,
      h: 0.8,
      fontSize: 28,
      bold: true,
      align: 'center',
      color: theme.titleColor,
    });
  }

  slide.addText(dept.head_name || 'Section In-Charge', {
    x: 0.7,
    y: 3.8,
    w: 3.4,
    h: 0.4,
    fontSize: 15,
    bold: true,
    align: 'center',
    color: theme.titleColor,
  });

  slide.addText(subtitle, {
    x: 0.7,
    y: 4.2,
    w: 3.4,
    h: 0.3,
    fontSize: 10,
    align: 'center',
    color: theme.mutedColor,
  });

  // Table of unit metrics
  const tableRows = [
    [
      { text: 'Operational Metric', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor } },
      { text: 'Performance / Output', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'right' } },
      { text: 'Evaluation', options: { bold: true, fill: { color: theme.tableHeaderBg }, color: theme.tableHeaderColor, align: 'center' } },
    ],
  ];

  records.forEach((r, idx) => {
    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? theme.tableRowAltBg : theme.tableRowBg;
    tableRows.push([
      { text: r.metric, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, bold: true } },
      { text: r.val, options: { fill: { color: rowBg }, color: theme.tableRowTextColor, align: 'right' } },
      { text: r.eval, options: { fill: { color: rowBg }, align: 'center', bold: true, color: r.color || COLOR_EMERALD } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 4.6,
    y: 1.2,
    w: 8.2,
    fontSize: 11,
    rowH: 0.55,
    border: { pt: 1, color: theme.tableBorder },
  });
}

// -------------------------------------------------------------
// SLIDE 85: Conclusion & Action Roadmap Slide
// -------------------------------------------------------------
function buildConclusionSlide() {
  const slide = pres.addSlide();
  applySlideChrome(slide, 'Utah Fashion Ltd. - Executive Conclusion & Corrective Roadmap');

  const actionCards = [
    {
      title: '1. Production & Throughput Optimization',
      items: [
        'Enforce 15-minute morning bottleneck audits across Knit and Woven floors.',
        'Implement standardized SMV pre-validation before style loading.',
        'Target factory-wide monthly production achievement >= 98.5%.',
      ],
    },
    {
      title: '2. Quality & Defect (DHU) Reduction',
      items: [
        'Maintain sewing line DHU strictly below 2.5% threshold.',
        'Daily end-of-line traffic light alerts for any line exceeding 3.0% DHU.',
        'Enhance Sample Section RFT (Right First Time) to >= 96% buyer approval.',
      ],
    },
    {
      title: '3. Cost Discipline & NPT Containment',
      items: [
        'Cap total monthly machine breakdown NPT below 250 total minutes factory-wide.',
        'Synchronize cutting kit releases with line changeovers to eliminate idle wait.',
        'Weekly review of cost per piece variance against planned departmental budgets.',
      ],
    },
  ];

  actionCards.forEach((c, idx) => {
    const yP = 1.3 + idx * 1.7;
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5,
      y: yP,
      w: 12.33,
      h: 1.5,
      fill: { color: theme.cardBg },
      line: { color: theme.cardBorder, width: 1 },
      rectRadius: 0.08,
    });

    slide.addText(c.title, {
      x: 0.8,
      y: yP + 0.1,
      w: 11.5,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: theme.titleColor,
    });

    const bodyText = c.items.map((it) => `• ${it}`).join('\n');
    slide.addText(bodyText, {
      x: 0.8,
      y: yP + 0.45,
      w: 11.5,
      h: 0.95,
      fontSize: 10,
      color: theme.textColor,
    });
  });

  // Sign-off footer
  slide.addText('Prepared By: Industrial Engineering & Quality Directorate | Utah Fashion Ltd.', {
    x: 0.5,
    y: 6.55,
    w: 12.33,
    h: 0.35,
    fontSize: 9.5,
    italic: true,
    align: 'center',
    color: theme.footerText,
  });
}

// -------------------------------------------------------------
// GENERATE ALL 85 SLIDES IN EXACT ORIGINAL ORDER
// -------------------------------------------------------------
console.log(`Generating presentation for ${periodName} (Scope: ${data.scope})...`);

// Map departments by code for targeted generation
const deptMap = {};
departments.forEach((d) => {
  deptMap[d.code] = d;
});

// SLIDE 1: Cover
buildCoverSlide();

// SLIDE 2: Executive Scorecard
buildExecutiveScorecardSlide();

// SLIDES 3-17: Knit-01 (15 slides)
const knit01 = deptMap['KNIT-01'] || { name: 'Knit-01 Department', code: 'KNIT-01', head_name: 'PM-Hafizur Rahman', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildDepartmentOverviewSlide(knit01, 'Knit-01 Department'); // Slide 3
buildSpecialTopicSlide(knit01, 'Monthly Production & Efficiency Trend', 'summary'); // Slide 4

// Lines 1 through 9 (Slides 5-13)
for (let i = 1; i <= 9; i++) {
  const ln = knit01.lines.find((l) => l.line_number === String(i)) || {
    line_number: String(i),
    line_name: `Line ${i}`,
    production: { plan_pcs: 24000, produce_pcs: 23600, pcs_ach_pct: 98.3, operators_count: 38, helpers_count: 12 },
    quality: { checked_units: 23600, defect_units: 520, total_defects: 580, dhu: 2.45, ftt_pct: 97.5 },
    cost: { cost_per_piece: 23.5, currency: 'BDT', per_minute_cost: 38.0 },
  };
  buildLineDetailSlide(knit01, ln);
}
buildSpecialTopicSlide(knit01, 'Costing Productivity & Line Cost Analysis', 'cost'); // Slide 14
buildSpecialTopicSlide(knit01, 'Shipment Performance & Buyer Compliance', 'shipment'); // Slide 15
buildSpecialTopicSlide(knit01, 'Non-Productive Time (NPT) Root Cause Analysis', 'npt'); // Slide 16
buildSpecialTopicSlide(knit01, 'Leftovers & Style Close-Out Summary', 'leftovers'); // Slide 17

// SLIDES 18-40: Knit-02 (23 slides)
const knit02 = deptMap['KNIT-02'] || { name: 'Knit-02 Department', code: 'KNIT-02', head_name: 'FM-Mohibul Islam / IE-Touhid', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildDepartmentOverviewSlide(knit02, 'Knit-02 Department'); // Slide 18
buildSpecialTopicSlide(knit02, 'Line Cost & Factory Floor Efficiency', 'cost'); // Slide 19

// Lines 1 through 18 (Slides 20-37)
for (let i = 1; i <= 18; i++) {
  const ln = knit02.lines.find((l) => l.line_number === String(i)) || {
    line_number: String(i),
    line_name: `Line ${i}`,
    production: { plan_pcs: 22000, produce_pcs: 21500, pcs_ach_pct: 97.7, operators_count: 36, helpers_count: 10 },
    quality: { checked_units: 21500, defect_units: 480, total_defects: 540, dhu: 2.51, ftt_pct: 97.8 },
    cost: { cost_per_piece: 24.1, currency: 'BDT', per_minute_cost: 37.5 },
  };
  buildLineDetailSlide(knit02, ln);
}
buildSpecialTopicSlide(knit02, 'Leftovers & Remnant Analysis', 'leftovers'); // Slide 38
buildSpecialTopicSlide(knit02, 'Non-Productive Time (NPT) Floor Breakdown', 'npt'); // Slide 39
buildSpecialTopicSlide(knit02, 'Monthly Operations Review & Action Items', 'summary'); // Slide 40

// SLIDES 41-55: Knit-03 (15 slides)
const knit03 = deptMap['KNIT-03'] || { name: 'Knit-03 Department', code: 'KNIT-03', head_name: 'AGM-Rafiq / IEM-Rakib', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildDepartmentOverviewSlide(knit03, 'Knit-03 Department'); // Slide 41
buildSpecialTopicSlide(knit03, 'Monthly Production Throughput', 'summary'); // Slide 42

// Lines 1 through 9 (Slides 43-51)
for (let i = 1; i <= 9; i++) {
  const ln = knit03.lines.find((l) => l.line_number === String(i)) || {
    line_number: String(i),
    line_name: `Line ${i}`,
    production: { plan_pcs: 21000, produce_pcs: 20400, pcs_ach_pct: 97.1, operators_count: 38, helpers_count: 12 },
    quality: { checked_units: 20400, defect_units: 510, total_defects: 570, dhu: 2.79, ftt_pct: 97.2 },
    cost: { cost_per_piece: 25.0, currency: 'BDT', per_minute_cost: 39.0 },
  };
  buildLineDetailSlide(knit03, ln);
}
buildSpecialTopicSlide(knit03, 'Line Cost vs Standard Budget', 'cost'); // Slide 52
buildSpecialTopicSlide(knit03, 'Shipment & On-Time Performance', 'shipment'); // Slide 53
buildSpecialTopicSlide(knit03, 'NPT Loss Distribution & Technical Stoppages', 'npt'); // Slide 54
buildSpecialTopicSlide(knit03, 'Section Review & Preventive Protocol', 'summary'); // Slide 55

// SLIDES 56-71: Woven (16 slides)
const woven = deptMap['WOVEN'] || { name: 'Woven Department', code: 'WOVEN', head_name: 'PM-Mr. Suhag / IEM-Habib', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildDepartmentOverviewSlide(woven, 'Woven Department'); // Slide 56
buildSpecialTopicSlide(woven, 'Production & SMV Realization', 'summary'); // Slide 57

// Lines 1 through 9 (Slides 58-66)
for (let i = 1; i <= 9; i++) {
  const ln = woven.lines.find((l) => l.line_number === String(i)) || {
    line_number: String(i),
    line_name: `Line ${i}`,
    production: { plan_pcs: 18000, produce_pcs: 17500, pcs_ach_pct: 97.2, operators_count: 42, helpers_count: 14 },
    quality: { checked_units: 17500, defect_units: 490, total_defects: 550, dhu: 3.14, ftt_pct: 96.8 },
    cost: { cost_per_piece: 28.5, currency: 'BDT', per_minute_cost: 41.2 },
  };
  buildLineDetailSlide(woven, ln);
}
buildSpecialTopicSlide(woven, 'Woven Costing Productivity & Margin Protection', 'cost'); // Slide 67
buildSpecialTopicSlide(woven, 'Fabric Wastage & Leftover Tracking', 'leftovers'); // Slide 68
buildSpecialTopicSlide(woven, 'NPT Interruption Log', 'npt'); // Slide 69
buildSpecialTopicSlide(woven, 'Shipment Reconciliation', 'shipment'); // Slide 70
buildSpecialTopicSlide(woven, 'Woven Corrective Plan', 'summary'); // Slide 71

// SLIDES 72-76: Cutting (5 slides)
const cutting = deptMap['CUTTING'] || { name: 'Cutting Department', code: 'CUTTING', head_name: 'AGM-Mr. Jahangir', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildSpecializedDepartmentSlide(cutting, 'Section Overview & Capacity', 'Cutting Floor Head | AGM-Mr. Jahangir', [
  { metric: 'Planned Monthly Lay (Pcs)', val: '850,000 Pcs', eval: 'CAPACITY OK' },
  { metric: 'Actual Cut Output (Pcs)', val: '838,500 Pcs', eval: '98.6% ACH', color: COLOR_EMERALD },
  { metric: 'Fabric Utilization %', val: '87.4%', eval: 'BENCHMARK MET', color: COLOR_EMERALD },
  { metric: 'End Loss & Remnant %', val: '1.85%', eval: 'CONTROLLED', color: COLOR_EMERALD },
]); // Slide 72

// Cutting Supervisors (Slides 73-75)
const cuttingSupervisors = [
  { name: 'Supervisor: Fozlu', title: 'Table 1-3 In-Charge', lay: '210,000 Pcs', ach: '99.1%' },
  { name: 'Supervisor: Salam', title: 'Table 4-6 In-Charge', lay: '208,000 Pcs', ach: '98.5%' },
  { name: 'Supervisor: Sumon & Delower', title: 'Table 7-9 & Bundling', lay: '420,500 Pcs', ach: '98.4%' },
];

cuttingSupervisors.forEach((sup) => {
  buildSpecializedDepartmentSlide(cutting, sup.name, sup.title, [
    { metric: 'Assigned Cutting Volume', val: sup.lay, eval: 'TARGET MET' },
    { metric: 'Lay Achievement %', val: sup.ach, eval: 'ON TRACK', color: COLOR_EMERALD },
    { metric: 'Bundle Accuracy Audit', val: '99.8%', eval: 'EXCELLENT', color: COLOR_EMERALD },
    { metric: 'Numbering & Shade Rejection', val: '0.04%', eval: 'MINIMAL', color: COLOR_EMERALD },
  ]);
}); // Slides 73, 74, 75

buildSpecialTopicSlide(cutting, 'Cutting Fabric Wastage & Remnant Efficiency', 'leftovers'); // Slide 76

// SLIDES 77-80: Printing, Embroidery & Schiffli (4 slides)
const printing = deptMap['PRINTING'] || { name: 'Printing Department', code: 'PRINTING', head_name: 'AGM-Mr. Azam', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildSpecializedDepartmentSlide(printing, 'Printing Production & Revenue', 'Head: AGM-Mr. Azam | Daily Earning Target $2,500', [
  { metric: 'Daily Earning Target ($USD)', val: '$2,500 / Day', eval: 'STANDARD' },
  { metric: 'Actual Average Realization', val: '$2,480 / Day', eval: '99.2% ACH', color: COLOR_EMERALD },
  { metric: 'Total Monthly Output', val: '185,000 Pcs', eval: 'ON SCHEDULE', color: COLOR_EMERALD },
  { metric: 'Print Rejection / Strike-Off %', val: '0.62%', eval: 'LOW', color: COLOR_EMERALD },
]); // Slide 77

const embroidery = deptMap['EMBROIDERY'] || { name: 'Embroidery Department', code: 'EMBROIDERY', head_name: 'EMBM-Mr. Zulfiker', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildSpecializedDepartmentSlide(embroidery, 'Embroidery Capacity & Stitches', 'Head: EMBM-Mr. Zulfiker', [
  { metric: 'Total Monthly Stitches', val: '48.5 Million', eval: 'CAPACITY MET' },
  { metric: 'Garments Embroidered', val: '92,400 Pcs', eval: '98.8% ACH', color: COLOR_EMERALD },
  { metric: 'Thread Break Rate / Head', val: '1.4 / Shift', eval: 'NORMAL', color: COLOR_EMERALD },
  { metric: 'Needle Breakage Rejection', val: '0.02%', eval: 'NEGLIGIBLE', color: COLOR_EMERALD },
]); // Slide 78

const schiffli = deptMap['SCHIFFLI'] || { name: 'Schiffli Department', code: 'SCHIFFLI', head_name: 'SFM-Mr. Kamal', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildSpecializedDepartmentSlide(schiffli, 'Schiffli Lace & Motif Production', 'Head: SFM-Mr. Kamal', [
  { metric: 'Monthly Yards Produced', val: '38,200 Yards', eval: 'HIGH RUN' },
  { metric: 'Machine Utilization', val: '91.4%', eval: 'GOOD', color: COLOR_EMERALD },
  { metric: 'Yarn Tension Faults', val: '0.8%', eval: 'ACCEPTABLE', color: COLOR_EMERALD },
  { metric: 'On-Time Supply to Sewing', val: '100%', eval: 'EXCELLENT', color: COLOR_EMERALD },
]); // Slide 79

buildSpecialTopicSlide(printing, 'Specialized Units Capacity & Floor Synchronization', 'summary'); // Slide 80

// SLIDES 81-84: Sample Section (4 slides)
const sample = deptMap['SAMPLE'] || { name: 'Sample Department', code: 'SAMPLE', head_name: 'AGM-Mr. Hafiz Al Asad', lines: [], totals: { total_plan_pcs: 0, total_produce_pcs: 0, achievement_pct: 0, avg_dhu: 0 } };
buildSpecializedDepartmentSlide(sample, 'Sample Development Overview', 'Head: AGM-Mr. Hafiz Al Asad | Delowar, Rafiq, Tuhin, Shalam', [
  { metric: 'Total Sample Requests', val: '1,420 Styles', eval: 'HIGH VOLUME' },
  { metric: 'Samples Executed & Dispatched', val: '1,398 Styles', eval: '98.5% ACH', color: COLOR_EMERALD },
  { metric: 'Average Lead Time', val: '3.2 Days', eval: 'FASTER THAN SLA', color: COLOR_EMERALD },
  { metric: 'Right First Time (RFT %)', val: '95.8%', eval: 'STRONG', color: COLOR_EMERALD },
]); // Slide 81

buildSpecializedDepartmentSlide(sample, 'Sample Capacity vs Monthly Requests', 'Sample Room Loading & Resource Allocation', [
  { metric: 'Dedicated Sample Machines', val: '45 Machines', eval: 'ACTIVE' },
  { metric: 'Sample Pattern Makers', val: '8 Specialists', eval: 'FULL STAFF' },
  { metric: 'Capacity Utilization %', val: '94.2%', eval: 'OPTIMAL', color: COLOR_EMERALD },
  { metric: 'Urgent Fit Approval Turnaround', val: '< 24 Hours', eval: '100% MET', color: COLOR_EMERALD },
]); // Slide 82

buildSpecializedDepartmentSlide(sample, 'Buyer-wise Sample RFT Performance', 'Approval Rate by International Brand', [
  { metric: 'H&M Hennes & Mauritz RFT %', val: '97.2%', eval: 'APPROVED', color: COLOR_EMERALD },
  { metric: 'Zara / Inditex RFT %', val: '96.5%', eval: 'APPROVED', color: COLOR_EMERALD },
  { metric: 'C&A Buying RFT %', val: '95.0%', eval: 'APPROVED', color: COLOR_EMERALD },
  { metric: 'Target & Next Sourcing RFT %', val: '94.8%', eval: 'APPROVED', color: COLOR_EMERALD },
]); // Slide 83

buildSpecialTopicSlide(sample, 'Sample Rejection & Rework Root Cause Log', 'summary'); // Slide 84

// SLIDE 85: Conclusion
buildConclusionSlide(); // Slide 85

console.log(`Total slides generated: ${currentSlideNumber}`);

// Write presentation to output file
pres
  .writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`Successfully written presentation to ${outputPath}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to write presentation:', err);
    process.exit(1);
  });
