<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\KpiSubmissionController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\ReportExportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Organization & Setup
    Route::get('/departments', [OrganizationController::class, 'departments']);
    Route::get('/reporting-periods', [OrganizationController::class, 'reportingPeriods']);
    Route::get('/kpi/definitions', [OrganizationController::class, 'kpiDefinitions']);

    // Dashboards
    Route::get('/dashboard/company-overview', [DashboardController::class, 'companyOverview']);
    Route::get('/dashboard/department/{deptId}', [DashboardController::class, 'departmentDetails']);

    // Submissions & Monthly Workflows
    Route::get('/submissions', [KpiSubmissionController::class, 'index']);
    Route::get('/submissions/{id}', [KpiSubmissionController::class, 'show']);
    Route::post('/submissions/clone-previous-period', [KpiSubmissionController::class, 'clonePreviousPeriod']);
    Route::put('/submissions/{id}/batch-update', [KpiSubmissionController::class, 'batchUpdate']);
    Route::post('/submissions/{id}/approve', [KpiSubmissionController::class, 'approve']);
    Route::post('/submissions/{id}/reject', [KpiSubmissionController::class, 'reject']);

    // Personnel & Role Avatars Management
    Route::get('/personnel', [PersonnelController::class, 'index']);
    Route::post('/personnel/{id}/avatar', [PersonnelController::class, 'updateEmployeeAvatar']);
    Route::post('/roles/{slug}/avatar', [PersonnelController::class, 'updateRoleAvatar']);
    Route::post('/departments/{id}/head-avatar', [PersonnelController::class, 'updateDepartmentHeadAvatar']);

    // Automated 85-Slide Presentation Exports
    Route::get('/reports/export-pptx', [ReportExportController::class, 'exportPptx']);
    Route::post('/reports/generate-pptx', [ReportExportController::class, 'exportPptx']);
});
