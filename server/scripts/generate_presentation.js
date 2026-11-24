// Monthly KPI presentation generator (native, editable PowerPoint).
// Usage: node generate_presentation.js --input <payload.json> --output <deck.pptx>
//
// Layout follows the factory's classic monthly KPI deck (4:3):
//   cover -> KPI goals -> per department: line-wise cost achievement, one slide per line
//   (6 staff photo cards, YTD table, finishing DHU / profit-loss / sewing DHU charts), NPT
//   -> units (cutting, print, ...) overall + supervisor-wise -> thank you.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import pptxgen from 'pptxgenjs';

// ---------------------------------------------------------------- args & data
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const inputPath = arg('--input');
const outputPath = arg('--output');
if (!inputPath || !outputPath) {
  console.error('Usage: node generate_presentation.js --input <input_json> --output <output_pptx>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const SCRIPT_DIR = path.dirname(path.resolve(process.argv[1]));
const ASSETS = path.join(SCRIPT_DIR, 'assets');
const asset = (f) => {
  const p = path.join(ASSETS, f);
  return fs.existsSync(p) ? p : null;
};

const period = data.period || {};
const YEAR = period.year;
const PREV = period.prev_year ?? (YEAR - 1);
const CUR = data.currency || '$';
const COMPANY = data.company_name || '';

// ---------------------------------------------------------------- style
const C = {
  red: 'C00000', brightRed: 'FF0000', green: '00B050', darkGreen: '00843D', navy: '1F2A5C', blue: '2E3192',
  cyan: '00B0F0', gray: 'D9D9D9', grayDark: '7F7F7F', white: 'FFFFFF', black: '000000', text: '1A1A1A',
  rowAvg: 'FCD5B4', rowTarget: 'C5D9F1', header: 'DCE6F1', headerDark: '1F3864', cellRed: 'FF5050', cellGreen: '33CC66',
  yellow: 'FFFF00', bar: '2E3192',
};
const SERIF = 'Times New Roman';
const SANS = 'Arial';
const W = 10;
const H = 7.5;

const pres = new pptxgen();
pres.defineLayout({ name: 'KPI_4x3', width: W, height: H });
pres.layout = 'KPI_4x3';
pres.author = COMPANY || 'KPI Performance System';
pres.company = (COMPANY || 'KPI').replace(/&/g, '&amp;');
pres.title = `${data.report_title || 'KPI Performance'} - ${period.name || ''}`;
pres.theme = { headFontFace: SERIF, bodyFontFace: SANS };

// ---------------------------------------------------------------- helpers
const isNum = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));
const pct = (v, dec = 0) => (isNum(v) ? `${Number(v).toFixed(dec)}%` : '');
const fmtInt = (v) => Math.round(Math.abs(Number(v))).toLocaleString('en-US');
const money = (v) => {
  if (!isNum(v)) return '';
  const n = Number(v);
  return n < 0 ? `${CUR} (${fmtInt(n)})` : `${CUR} ${fmtInt(n)}`;
};
const moneyShort = (v) => {
  if (!isNum(v)) return '-';
  const n = Number(v);
  return `${n < 0 ? '-' : ''}${CUR}${fmtInt(n)}`;
};
const num = (v) => (isNum(v) ? Math.round(Number(v)).toLocaleString('en-US') : '');
const pad2 = (n) => String(n).padStart(2, '0');

/** Reads width/height from PNG / JPEG / GIF / BMP / WEBP headers (no native deps). */
function imageSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b[0] === 0x47 && b[1] === 0x49) return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    if (b[0] === 0x42 && b[1] === 0x4d) return { w: b.readInt32LE(18), h: Math.abs(b.readInt32LE(22)) };
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = b.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (chunk === 'VP8L') {
        const bits = b.readUInt32LE(21);
        return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
      }
      return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        const len = b.readUInt16BE(i + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

function imageData(file) {
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'png'}`;
  return `${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** Photo cropped to fill the box (like PowerPoint "Fill"), or a placeholder silhouette. */
function addPhoto(slide, file, x, y, w, h, name = 'Photo') {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: 'F2F2F2' }, line: { color: '595959', width: 0.75 } });
  if (file && fs.existsSync(file)) {
    const size = imageSize(file);
    const opts = { data: imageData(file), x, y, w, h, altText: name, objectName: name };
    if (size && size.w > 0 && size.h > 0) {
      // pptxgenjs "cover" needs the natural ratio in w/h and the box in sizing
      opts.w = w;
      opts.h = (w * size.h) / size.w;
      opts.sizing = { type: 'cover', w, h };
    }
    slide.addImage(opts);
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { type: 'none' }, line: { color: '404040', width: 0.75 } });
    return;
  }
  // silhouette placeholder
  const cx = x + w / 2;
  slide.addShape(pres.shapes.OVAL, { x: cx - w * 0.2, y: y + h * 0.16, w: w * 0.4, h: w * 0.4, fill: { color: 'BFBFBF' }, line: { type: 'none' } });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + w * 0.16, y: y + h * 0.58, w: w * 0.68, h: h * 0.36, rectRadius: 0.2, fill: { color: 'BFBFBF' }, line: { type: 'none' } });
}

