import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  addUnitPerson, deleteUnitPerson, errorText, updateDepartment, updateStaff, updateUnitPerson, uploadHeadPhoto,
} from '../api';
import type { Department, Line, StaffSlot } from '../types';
import { Button, Card, PhotoBox, Select, TextInput, Toast, useToast } from './ui';

interface Props {
  departments: Department[];
  departmentId: number | null;
  onDepartment: (id: number) => void;
  reload: () => Promise<void>;
}

/** Department head, the 6 photo cards of every line, and unit supervisors. */
export const People: React.FC<Props> = ({ departments, departmentId, onDepartment, reload }) => {
  const dept = departments.find((d) => d.id === departmentId) ?? departments[0];
  const t = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (!dept) return <Card><p className="text-slate-400 text-sm">Add a department first (Settings → Departments & Lines).</p></Card>;

  const run = async (key: string, fn: () => Promise<unknown>, okText?: string) => {
    setBusyKey(key);
    try {
      await fn();
      await reload();
      if (okText) t.ok(okText);
    } catch (e) {
      t.error(errorText(e));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">People & Photos</h2>
          <p className="text-sm text-slate-400">These names and photos appear on the presentation slides. Hover a photo to change it.</p>
        </div>
        <Select label="Department" value={dept.id} onChange={(e) => onDepartment(Number(e.target.value))}>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
        </Select>
      </div>

      <Card title="Department head">
        <div className="flex items-center gap-5">
          <PhotoBox
            url={dept.head_photo_url}
            busy={busyKey === 'head'}
            onPick={(f) => run('head', () => uploadHeadPhoto(dept.id, f), 'Photo updated.')}
            onRemove={() => run('head', () => uploadHeadPhoto(dept.id, null))}
          />
          <div className="w-72">
            <BlurInput
              label="Label on slide (e.g. PM-Rahman)"
              value={dept.head_label ?? ''}
              onSave={(v) => run('head-label', () => updateDepartment(dept.id, { head_label: v }), 'Saved.')}
            />
          </div>
        </div>
      </Card>

      {dept.kind === 'lines' ? (
        dept.lines.length === 0 ? <Card><p className="text-slate-400 text-sm">No lines yet. Add them in Settings → Departments & Lines.</p></Card> :
          dept.lines.map((line) => <LineCard key={line.id} line={line} busyKey={busyKey} run={run} />)
      ) : (
        <UnitPeopleCard dept={dept} busyKey={busyKey} run={run} />
      )}
      <Toast toast={t.toast} onClose={t.close} />
    </div>
  );
};

type Run = (key: string, fn: () => Promise<unknown>, okText?: string) => Promise<void>;

const LineCard: React.FC<{ line: Line; busyKey: string | null; run: Run }> = ({ line, busyKey, run }) => (
  <Card title={line.label}>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {line.staff.map((s) => <SlotEditor key={s.position} line={line} slot={s} busyKey={busyKey} run={run} />)}
    </div>
  </Card>
);

const SlotEditor: React.FC<{ line: Line; slot: StaffSlot; busyKey: string | null; run: Run }> = ({ line, slot, busyKey, run }) => {
  const key = `${line.id}-${slot.position}`;
  return (
    <div className="space-y-2">
      <PhotoBox
        className="w-full h-32"
        url={slot.photo_url}
        vacant={slot.is_vacant}
        busy={busyKey === key}
        onPick={(f) => run(key, () => updateStaff(line.id, slot.position, { photo: f }), 'Photo updated.')}
        onRemove={() => run(key, () => updateStaff(line.id, slot.position, { remove_photo: true }))}
      />
      <div className="flex gap-1">
        <BlurInput compact placeholder="Role" value={slot.role} onSave={(v) => run(key, () => updateStaff(line.id, slot.position, { role: v }))} className="w-16" />
        <BlurInput compact placeholder="Name" value={slot.name} onSave={(v) => run(key, () => updateStaff(line.id, slot.position, { name: v, is_vacant: v.trim() === '' ? slot.is_vacant : false }))} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
        <input type="checkbox" checked={slot.is_vacant} onChange={(e) => run(key, () => updateStaff(line.id, slot.position, { is_vacant: e.target.checked }))} />
        Vacant
      </label>
    </div>
  );
};

const UnitPeopleCard: React.FC<{ dept: Department; busyKey: string | null; run: Run }> = ({ dept, busyKey, run }) => {
  const [label, setLabel] = useState('');
  return (
    <Card title="Supervisors (supervisor-wise slides)">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {dept.unit_people.map((p) => {
          const key = `p-${p.id}`;
          return (
            <div key={p.id} className="space-y-2">
              <PhotoBox
                className="w-full h-32"
                url={p.photo_url}
                busy={busyKey === key}
                onPick={(f) => run(key, () => updateUnitPerson(p.id, { photo: f }), 'Photo updated.')}
                onRemove={() => run(key, () => updateUnitPerson(p.id, { remove_photo: true }))}
              />
              <div className="flex gap-1">
                <BlurInput compact value={p.label} onSave={(v) => run(key, () => updateUnitPerson(p.id, { label: v }))} />
                <Button variant="ghost" title="Remove" onClick={() => window.confirm(`Remove ${p.label} and their monthly figures?`) && run(key, () => deleteUnitPerson(p.id))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2 mt-5 max-w-md">
        <TextInput label="New supervisor label" placeholder="e.g. Sup-Salam" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button disabled={!label.trim()} busy={busyKey === 'add-person'} onClick={() => run('add-person', () => addUnitPerson(dept.id, label.trim()), 'Added.').then(() => setLabel(''))}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </Card>
  );
};

/** Text input that saves when you leave it (or press Enter). */
export const BlurInput: React.FC<{ value: string; onSave: (v: string) => void; label?: string; placeholder?: string; compact?: boolean; className?: string }> = ({
  value, onSave, label, placeholder, compact, className = 'flex-1 min-w-0',
}) => {
  const [text, setText] = useState(value);
  React.useEffect(() => setText(value), [value]);
  const commit = () => { if (text !== value) onSave(text); };
  const input = (
    <input
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={`${className} bg-slate-950 border border-slate-700 rounded-lg ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} text-white focus:outline-none focus:border-indigo-500`}
    />
  );
  if (!label) return input;
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-400 mb-1">{label}</span>
      {input}
    </label>
  );
};
