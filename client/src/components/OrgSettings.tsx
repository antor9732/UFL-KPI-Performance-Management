import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { addLine, createDepartment, deleteDepartment, deleteLine, errorText, reorderDepartments, updateDepartment, updateLine } from '../api';
import type { Department } from '../types';
import { Button, Card, Select, TextInput, Toast, useToast } from './ui';
import { BlurInput } from './People';

/** Departments (sewing-line departments or units) and their lines. */
export const OrgSettings: React.FC<{ departments: Department[]; reload: () => Promise<void> }> = ({ departments, reload }) => {
  const t = useToast();
  const [draft, setDraft] = useState({ code: '', name: '', kind: 'lines', head_label: '', goal_group: '', line_count: '9' });
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      await reload();
      if (ok) t.ok(ok);
    } catch (e) {
      t.error(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = departments.map((d) => d.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run('order', () => reorderDepartments(ids));
  };

  return (
    <Card title="Departments & lines">
      <div className="space-y-3">
        {departments.map((d, i) => (
          <details key={d.id} className="bg-slate-950 rounded-xl border border-slate-800">
            <summary className="flex items-center justify-between gap-3 p-3 cursor-pointer">
              <span className="text-sm text-white font-semibold">{d.code} <span className="text-slate-400 font-normal">— {d.name} · {d.kind === 'lines' ? `${d.lines.length} lines` : 'unit'}</span></span>
              <span className="flex gap-1" onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" title="Move up" onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button variant="ghost" title="Move down" onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
              </span>
            </summary>
            <div className="p-4 pt-0 space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <BlurInput label="Short name (slide tab)" value={d.code} onSave={(v) => run('d', () => updateDepartment(d.id, { code: v }))} />
                <BlurInput label="Full name" value={d.name} onSave={(v) => run('d', () => updateDepartment(d.id, { name: v }))} />
                <BlurInput label="Head label" value={d.head_label ?? ''} onSave={(v) => run('d', () => updateDepartment(d.id, { head_label: v }))} />
                <BlurInput label="KPI goal group" value={d.goal_group ?? ''} onSave={(v) => run('d', () => updateDepartment(d.id, { goal_group: v }))} />
              </div>
              {d.kind === 'lines' && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Lines (number shown as "Line No 01"; optional custom name)</p>
                  <div className="flex flex-wrap gap-2">
                    {d.lines.map((l) => (
                      <div key={l.id} className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <input type="number" defaultValue={l.number} onBlur={(e) => Number(e.target.value) !== l.number && run('l', () => updateLine(l.id, { number: Number(e.target.value) }))}
                          className="w-12 bg-transparent text-sm text-white text-center" title="Line number" />
                        <input defaultValue={l.name ?? ''} placeholder="name" onBlur={(e) => e.target.value !== (l.name ?? '') && run('l', () => updateLine(l.id, { name: e.target.value || null }))}
                          className="w-24 bg-transparent text-xs text-slate-300" />
                        <button className="text-slate-500 hover:text-rose-400 cursor-pointer" title="Delete line" onClick={() => window.confirm(`Delete ${l.label} with its photos and monthly figures?`) && run('l', () => deleteLine(l.id), 'Line deleted.')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button variant="secondary" busy={busy === `add-${d.id}`} onClick={() => run(`add-${d.id}`, () => addLine(d.id))}><Plus className="w-4 h-4" /> Add line</Button>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="danger" onClick={() => window.confirm(`Delete ${d.code} with ALL its lines, people, photos and figures?`) && run('del', () => deleteDepartment(d.id), 'Department deleted.')}>
                  <Trash2 className="w-4 h-4" /> Delete department
                </Button>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-5 bg-slate-950 rounded-xl p-4 border border-dashed border-slate-700">
        <p className="text-sm font-semibold text-white mb-3">Add department</p>
        <div className="grid md:grid-cols-6 gap-3 items-end">
          <TextInput label="Short name" placeholder="Knit-01" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <TextInput label="Full name" placeholder="Knit-01 Department" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Select label="Type" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            <option value="lines">Sewing lines</option>
            <option value="unit">Unit (cutting, print…)</option>
          </Select>
          {draft.kind === 'lines' ? (
            <TextInput label="Number of lines" type="number" min={0} value={draft.line_count} onChange={(e) => setDraft({ ...draft, line_count: e.target.value })} />
          ) : <div />}
          <TextInput label="KPI goal group" placeholder="Knit" value={draft.goal_group} onChange={(e) => setDraft({ ...draft, goal_group: e.target.value })} />
          <Button busy={busy === 'create'} disabled={!draft.code.trim() || !draft.name.trim()} onClick={() => run('create', async () => {
            await createDepartment({ code: draft.code.trim(), name: draft.name.trim(), kind: draft.kind as 'lines' | 'unit', goal_group: draft.goal_group.trim() || null, line_count: Number(draft.line_count) || 0 });
            setDraft({ code: '', name: '', kind: 'lines', head_label: '', goal_group: '', line_count: '9' });
          }, 'Department added.')}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>
      <Toast toast={t.toast} onClose={t.close} />
    </Card>
  );
};