function vacantBox(slide, x, y, w, h) {
  slide.addText('Vacant', {
    x, y, w, h, isTextBox: true, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 12, color: C.brightRed,
    fill: { color: 'DDEBF7' }, line: { color: '404040', width: 0.75 }, margin: 0,
  });
}

function labelBox(slide, text, x, y, w, h = 0.3, fontSize = 9) {
  slide.addText(text || '', {
    x, y, w, h, isTextBox: true, align: 'center', valign: 'middle', fontFace: SANS, fontSize, bold: true,
    color: C.white, fill: { color: C.cyan }, line: { color: '1F4E79', width: 0.75 }, margin: 0, fit: 'shrink',
  });
}

/** Department tab (top-left) + big title band, as in the classic deck. */
function header(slide, tab, title, { titleSize = 26 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.12, y: 0.12, w: 2.15, h: 0.5, rectRadius: 0.08, fill: { color: 'E7E6E6' }, line: { color: 'A6A6A6', width: 0.75 },
    shadow: { type: 'outer', color: '7F7F7F', opacity: 0.35, blur: 3, offset: 2, angle: 90 },
  });
  slide.addText(tab || '', {
    x: 0.12, y: 0.12, w: 2.15, h: 0.5, isTextBox: true, align: 'center', valign: 'middle', fontFace: SERIF, fontSize: 16, color: C.red, margin: 0, fit: 'shrink',
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 2.35, y: 0.06, w: 7.35, h: 0.6, fill: { color: 'E7E6E6' }, line: { color: 'BFBFBF', width: 0.5 },
    shadow: { type: 'outer', color: '7F7F7F', opacity: 0.3, blur: 3, offset: 2, angle: 90 },
  });
  slide.addText(title, {
    x: 2.45, y: 0.06, w: 7.2, h: 0.6, isTextBox: true, align: 'left', valign: 'middle', fontFace: SERIF, fontSize: titleSize, bold: true, color: C.red, margin: 0, fit: 'shrink',
  });
}

/** Plain title band for table-style slides. */
function plainTitle(slide, title, size = 20) {
  slide.addText(title, {
    x: 0.2, y: 0.05, w: 9.6, h: 0.55, isTextBox: true, fontFace: SERIF, fontSize: size, bold: true, color: C.navy, valign: 'middle', margin: 0, fit: 'shrink',
  });
}

function footerText(slide) {
  slide.addText(`${COMPANY}  |  ${period.name || ''}`, {
    x: 0.15, y: 7.37, w: 6, h: 0.13, isTextBox: true, fontFace: SANS, fontSize: 7, color: C.white, margin: 0,
  });
}

// Backgrounds live on layouts so each image is stored once in the file.
const LAYOUTS = {};
for (const bg of ['bg_band.png', 'bg_plain.png', 'bg_cover.png']) {
  const file = asset(bg);
  const title = `KPI_${bg.replace(/\W/g, '_')}`;
  pres.defineSlideMaster({ title, background: file ? { path: file } : { color: 'FFFFFF' } });
  LAYOUTS[bg] = title;
}

function newSlide(bg) {
  return pres.addSlide({ masterName: LAYOUTS[bg] || LAYOUTS['bg_plain.png'] });
}

function arrow(slide, up, x, y, color) {
  slide.addShape(up ? pres.shapes.UP_ARROW : pres.shapes.DOWN_ARROW, {
    x, y, w: 0.34, h: 0.52, fill: { color }, line: { color: '262626', width: 0.5 },
  });
}

/** Column chart with the classic dark-blue bars and value labels. */
function barChart(slide, title, labels, values, box, { percent = false, money: isMoney = false, decimals = 2, color = C.bar, horizontal = false } = {}) {
  const clean = values.map((v) => (isNum(v) ? Number(v) : null));
  if (!labels.length) return;
  const fmt = percent ? `0.${'0'.repeat(decimals)}"%"` : isMoney ? '#,##0;-#,##0' : '#,##0';
  slide.addShape(pres.shapes.RECTANGLE, { ...box, fill: { color: C.white }, line: { color: '1F3864', width: 1.25 } });
  slide.addChart(pres.charts.BAR, [{ name: title, labels, values: clean }], {
    x: box.x + 0.03, y: box.y + 0.03, w: box.w - 0.06, h: box.h - 0.06,
    barDir: horizontal ? 'bar' : 'col',
    chartColors: [color],
    invertIfNegative: false,
    showTitle: true, title, titleFontFace: SANS, titleFontSize: 9, titleColor: '262626',
    showLegend: false,
    showValue: true, dataLabelFontSize: 6, dataLabelColor: '262626', dataLabelFormatCode: fmt, dataLabelPosition: 'outEnd',
    valAxisLabelFormatCode: fmt, valAxisLabelFontSize: 6, catAxisLabelFontSize: 6,
    catAxisLabelRotate: horizontal ? 0 : -45,
    valGridLine: { color: 'E7E6E6', size: 0.5 }, catGridLine: { style: 'none' },
    barGapWidthPct: 60,
    catAxisLabelColor: '404040', valAxisLabelColor: '404040',
  });
}

