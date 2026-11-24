<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MetricsController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\ReportExportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Middleware\AutoBackup;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(AutoBackup::class)->group(function () {
    // Health check used by the desktop launcher to confirm this app owns the port
    Route::get('/ping', fn () => response()->json(['app' => 'kpi-system', 'status' => 'ok']));

    // Account (default local user, optional Google)
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Settings & KPI goals
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::post('/settings/logo', [SettingsController::class, 'logo']);
    Route::post('/settings/reset-data', [SettingsController::class, 'resetData']);
    Route::get('/kpi-goals', [SettingsController::class, 'goals']);
    Route::put('/kpi-goals', [SettingsController::class, 'saveGoals']);

    // Organization: departments, lines, staff photos, unit people
    Route::get('/departments', [OrganizationController::class, 'departments']);
    Route::post('/departments', [OrganizationController::class, 'storeDepartment']);
    Route::put('/departments/reorder', [OrganizationController::class, 'reorderDepartments']);
    Route::put('/departments/{department}', [OrganizationController::class, 'updateDepartment']);
    Route::delete('/departments/{department}', [OrganizationController::class, 'destroyDepartment']);
    Route::post('/departments/{department}/head-photo', [OrganizationController::class, 'headPhoto']);
    Route::post('/departments/{department}/lines', [OrganizationController::class, 'storeLine']);
    Route::put('/lines/{line}', [OrganizationController::class, 'updateLine']);
    Route::delete('/lines/{line}', [OrganizationController::class, 'destroyLine']);
    Route::post('/lines/{line}/staff/{position}', [OrganizationController::class, 'updateStaff'])->whereNumber('position');
    Route::post('/departments/{department}/unit-people', [OrganizationController::class, 'storeUnitPerson']);
    Route::post('/unit-people/{person}', [OrganizationController::class, 'updateUnitPerson']);
    Route::delete('/unit-people/{person}', [OrganizationController::class, 'destroyUnitPerson']);

    // Monthly data
    Route::get('/periods', [MetricsController::class, 'periods']);
    Route::get('/departments/{department}/line-metrics', [MetricsController::class, 'lineMetrics']);
    Route::put('/departments/{department}/line-metrics', [MetricsController::class, 'saveLineMetrics']);
    Route::post('/departments/{department}/copy-previous', [MetricsController::class, 'copyPrevious']);
    Route::get('/departments/{department}/npt', [MetricsController::class, 'npt']);
    Route::put('/departments/{department}/npt', [MetricsController::class, 'saveNpt']);
    Route::get('/departments/{department}/unit-metrics', [MetricsController::class, 'unitMetrics']);
    Route::put('/departments/{department}/unit-metrics', [MetricsController::class, 'saveUnitMetrics']);

    // Dashboards
    Route::get('/dashboard', [DashboardController::class, 'overview']);
    Route::get('/dashboard/department/{id}', [DashboardController::class, 'department'])->whereNumber('id');

    // PowerPoint
    Route::get('/reports/export-pptx', [ReportExportController::class, 'exportPptx']);

    // Backups
    Route::get('/backup/status', [BackupController::class, 'status']);
    Route::post('/backup/google', [BackupController::class, 'googleBackup']);
    Route::get('/backup/google/list', [BackupController::class, 'googleList']);
    Route::post('/backup/google/restore/{fileId}', [BackupController::class, 'googleRestore']);
    Route::get('/backup/download', [BackupController::class, 'download']);
    Route::post('/backup/restore', [BackupController::class, 'restore']);
});
