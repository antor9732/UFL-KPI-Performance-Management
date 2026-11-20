<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\KpiDefinition;
use App\Models\ReportingPeriod;
use Illuminate\Http\JsonResponse;

class OrganizationController extends Controller
{
    public function departments(): JsonResponse
    {
        $departments = Department::with(['lines' => fn($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json($departments);
    }

    public function reportingPeriods(): JsonResponse
    {
        $periods = ReportingPeriod::orderBy('year', 'desc')
            ->orderBy('month', 'asc')
            ->get();

        return response()->json($periods);
    }

    public function kpiDefinitions(): JsonResponse
    {
        $definitions = KpiDefinition::where('is_active', true)
            ->orderBy('category')
            ->get();

        return response()->json($definitions);
    }
}