// conditional cell colors
const goodBad = (ach, target, higherIsBetter = true) => {
  if (!isNum(ach) || !isNum(target)) return null;
  return higherIsBetter ? (Number(ach) >= Number(target) ? C.cellGreen : C.cellRed) : (Number(ach) <= Number(target) ? C.cellGreen : C.cellRed);
};
const signColor = (v) => (isNum(v) ? (Number(v) >= 0 ? C.cellGreen : C.cellRed) : null);

function cell(text, opts = {}) {
  return { text: text ?? '', options: { fontFace: SANS, fontSize: 6.5, align: 'center', valign: 'middle', color: C.text, margin: 0.01, ...opts } };
}

// ---------------------------------------------------------------- slides
function coverSlide() {
  const s = newSlide('bg_cover.png');
  s.addText([
    { text: data.report_title || 'KPI Performance', options: { breakLine: true } },
    { text: `Year to date-${period.month_name || ''} ${YEAR}` },
  ], { x: 0.4, y: 0.35, w: 6.6, h: 1.5, isTextBox: true, fontFace: SERIF, fontSize: 32, bold: true, color: C.red, valign: 'top', margin: 0, fit: 'shrink' });
  s.addText(COMPANY, { x: 0.4, y: 1.9, w: 6.6, h: 0.5, isTextBox: true, fontFace: SERIF, fontSize: 22, bold: true, color: C.navy, margin: 0, fit: 'shrink' });
  const quotes = [data.cover_quote, data.cover_quote_2].filter(Boolean);
  if (quotes.length) {
    s.addText(quotes.map((q, i) => ({ text: q, options: { breakLine: i < quotes.length - 1, paraSpaceAfter: 8 } })), {
      x: 0.4, y: 2.6, w: 5.4, h: 2.2, isTextBox: true, fontFace: SANS, fontSize: 16, bold: true, color: C.black, valign: 'top', margin: 0, fit: 'shrink',
    });
  }
  if (data.cover_tagline) {
    s.addText(data.cover_tagline, { x: 5.0, y: 5.75, w: 3.0, h: 0.8, isTextBox: true, fontFace: SANS, fontSize: 18, bold: true, color: C.red, margin: 0, align: 'right', fit: 'shrink' });
  }
  // rising bars motif
  const bars = [0.35, 0.55, 0.8, 1.05, 1.35, 1.7];
  bars.forEach((bh, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 8.15 + i * 0.25, y: 7.25 - bh, w: 0.18, h: bh, fill: { color: i === bars.length - 1 ? 'E46C0A' : '2F75D6' }, line: { type: 'none' } });
  });
  if (data.logo && fs.existsSync(data.logo)) {
    const sz = imageSize(data.logo);
    const boxW = 1.4;
    const boxH = 0.9;
    let w = boxW;
    let h = sz ? (boxW * sz.h) / sz.w : boxH;
    if (h > boxH) { h = boxH; w = sz ? (boxH * sz.w) / sz.h : boxW; }
    s.addImage({ data: imageData(data.logo), x: 0.4, y: 6.3, w, h, altText: 'Company logo' });
  }
}

function goalsSlide(group) {
  const s = newSlide('bg_plain.png');
  header(s, "Main KPI's", `Our Main KPI's Goal (${group.group})`, { titleSize: 22 });
  const rows = group.rows || [];
  const fs_ = rows.length > 12 ? 12 : rows.length > 9 ? 14 : 16;
  const rowH = Math.min(0.42, 5.9 / (rows.length + 1));
  const head = ['Categories', String(YEAR), 'Responsible'].map((t) => cell(t, { bold: true, color: C.white, fill: { color: '4F81BD' }, fontSize: fs_ + 1, fontFace: 'Calibri' }));
  const body = rows.map((r) => [
    cell(`➢  ${r.category}`, { align: 'left', fontSize: fs_, bold: true, fontFace: 'Calibri', margin: [0, 0, 0, 0.1] }),
    cell(r.target || '', { fontSize: fs_, bold: true, fontFace: 'Calibri' }),
    cell(r.responsible || '', { align: 'left', fontSize: fs_, fontFace: 'Calibri', margin: [0, 0, 0, 0.1] }),
  ]);
  s.addTable([head, ...body], {
    x: 0.5, y: 1.0, w: 9.0, colW: [4.4, 1.6, 3.0], rowH, border: { type: 'solid', pt: 0.75, color: '4F81BD' },
    fill: { color: 'F2F7FC' },
  });
  footerText(s);
}

