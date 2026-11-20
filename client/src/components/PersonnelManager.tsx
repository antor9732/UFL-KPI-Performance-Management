import React, { useEffect, useState, useRef } from 'react';
import type { Department, Employee, Role } from '../types';
import {
  getPersonnel,
  uploadDepartmentHeadAvatar,
  uploadEmployeeAvatar,
  uploadRoleAvatar,
} from '../api';
import { Camera, CheckCircle2, Shield, User, AlertCircle, Building2 } from 'lucide-react';

export const PersonnelManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeTab, setActiveTab] = useState<'heads' | 'supervisors' | 'roles'>('heads');
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<{
    type: 'dept_head' | 'employee' | 'role';
    id: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPersonnel();
      setDepartments(data.departments || []);
      setEmployees(data.employees || []);
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load personnel', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = (type: 'dept_head' | 'employee' | 'role', id: string) => {
    setPendingUploadTarget({ type, id });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadTarget) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingId(pendingUploadTarget.id);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (pendingUploadTarget.type === 'dept_head') {
        const res = await uploadDepartmentHeadAvatar(pendingUploadTarget.id, formData);
        setDepartments((prev) =>
          prev.map((d) => (d.id === pendingUploadTarget.id ? { ...d, head_avatar_url: res.avatar_url } : d))
        );
        setSuccessMsg('Department head photo updated successfully!');
      } else if (pendingUploadTarget.type === 'employee') {
        const res = await uploadEmployeeAvatar(pendingUploadTarget.id, formData);
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === pendingUploadTarget.id ? { ...emp, avatar_url: res.avatar_url } : emp))
        );
        setSuccessMsg('Personnel photo updated successfully!');
      } else if (pendingUploadTarget.type === 'role') {
        const res = await uploadRoleAvatar(pendingUploadTarget.id, formData);
        setRoles((prev) =>
          prev.map((r) => (r.slug === pendingUploadTarget.id ? { ...r, avatar_url: res.avatar_url } : r))
        );
        setSuccessMsg('Role badge/avatar updated successfully!');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingId(null);
      setPendingUploadTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Personnel & Role Photo Manager</h2>
          <p className="text-sm text-slate-400 mt-1">
            Update photos anytime for Department In-Charges, Supervisors, and Roles. Changes automatically reflect across
            dashboards and exported PowerPoint slides!
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('heads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'heads' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Department Heads
          </button>
          <button
            onClick={() => setActiveTab('supervisors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'supervisors' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Line Supervisors ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'roles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Roles & Badges
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl flex items-center space-x-3 text-sm font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl flex items-center space-x-3 text-sm font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading personnel profiles...</p>
        </div>
      ) : activeTab === 'heads' ? (
        /* Department Heads Gallery */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const isUploading = uploadingId === dept.id;
            return (
              <div
                key={dept.id}
                className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  {/* Avatar with Upload Overlay */}
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-900 to-slate-800 border-2 border-slate-700 overflow-hidden shrink-0 shadow-md">
                    {dept.head_avatar_url ? (
                      <img src={dept.head_avatar_url} alt={dept.head_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <User className="w-8 h-8" />
                      </div>
                    )}

                    {/* Camera Button Overlay */}
                    <button
                      onClick={() => triggerUpload('dept_head', dept.id)}
                      disabled={isUploading}
                      title="Upload or Change Photo"
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-indigo-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">{dept.code}</span>
                    <h4 className="text-base font-bold text-white truncate">{dept.head_name || 'In-Charge Unassigned'}</h4>
                    <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dept.name}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Presentation Tag:</span>
                  <button
                    onClick={() => triggerUpload('dept_head', dept.id)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'supervisors' ? (
        /* Line Supervisors & In-Charges Gallery */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
              <User className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No individual supervisors registered yet.</p>
            </div>
          ) : (
            employees.map((emp) => {
              const isUploading = uploadingId === emp.id;
              return (
                <div
                  key={emp.id}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-indigo-950 border-2 border-slate-700 overflow-hidden shrink-0 shadow-md">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <User className="w-8 h-8 text-indigo-400" />
                        </div>
                      )}

                      <button
                        onClick={() => triggerUpload('employee', emp.id)}
                        disabled={isUploading}
                        title="Upload Supervisor Photo"
                        className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-indigo-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">{emp.employee_code || 'UFL-EMP'}</span>
                      <h4 className="text-base font-bold text-white truncate">{emp.full_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{emp.designation || 'Supervisor'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{emp.department?.name || 'Factory Floor'}</span>
                    <button
                      onClick={() => triggerUpload('employee', emp.id)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Roles & Badges Gallery */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const isUploading = uploadingId === role.slug;
            return (
              <div
                key={role.slug}
                className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  {/* Badge / Avatar */}
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-indigo-950 border-2 border-slate-700 overflow-hidden shrink-0 shadow-md">
                    {role.avatar_url ? (
                      <img src={role.avatar_url} alt={role.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Shield className="w-8 h-8 text-indigo-400" />
                      </div>
                    )}

                    <button
                      onClick={() => triggerUpload('role', role.slug)}
                      disabled={isUploading}
                      title="Upload or Change Badge"
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-indigo-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{role.slug}</span>
                    <h4 className="text-base font-bold text-white truncate">{role.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{role.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">System Permission Tier</span>
                  <button
                    onClick={() => triggerUpload('role', role.slug)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Change Badge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
