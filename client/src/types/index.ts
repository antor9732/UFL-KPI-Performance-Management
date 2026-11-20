export interface ReportingPeriod {
  id: string;
  name: string;
  period_type: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export interface ProductionLine {
  id: string;
  department_id: string;
  line_number: string;
  line_name: string;
  supervisor_id?: string;
  supervisor?: Employee;
  standard_manpower: number;
  standard_smv: number;
  sort_order: number;
  is_active: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  department_type: string;
  head_name: string;
  head_avatar_url?: string;
  sort_order: number;
  is_active: boolean;
  lines?: ProductionLine[];
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  designation?: string;
  avatar_url?: string;
  department_id?: string;
  department?: Department;
  phone?: string;
  email?: string;
  is_active: boolean;
}

export interface Role {
  id: number;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface ProductionRecord {
  id: string;
  submission_id: string;
  line_id?: string;
  line?: ProductionLine;
  month_name?: string;
  plan_hours: number;
  produce_hours: number;
  hour_ach_pct: number;
  plan_pcs: number;
  produce_pcs: number;
  pcs_ach_pct: number;
  earned_minutes: number;
  available_minutes: number;
  efficiency_pct: number;
  operators_count: number;
  helpers_count: number;
}

export interface LineCostRecord {
  id: string;
  submission_id: string;
  line_id?: string;
  line?: ProductionLine;
  month_name?: string;
  budgeted_cost: number;
  actual_cost: number;
  total_profit_loss: number;
  idle_hour_loss: number;
  cost_ach_pct: number;
  costing_productivity: number;
}

export interface QualityRecord {
  id: string;
  submission_id: string;
  line_id?: string;
  line?: ProductionLine;
  month_name?: string;
  checked_units: number;
  defect_units: number;
  total_defects: number;
  dhu: number;
  rejection_units: number;
  ftt_pct: number;
}

export interface SpecializedRecord {
  id: string;
  submission_id: string;
  department_type: string;
  supervisor_id?: string;
  supervisor?: Employee;
  month_name?: string;
  metric_name: string;
  target_value?: number;
  actual_value?: number;
  achievement_pct?: number;
  details?: Record<string, any>;
}

export interface KpiSubmission {
  id: string;
  reporting_period_id: string;
  reporting_period?: ReportingPeriod;
  department_id: string;
  department?: Department;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_required';
  submission_notes?: string;
  version: number;
  approved_at?: string;
  production_records?: ProductionRecord[];
  line_cost_records?: LineCostRecord[];
  quality_records?: QualityRecord[];
  specialized_records?: SpecializedRecord[];
}

export interface CompanyOverviewData {
  period: ReportingPeriod;
  summary: {
    total_plan_pcs: number;
    total_produce_pcs: number;
    overall_plan_achievement_pct: number;
    total_profit_loss: number;
    total_departments: number;
    approved_departments: number;
  };
  departments: Array<{
    department_id: string;
    code: string;
    name: string;
    type: string;
    head_name: string;
    status: string;
    plan_pcs: number;
    produce_pcs: number;
    achievement_pct: number;
    status_color: 'green' | 'yellow' | 'red' | 'grey';
  }>;
}