function costSlide(dept) {
  const s = newSlide('bg_band.png');
  header(s, dept.code, 'Line wise Cost Achievement');
  const total = dept.cost_total;
  s.addText(`Line Cost\nAchievement ${YEAR}`, { x: 0.05, y: 0.8, w: 3.1, h: 0.95, isTextBox: true, fontFace: SERIF, fontSize: 22, bold: true, color: C.navy, align: 'center', valign: 'middle', margin: 0 });
  s.addText(moneyShort(total), { x: 0.05, y: 1.75, w: 3.1, h: 0.6, isTextBox: true, fontFace: SERIF, fontSize: 30, bold: true, color: isNum(total) && total >= 0 ? C.darkGreen : C.red, align: 'center', margin: 0, fit: 'shrink' });

  addPhoto(s, dept.head_photo, 3.3, 0.78, 1.15, 1.3, dept.head_label || 'Head');
  labelBox(s, dept.head_label, 3.2, 2.1, 1.35, 0.28);

  const labels = dept.line_labels || [];
  const ytd = (dept.lines || []).map((l) => l.ytd?.cost_total ?? null);
  barChart(s, `${dept.code} Line Cost Achievement (${YEAR} total)`, labels, ytd, { x: 4.65, y: 0.72, w: 5.25, h: 1.68 }, { money: true });

  // Table A: productivity achievement % per line
  const nLines = labels.length;
  const firstColW = 0.95;
  const avgColW = 0.55;
  const lineColW = Math.max(0.36, (9.8 - firstColW - avgColW) / Math.max(1, nLines));
  const tableW = firstColW + avgColW + lineColW * nLines;
  const fsz = nLines > 14 ? 5.5 : 6.5;
  const headRow = [cell('Month', { bold: true, fill: { color: C.header }, fontSize: fsz }), cell('Avg', { bold: true, fill: { color: C.header }, fontSize: fsz }),
    ...labels.map((l) => cell(l, { bold: true, fill: { color: C.header }, fontSize: fsz }))];
  const targets = dept.prod_rows?.[0]?.values || [];
  const prodBody = (dept.prod_rows || []).map((r, idx) => {
    const isTarget = idx === 0;
    const isAvg = idx === 1 || idx === 2;
    const base = { fontSize: fsz, bold: isTarget || isAvg };
    const rowFill = isTarget ? C.rowTarget : idx === 1 ? C.yellow : null;
    return [
      cell(r.label, { ...base, align: 'left', fill: rowFill ? { color: rowFill } : undefined }),
      cell(pct(r.avg), { ...base, fill: isTarget ? { color: C.rowTarget } : (goodBad(r.avg, avgOf(targets)) ? { color: goodBad(r.avg, avgOf(targets)) } : undefined) }),
      ...r.values.map((v, i) => cell(pct(v), { ...base, fill: isTarget ? { color: C.rowTarget } : (goodBad(v, targets[i]) ? { color: goodBad(v, targets[i]) } : undefined) })),
    ];
  });
  const costHead = [cell('Month', { bold: true, fill: { color: C.header }, fontSize: fsz }), cell('Total', { bold: true, fill: { color: C.header }, fontSize: fsz }),
    ...labels.map((l) => cell(l, { bold: true, fill: { color: C.header }, fontSize: fsz }))];
  const costBody = (dept.cost_rows || []).map((r, idx) => [
    cell(r.label, { fontSize: fsz, bold: idx === 0, align: 'left', fill: idx === 0 ? { color: C.yellow } : undefined }),
    cell(moneyShort(r.total), { fontSize: fsz, bold: true, fill: signColor(r.total) ? { color: signColor(r.total) } : undefined }),
    ...r.values.map((v) => cell(isNum(v) ? moneyShort(v) : '', { fontSize: fsz, fill: signColor(v) ? { color: signColor(v) } : undefined })),
  ]);

  const top = 2.55;
  const bottom = 7.25;
  const gap = 0.1;
  const totalRows = prodBody.length + 1 + (costBody.length ? costBody.length + 1 : 0);
  const rowH = Math.min(0.2, (bottom - top - gap) / Math.max(1, totalRows));
  const colW = [firstColW, avgColW, ...labels.map(() => lineColW)];
  const x = Math.max(0.1, (W - tableW) / 2);
  s.addTable([headRow, ...prodBody], { x, y: top, w: tableW, colW, rowH, border: { type: 'solid', pt: 0.5, color: '7F7F7F' }, fill: { color: C.white } });
  if (costBody.length) {
    s.addTable([costHead, ...costBody], { x, y: top + rowH * (prodBody.length + 1) + gap, w: tableW, colW, rowH, border: { type: 'solid', pt: 0.5, color: '7F7F7F' }, fill: { color: C.white } });
  }
  footerText(s);
}

