import axios from 'axios';
import type { CompanyOverviewData, Department, KpiSubmission, ReportingPeriod } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Accept': 'application/json',
  },
});

export const getCompanyOverview = async (periodId?: string): Promise<CompanyOverviewData> => {
  const res = await api.get('/dashboard/company-overview', { params: { period_id: periodId } });
  return res.data;
};

export const getDepartmentDetails = async (deptId: string) => {
  const res = await api.get(`/dashboard/department/${deptId}`);
  return res.data;
};

export const getReportingPeriods = async (): Promise<ReportingPeriod[]> => {
  const res = await api.get('/reporting-periods');
  return res.data;
};

export const getDepartments = async (): Promise<Department[]> => {
  const res = await api.get('/departments');
  return res.data;
};

export const getSubmissions = async (periodId?: string, departmentId?: string): Promise<KpiSubmission[]> => {
  const res = await api.get('/submissions', { params: { period_id: periodId, department_id: departmentId } });
  return res.data;
};

export const getSubmissionDetails = async (id: string): Promise<KpiSubmission> => {
  const res = await api.get(`/submissions/${id}`);
  return res.data;
};

export const clonePreviousPeriod = async (targetPeriodId: string, sourcePeriodId?: string, departmentId?: string) => {
  const res = await api.post('/submissions/clone-previous-period', {
    target_period_id: targetPeriodId,
    source_period_id: sourcePeriodId,
    department_id: departmentId,
  });
  return res.data;
};

export const batchUpdateSubmission = async (submissionId: string, payload: any) => {
  const res = await api.put(`/submissions/${submissionId}/batch-update`, payload);
  return res.data;
};

export const approveSubmission = async (submissionId: string, comments?: string) => {
  const res = await api.post(`/submissions/${submissionId}/approve`, { comments });
  return res.data;
};

export const getPersonnel = async () => {
  const res = await api.get('/personnel');
  return res.data;
};

export const uploadEmployeeAvatar = async (empId: string, formData: FormData) => {
  const res = await api.post(`/personnel/${empId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const uploadRoleAvatar = async (slug: string, formData: FormData) => {
  const res = await api.post(`/roles/${slug}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const uploadDepartmentHeadAvatar = async (deptId: string, formData: FormData) => {
  const res = await api.post(`/departments/${deptId}/head-avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export default api;
