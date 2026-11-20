<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PersonnelController extends Controller
{
    /**
     * List all key personnel (Department Heads, Supervisors, In-charges) and Roles
     */
    public function index(): JsonResponse
    {
        $departments = Department::with('lines.supervisor')->where('is_active', true)->get();
        $employees = Employee::with('department')->where('is_active', true)->get();
        $roles = Role::all();

        return response()->json([
            'departments' => $departments,
            'employees' => $employees,
            'roles' => $roles,
        ]);
    }

    /**
     * Upload / Update avatar image for an employee / supervisor
     */
    public function updateEmployeeAvatar(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp,svg|max:5120',
        ]);

        $employee = Employee::find($id);
        if (!$employee) {
            return response()->json(['error' => 'Employee not found'], 404);
        }

        $file = $request->file('avatar');
        $filename = 'emp_' . Str::slug($employee->full_name) . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $filename, 'public');

        $avatarUrl = '/storage/' . $path;
        $employee->avatar_url = $avatarUrl;
        $employee->save();

        return response()->json([
            'message' => 'Employee photo updated successfully',
            'employee' => $employee,
            'avatar_url' => $avatarUrl,
        ]);
    }

    /**
     * Upload / Update avatar image for a role
     */
    public function updateRoleAvatar(string $slug, Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp,svg|max:5120',
        ]);

        $role = Role::where('slug', $slug)->first();
        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        $file = $request->file('avatar');
        $filename = 'role_' . $slug . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $filename, 'public');

        $avatarUrl = '/storage/' . $path;
        $role->avatar_url = $avatarUrl;
        $role->save();

        return response()->json([
            'message' => 'Role badge/avatar updated successfully',
            'role' => $role,
            'avatar_url' => $avatarUrl,
        ]);
    }

    /**
     * Upload / Update head avatar for a department
     */
    public function updateDepartmentHeadAvatar(string $deptId, Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp,svg|max:5120',
        ]);

        $department = Department::find($deptId);
        if (!$department) {
            return response()->json(['error' => 'Department not found'], 404);
        }

        $file = $request->file('avatar');
        $filename = 'dept_head_' . Str::slug($department->code) . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('avatars', $filename, 'public');

        $avatarUrl = '/storage/' . $path;
        $department->head_avatar_url = $avatarUrl;
        $department->save();

        return response()->json([
            'message' => 'Department head photo updated successfully',
            'department' => $department,
            'avatar_url' => $avatarUrl,
        ]);
    }
}