function scaleTo(widths, total) {
  const sum = widths.reduce((a, b) => a + b, 0);
  return widths.map((w) => Math.round((w * total * 1000) / sum) / 1000);
}

function avgOf(values) {
  const v = (values || []).filter(isNum).map(Number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function lineSlide(dept, line) {
  const s = newSlide('bg_band.png');
  header(s, dept.code, line.label || `Line No ${pad2(line.number)}`, { titleSize: 30 });

  // Left: line cost achievement (year to date)
  const cost = line.ytd?.cost_total;
  s.addText(`Line Cost\nAchievement ${YEAR}`, { x: 0.0, y: 0.82, w: 2.0, h: 1.0, isTextBox: true, fontFace: SERIF, fontSize: 17, color: C.black, align: 'center', valign: 'middle', margin: 0 });
  s.addText(isNum(cost) ? moneyShort(cost) : '-', { x: 0.0, y: 1.86, w: 1.45, h: 0.5, isTextBox: true, fontFace: SERIF, fontSize: 20, bold: true, color: isNum(cost) && cost >= 0 ? C.darkGreen : C.red, align: 'center', margin: 0, fit: 'shrink' });
  if (isNum(cost)) arrow(s, cost >= 0, 1.5, 1.84, cost >= 0 ? C.darkGreen : C.red);

  // Right: average sewing DHU (year to date)
  const dhu = line.ytd?.sew_dhu;
  const dhuTarget = line.latest_target?.sew_dhu_target ?? line.current?.sew_dhu_target;
  const dhuBad = isNum(dhu) && isNum(dhuTarget) ? Number(dhu) > Number(dhuTarget) : false;
  s.addText(`Average Sew\nDHU (${YEAR})`, { x: 8.15, y: 0.78, w: 1.8, h: 0.75, isTextBox: true, fontFace: SERIF, fontSize: 16, color: C.black, align: 'center', valign: 'middle', margin: 0 });
  s.addText(pct(dhu, 2) || '-', { x: 8.62, y: 1.55, w: 1.33, h: 0.48, isTextBox: true, fontFace: SERIF, fontSize: 20, bold: true, color: dhuBad ? C.red : C.darkGreen, align: 'center', margin: 0, fit: 'shrink' });
  if (isNum(dhu)) arrow(s, dhuBad, 8.25, 1.82, dhuBad ? C.red : C.darkGreen);

  // Staff photo cards (up to 6)
  const staff = (line.staff || []).slice(0, 6);
  const slotW = 0.94;
  const pitch = 1.015;
  const startX = 2.08 + (6 - staff.length) * pitch / 2;
  staff.forEach((p, i) => {
    const x = startX + i * pitch;
    if (p.vacant) vacantBox(s, x, 0.78, slotW, 1.24);
    else addPhoto(s, p.photo, x, 0.78, slotW, 1.24, p.label);
    labelBox(s, p.label || '', x - 0.02, 2.07, slotW + 0.04, 0.3, 8.5);
  });

  // Monthly table
  const rows = line.rows || [];
  const H1 = (t, span) => cell(t, { bold: true, fill: { color: C.header }, colspan: span, fontSize: 6.5 });
  const head1 = [cell('', { fill: { color: C.header } }), H1('Efficiency', 2), H1('Productivity Achievement', 2), H1('Line Cost Achievement', 3), H1('Sewing DHU', 2), H1('Finishing DHU', 2)];
  const head2 = ['Month', 'Target', 'Ach :', 'Target', 'Ach :', 'Total profit/Loss', 'Total Idle hour loss', 'Total Diff from actual cost', 'Target', 'Ach :', 'Target', 'Ach :']
    .map((t) => cell(t, { bold: true, fill: { color: C.header }, fontSize: 6 }));
  const body = rows.map((r) => {
    const rowFill = r.is_avg ? { color: C.rowAvg } : undefined;
    const fillFor = (c) => (c ? { color: c } : rowFill);
    return [
      cell(r.label, { align: 'left', bold: r.is_avg, fill: rowFill }),
      cell(pct(r.eff_target), { fill: rowFill }),
      cell(pct(r.eff_ach), { fill: fillFor(goodBad(r.eff_ach, r.eff_target)) }),
      cell(pct(r.prod_target), { fill: rowFill }),
      cell(pct(r.prod_ach), { fill: fillFor(goodBad(r.prod_ach, r.prod_target)) }),
      cell(money(r.profit_loss), { fill: fillFor(signColor(r.profit_loss)), align: 'right' }),
      cell(money(r.idle_loss), { fill: fillFor(signColor(r.idle_loss)), align: 'right' }),
      cell(money(r.cost_diff), { fill: fillFor(signColor(r.cost_diff)), align: 'right', bold: true }),
      cell(pct(r.sew_dhu_target), { fill: rowFill }),
      cell(pct(r.sew_dhu, 2), { fill: fillFor(goodBad(r.sew_dhu, r.sew_dhu_target, false)) }),
      cell(pct(r.fin_dhu_target), { fill: rowFill }),
      cell(pct(r.fin_dhu, 2), { fill: fillFor(goodBad(r.fin_dhu, r.fin_dhu_target, false)) }),
    ];
  });
  const tableRows = [head1, head2, ...body];
  const rowH = Math.min(0.2, 2.62 / tableRows.length);
  s.addTable(tableRows, {
    x: 0.05, y: 2.47, w: 6.98, colW: scaleTo([0.86, 0.42, 0.44, 0.42, 0.44, 0.76, 0.76, 0.84, 0.42, 0.48, 0.42, 0.48], 6.98),
    rowH, border: { type: 'solid', pt: 0.5, color: '7F7F7F' }, fill: { color: C.white },
  });

  const labels = rows.map((r) => r.label);
  barChart(s, `Finishing DHU-${line.label} - ${dept.code}`, labels, rows.map((r) => r.fin_dhu), { x: 7.1, y: 2.47, w: 2.85, h: 2.62 }, { percent: true });
  barChart(s, `Profit/Loss-${line.label} - ${dept.code}`, labels, rows.map((r) => r.cost_diff), { x: 0.05, y: 5.15, w: 4.93, h: 2.12 }, { money: true });
  barChart(s, `Sewing DHU-${line.label} - ${dept.code}`, labels, rows.map((r) => r.sew_dhu), { x: 5.06, y: 5.15, w: 4.89, h: 2.12 }, { percent: true });
  footerText(s);
}

function nptSlide(dept) {
  const reasons = (dept.npt?.reasons || []).filter((r) => isNum(r.hours));
  if (!reasons.length) return;
  const s = newSlide('bg_plain.png');
  plainTitle(s, `${dept.name} Major Reason For NPT - ${YEAR}`);
  const sorted = [...reasons].sort((a, b) => Number(a.hours) - Number(b.hours));
  const total = dept.npt.total;
  const rows = [
    [cell(`${dept.code} (${period.month_name})`, { bold: true, align: 'left', fill: { color: 'FFF2CC' }, fontSize: 10 }), cell('Hour', { bold: true, fill: { color: 'DDEBF7' }, fontSize: 10 })],
    ...sorted.map((r) => [cell(r.reason, { align: 'left', fontSize: 9 }), cell(num(r.hours), { bold: true, fontSize: 10, align: 'right' })]),
    [cell('Total Loss Time', { bold: true, align: 'left', fontSize: 10, fill: { color: 'DDEBF7' } }), cell(num(total), { bold: true, fontSize: 10, align: 'right', fill: { color: 'DDEBF7' } })],
  ];
  const rowH = Math.min(0.45, 4.8 / rows.length);
  s.addTable(rows, { x: 0.15, y: 1.0, w: 4.4, colW: [3.6, 0.8], rowH, border: { type: 'solid', pt: 0.5, color: '9BC2E6' }, fill: { color: C.white } });
  barChart(s, `${dept.code} NPT Total - ${num(total)} Hours`, sorted.map((r) => r.reason), sorted.map((r) => r.hours), { x: 4.75, y: 1.0, w: 5.1, h: Math.max(2.6, rowH * rows.length) }, { horizontal: true });
  footerText(s);
}

function unitSlide(dept) {
  const rows = dept.rows || [];
  const has = (f) => rows.some((r) => isNum(r[f]));
  if (!rows.some((r) => ['plan', 'produce', 'eff_ach', 'earning', 'dhu'].some((f) => isNum(r[f])))) return;
  const s = newSlide('bg_plain.png');
  plainTitle(s, `${dept.name} KPI`, 22);
  addPhoto(s, dept.head_photo, 8.75, 0.7, 1.05, 1.2, dept.head_label || 'Head');
  labelBox(s, dept.head_label, 8.6, 1.92, 1.35, 0.28, 8);

  const cols = [{ h: 'Month', f: (r) => r.label, w: 0.95, left: true }];
  if (has('plan')) cols.push({ h: 'Plan', f: (r) => num(r.plan), w: 0.95 });
  if (has('produce')) cols.push({ h: 'Produce', f: (r) => num(r.produce), w: 0.95 });
  if (has('plan') && has('produce')) cols.push({ h: 'Ach%', f: (r) => pct(r.prod_ach), w: 0.6, c: (r) => goodBad(r.prod_ach, 100) });
  if (has('eff_ach')) {
    if (has('eff_target')) cols.push({ h: 'Eff. Target', f: (r) => pct(r.eff_target), w: 0.65 });
    cols.push({ h: 'Efficiency', f: (r) => pct(r.eff_ach), w: 0.7, c: (r) => goodBad(r.eff_ach, r.eff_target) });
  }
  if (has('earning')) {
    cols.push({ h: 'Earning Target', f: (r) => num(r.earning_target), w: 0.8 });
    cols.push({ h: 'Earning', f: (r) => num(r.earning), w: 0.8 });
    cols.push({ h: 'Earn. Ach%', f: (r) => pct(r.earning_ach), w: 0.6, c: (r) => goodBad(r.earning_ach, 100) });
  }
  if (has('dhu')) {
    if (has('dhu_target')) cols.push({ h: 'DHU Target', f: (r) => pct(r.dhu_target, 2), w: 0.62 });
    cols.push({ h: 'DHU', f: (r) => pct(r.dhu, 2), w: 0.62, c: (r) => goodBad(r.dhu, r.dhu_target, false) });
  }
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  const scale = Math.min(1, 8.3 / totalW);
  const colW = cols.map((c) => c.w * scale);
  const head = cols.map((c) => cell(c.h, { bold: true, fill: { color: C.headerDark }, color: C.white, fontSize: 7.5 }));
  const body = rows.map((r) => cols.map((c) => {
    const color = c.c ? c.c(r) : null;
    return cell(c.f(r), { fontSize: 7.5, align: c.left ? 'left' : 'center', bold: r.is_avg, fill: color ? { color } : r.is_avg ? { color: C.rowAvg } : undefined });
  }));
  s.addText(`KPI Achievement Summary - ${YEAR} ${dept.name}`, { x: 0.2, y: 0.72, w: colW.reduce((a, b) => a + b, 0), h: 0.28, isTextBox: true, align: 'center', fontFace: SANS, fontSize: 10, bold: true, color: C.white, fill: { color: '000000' }, margin: 0 });
  const rowH = Math.min(0.24, 3.4 / (body.length + 1));
  s.addTable([head, ...body], { x: 0.2, y: 1.0, w: colW.reduce((a, b) => a + b, 0), colW, rowH, border: { type: 'solid', pt: 0.5, color: '7F7F7F' }, fill: { color: C.white } });

  const labels = rows.map((r) => r.label);
  const chartTop = 1.0 + rowH * (body.length + 1) + 0.15;
  const chartH = Math.max(1.8, 7.25 - chartTop);
  const first = has('plan') && has('produce') ? ['Productivity Ach%', rows.map((r) => r.prod_ach)] : ['Efficiency %', rows.map((r) => r.eff_ach)];
  const second = has('dhu') ? ['DHU %', rows.map((r) => r.dhu)] : ['Efficiency %', rows.map((r) => r.eff_ach)];
  barChart(s, first[0], labels, first[1], { x: 0.2, y: chartTop, w: 4.75, h: chartH }, { percent: true, decimals: 0 });
  barChart(s, second[0], labels, second[1], { x: 5.05, y: chartTop, w: 4.75, h: chartH }, { percent: true, decimals: 2 });
  footerText(s);
}

function supervisorSlides(dept) {
  const people = (dept.people || []).filter((p) => (p.rows || []).some((r) => isNum(r.eff_ach) || isNum(r.produce)));
  for (let i = 0; i < people.length; i += 2) {
    const s = newSlide('bg_plain.png');
    plainTitle(s, `Supervisor wise ${dept.name} KPI`, 20);
    people.slice(i, i + 2).forEach((p, k) => {
      const top = 0.72 + k * 3.28;
      const rows = p.rows || [];
      const head = ['Month', 'Eff. Target', 'Ach :', 'Plan', 'Produce', 'Ach%'].map((t) => cell(t, { bold: true, fill: { color: C.header }, fontSize: 6.5 }));
      const body = rows.map((r) => [
        cell(r.label, { align: 'left', bold: r.is_avg, fill: r.is_avg ? { color: C.rowAvg } : undefined }),
        cell(pct(r.eff_target)),
        cell(pct(r.eff_ach), { fill: goodBad(r.eff_ach, r.eff_target) ? { color: goodBad(r.eff_ach, r.eff_target) } : undefined }),
        cell(num(r.plan)), cell(num(r.produce)),
        cell(pct(r.prod_ach), { fill: goodBad(r.prod_ach, 100) ? { color: goodBad(r.prod_ach, 100) } : undefined }),
      ]);
      const rowH = Math.min(0.2, 3.1 / (body.length + 1));
      s.addTable([head, ...body], { x: 0.15, y: top, w: 4.1, colW: [0.9, 0.6, 0.55, 0.75, 0.75, 0.55], rowH, border: { type: 'solid', pt: 0.5, color: '7F7F7F' }, fill: { color: C.white } });
      barChart(s, `Efficiency - ${p.label}`, rows.map((r) => r.label), rows.map((r) => r.eff_ach), { x: 4.35, y: top, w: 4.1, h: 3.1 }, { percent: true, decimals: 0, color: C.red });
      addPhoto(s, p.photo, 8.6, top + 0.5, 1.15, 1.35, p.label);
      labelBox(s, p.label, 8.5, top + 1.9, 1.35, 0.3, 8);
    });
    footerText(s);
  }
}

function thankYouSlide() {
  const s = newSlide('bg_plain.png');
  s.addText(COMPANY, { x: 0.5, y: 0.05, w: 9, h: 0.55, isTextBox: true, align: 'center', valign: 'middle', fontFace: SERIF, fontSize: 24, bold: true, color: '2E3192', margin: 0, fit: 'shrink' });
  s.addText('Thank You', { x: 0.5, y: 2.4, w: 9, h: 1.6, isTextBox: true, align: 'center', valign: 'middle', fontFace: SERIF, fontSize: 66, italic: true, color: C.navy, margin: 0 });
  s.addText(`${data.report_title || 'KPI Performance'} · ${period.name || ''}`, { x: 0.5, y: 4.1, w: 9, h: 0.5, isTextBox: true, align: 'center', fontFace: SANS, fontSize: 16, color: C.grayDark, margin: 0 });
}

// ---------------------------------------------------------------- build
coverSlide();
const shownGoals = new Set();
const goalsByName = Object.fromEntries((data.goals || []).map((g) => [g.group, g]));
for (const dept of data.departments || []) {
  if (dept.goal_group && goalsByName[dept.goal_group] && !shownGoals.has(dept.goal_group)) {
    goalsSlide(goalsByName[dept.goal_group]);
    shownGoals.add(dept.goal_group);
  }
  if (dept.kind === 'lines') {
    if ((dept.lines || []).length) costSlide(dept);
    for (const line of dept.lines || []) lineSlide(dept, line);
    nptSlide(dept);
  } else {
    unitSlide(dept);
    supervisorSlides(dept);
  }
}
// goal groups not attached to any department still get their slide
for (const g of data.goals || []) {
  if (!shownGoals.has(g.group) && (data.departments || []).length > 1) goalsSlide(g);
}
thankYouSlide();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Post-processes the .pptx zip:
 *  - drops directory entries ("ppt/", ...) that JSZip adds (OneDrive/SharePoint can refuse them)
 *  - stores each distinct picture once: pptxgenjs embeds a photo again on every slide that uses it
 *    (a supervisor on 9 line slides = 9 copies), so duplicates are removed and the slide
 *    relationships are pointed at the single copy.
 */
function cleanZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return buf;
  const count = buf.readUInt16LE(eocd + 10);
  let cd = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt16LE(cd + 28);
    const extraLen = buf.readUInt16LE(cd + 30);
    const commentLen = buf.readUInt16LE(cd + 32);
    const localOff = buf.readUInt32LE(cd + 42);
    const name = buf.toString('utf8', cd + 46, cd + 46 + nameLen);
    const central = Buffer.from(buf.subarray(cd, cd + 46 + nameLen + extraLen + commentLen));
    cd += 46 + nameLen + extraLen + commentLen;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const method = buf.readUInt16LE(localOff + 8);
    const compSize = central.readUInt32LE(20);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    entries.push({ name, central, method, data: buf.subarray(dataStart, dataStart + compSize), crc: central.readUInt32LE(16), size: central.readUInt32LE(24) });
  }

  // duplicate media -> canonical name
  const canonical = {};
  const seen = new Map();
  for (const e of entries) {
    if (!e.name.startsWith('ppt/media/')) continue;
    const key = `${e.crc}:${e.size}`;
    const first = seen.get(key);
    if (first && first.data.equals(e.data)) canonical[e.name] = first.name;
    else if (!first) seen.set(key, e);
  }
  const renames = Object.entries(canonical).map(([dup, keep]) => [path.posix.basename(dup), path.posix.basename(keep)]);

  const out = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    if (e.name.endsWith('/') || canonical[e.name]) continue;
    let { data, crc, size, method } = e;
    if (renames.length && e.name.endsWith('.rels') && e.name.includes('/_rels/')) {
      let xml = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
      let changed = false;
      for (const [dup, keep] of renames) {
        const needle = `media/${dup}"`;
        if (xml.includes(needle)) {
          xml = xml.split(needle).join(`media/${keep}"`);
          changed = true;
        }
      }
      if (changed) {
        const raw = Buffer.from(xml, 'utf8');
        crc = crc32(raw);
        size = raw.length;
        data = zlib.deflateRawSync(raw);
        method = 8;
      }
    }
    const nameBuf = Buffer.from(e.name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names, no data descriptor
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(e.central.readUInt32LE(12), 10); // time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(e.central.readUInt32LE(12), 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    out.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cdBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...out, cdBuf, end]);
}

// 'STREAM' is the only node output type for which pptxgenjs honours compression.
pres
  .write({ outputType: 'STREAM', compression: true })
  .then((buffer) => {
    let out = buffer;
    try {
      out = cleanZip(buffer);
    } catch (e) {
      console.warn('Zip clean-up skipped:', e.message);
    }
    fs.writeFileSync(outputPath, out);
    console.log(`Presentation generated: ${outputPath}`);
  })
  .catch((err) => {
    console.error('Error writing presentation:', err);
    process.exit(1);
  });
