export interface StaffSlot {
  position: number;
  role: string;
  name: string;
  is_vacant: boolean;
  photo_url: string | null;
}

export interface Line {
  id: number;
  department_id: number;
  number: number;
  name: string | null;
  label: string;
  is_active: boolean;
  staff: StaffSlot[];
}

export interface UnitPerson {
  id: number;
  department_id: number;
  label: string;
  photo_url: string | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  kind: 'lines' | 'unit';
  head_label: string | null;
  head_photo_url: string | null;
  goal_group: string | null;
  sort_order: number;
  is_active: boolean;
  lines: Line[];
  unit_people: UnitPerson[];
}

export interface Period {
  year: number;
  month: number;
}

export interface AppSettings {
  company_name: string;
  report_title: string;
  cover_quote: string;
  cover_quote_2: string;
  cover_tagline: string;
  currency_symbol: string;
  auto_backup_minutes: number;
  logo_url: string | null;
  google_client_id: string;
  google_client_secret_set: boolean;
  google_configured: boolean;
}

export interface Me {
  id: number;
  name: string;
  email: string | null;
  avatar_url: string | null;
  is_default: boolean;
  google_connected: boolean;
  google_configured: boolean;
  last_backup_at: string | null;
}

export interface KpiGoal {
  id?: number;
  group_name: string;
  category: string;
  target: string | null;
  responsible: string | null;
}

export const LINE_FIELDS = [
  'eff_target', 'eff_ach', 'prod_target', 'prod_ach', 'profit_loss', 'idle_loss', 'cost_diff',
  'sew_dhu_target', 'sew_dhu', 'fin_dhu_target', 'fin_dhu',
] as const;
export type LineField = (typeof LINE_FIELDS)[number];

export const UNIT_FIELDS = ['plan', 'produce', 'eff_target', 'eff_ach', 'earning_target', 'earning', 'dhu_target', 'dhu'] as const;
export type UnitField = (typeof UNIT_FIELDS)[number];

export type MetricValues = Partial<Record<string, number | null>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LineMetricRow = { line_id: number; number: number; label: string; previous?: MetricValues | null; [field: string]: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnitMetricRow = { unit_person_id: number; label: string; previous?: MetricValues | null; [field: string]: any };

export interface NptReason {
  id?: number;
  reason: string;
  hours: number | null;
}
