import axios from 'axios';
import type { AppSettings, Department, KpiGoal, LineMetricRow, Me, NptReason, UnitMetricRow } from '../types';

const api = axios.create({ baseURL: '/api/v1', headers: { Accept: 'application/json' } });

/** Turns a Laravel/axios error into one readable sentence. */
export function errorText(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) return Object.values(data.errors).flat().join(' ');
    return data?.error || data?.message || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

const form = (fields: Record<string, string | Blob | boolean | null | undefined>) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
  });
  return fd;
};

// Account
export const getMe = async (): Promise<Me> => (await api.get('/auth/me')).data;
export const logout = async (): Promise<Me> => (await api.post('/auth/logout')).data;

// Settings
export const getSettings = async (): Promise<AppSettings> => (await api.get('/settings')).data;
export const saveSettings = async (s: Partial<AppSettings> & { google_client_secret?: string }): Promise<AppSettings> => (await api.put('/settings', s)).data;
export const uploadLogo = async (file: File | null): Promise<AppSettings> =>
  (await api.post('/settings/logo', file ? form({ logo: file }) : form({ remove: true }))).data;
export const resetData = async () => (await api.post('/settings/reset-data', { confirm: 'DELETE' })).data;
export const getGoals = async (): Promise<KpiGoal[]> => (await api.get('/kpi-goals')).data;
export const saveGoals = async (goals: KpiGoal[]): Promise<KpiGoal[]> => (await api.put('/kpi-goals', { goals })).data;

// Organization
export const getDepartments = async (): Promise<Department[]> => (await api.get('/departments')).data;
export const createDepartment = async (d: Partial<Department> & { line_count?: number }): Promise<Department> => (await api.post('/departments', d)).data;
export const updateDepartment = async (id: number, d: Partial<Department>): Promise<Department> => (await api.put(`/departments/${id}`, d)).data;
export const deleteDepartment = async (id: number) => (await api.delete(`/departments/${id}`)).data;
export const reorderDepartments = async (ids: number[]) => (await api.put('/departments/reorder', { ids })).data;
export const uploadHeadPhoto = async (id: number, file: File | null): Promise<Department> =>
  (await api.post(`/departments/${id}/head-photo`, file ? form({ photo: file }) : form({ remove: true }))).data;
export const addLine = async (deptId: number, number?: number) => (await api.post(`/departments/${deptId}/lines`, number ? { number } : {})).data;
export const updateLine = async (id: number, d: { number?: number; name?: string | null; is_active?: boolean }) => (await api.put(`/lines/${id}`, d)).data;
export const deleteLine = async (id: number) => (await api.delete(`/lines/${id}`)).data;
export const updateStaff = async (
  lineId: number,
  position: number,
  fields: { role?: string; name?: string; is_vacant?: boolean; photo?: File; remove_photo?: boolean },
) => (await api.post(`/lines/${lineId}/staff/${position}`, form(fields))).data;
export const addUnitPerson = async (deptId: number, label: string, photo?: File) =>
  (await api.post(`/departments/${deptId}/unit-people`, form({ label, photo }))).data;
export const updateUnitPerson = async (id: number, fields: { label?: string; photo?: File; remove_photo?: boolean }) =>
  (await api.post(`/unit-people/${id}`, form(fields))).data;
export const deleteUnitPerson = async (id: number) => (await api.delete(`/unit-people/${id}`)).data;

// Monthly data
export interface MetricsResponse<T> { year: number; month: number; previous: { year: number; month: number }; has_previous: boolean; rows: T[]; copied?: number }
export const getPeriods = async (): Promise<{ year: number; month: number; name: string }[]> => (await api.get('/periods')).data;
export const getLineMetrics = async (deptId: number, year: number, month: number): Promise<MetricsResponse<LineMetricRow>> =>
  (await api.get(`/departments/${deptId}/line-metrics`, { params: { year, month } })).data;
export const saveLineMetrics = async (deptId: number, year: number, month: number, rows: LineMetricRow[]): Promise<MetricsResponse<LineMetricRow>> =>
  (await api.put(`/departments/${deptId}/line-metrics`, { year, month, rows })).data;
export const getUnitMetrics = async (deptId: number, year: number, month: number): Promise<MetricsResponse<UnitMetricRow>> =>
  (await api.get(`/departments/${deptId}/unit-metrics`, { params: { year, month } })).data;
export const saveUnitMetrics = async (deptId: number, year: number, month: number, rows: UnitMetricRow[]): Promise<MetricsResponse<UnitMetricRow>> =>
  (await api.put(`/departments/${deptId}/unit-metrics`, { year, month, rows })).data;
export const copyPrevious = async (deptId: number, year: number, month: number, mode: 'targets' | 'all') =>
  (await api.post(`/departments/${deptId}/copy-previous`, { year, month, mode })).data;
export const getNpt = async (deptId: number, year: number, month: number): Promise<{ reasons: NptReason[] }> =>
  (await api.get(`/departments/${deptId}/npt`, { params: { year, month } })).data;
export const saveNpt = async (deptId: number, year: number, month: number, reasons: NptReason[]): Promise<{ reasons: NptReason[] }> =>
  (await api.put(`/departments/${deptId}/npt`, { year, month, reasons })).data;

// Dashboards
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDashboard = async (year: number, month: number): Promise<any> => (await api.get('/dashboard', { params: { year, month } })).data;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDepartmentDashboard = async (id: number, year: number, month: number): Promise<any> =>
  (await api.get(`/dashboard/department/${id}`, { params: { year, month } })).data;

// Backups
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBackupStatus = async (): Promise<any> => (await api.get('/backup/status')).data;
export const backupToGoogle = async () => (await api.post('/backup/google', {}, { timeout: 600000 })).data;
export const listGoogleBackups = async (): Promise<{ id: string; name: string; size?: string; createdTime: string }[]> => (await api.get('/backup/google/list')).data;
export const restoreGoogleBackup = async (fileId: string) => (await api.post(`/backup/google/restore/${encodeURIComponent(fileId)}`, {}, { timeout: 600000 })).data;
export const restoreBackupFile = async (file: File) => (await api.post('/backup/restore', form({ file }), { timeout: 600000 })).data;

export default api;
