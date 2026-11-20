<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\KpiSubmission;
use App\Models\ProductionRecord;
use App\Models\LineCostRecord;
use App\Models\ReportingPeriod;
use App\Models\SpecializedRecord;
use App\Services\KpiCalculationEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private KpiCalculationEngine $calcEngine)
    {
    }

    /**
     * Executive company overview for a given period
     */
    public function companyOverview(Request $request): JsonResponse
    {
        $periodId = $request->query('period_id');
        $period = $periodId 
            ? ReportingPeriod::find($periodId) 
            : ReportingPeriod::where('year', 2026)->where('month', 10)->first();

        if (!$period) {
            return response()->json(['error' => 'Reporting period not found'], 404);
        }

        $departments = Department::where('is_active', true)->orderBy('sort_order')->get();
        $submissions = KpiSubmission::with(['department', 'productionRecords', 'lineCostRecords', 'specializedRecords'])
            ->where('reporting_period_id', $period->id)
            ->get();

        $deptCards = [];
        $totalPlanPcs = 0;
        $totalProducePcs = 0;
        $totalProfitLoss = 0.0;

        foreach ($departments as $dept) {
            $sub = $submissions->firstWhere('department_id', $dept->id);
            $planPcs = 0;
            $producePcs = 0;
            $achPct = 0.0;
            $status = $sub ? $sub->status : 'pending';

            if ($sub) {
                if ($sub->productionRecords->isNotEmpty()) {
                    $pRec = $sub->productionRecords->first();
                    $planPcs = $pRec->plan_pcs;
                    $producePcs = $pRec->produce_pcs;
                    $achPct = $pRec->pcs_ach_pct;
                    $totalPlanPcs += $planPcs;
                    $totalProducePcs += $producePcs;
                }

                if ($sub->lineCostRecords->isNotEmpty()) {
                    $cRec = $sub->lineCostRecords->first();
                    $totalProfitLoss += (float) $cRec->total_profit_loss;
                }

                if ($sub->specializedRecords->isNotEmpty()) {
                    $sRec = $sub->specializedRecords->first();
                    $achPct = $sRec->achievement_pct;
                }
            }

            $deptCards[] = [
                'department_id' => $dept->id,
                'code' => $dept->code,
                'name' => $dept->name,
                'type' => $dept->department_type,
                'head_name' => $dept->head_name,
                'status' => $status,
                'plan_pcs' => $planPcs,
                'produce_pcs' => $producePcs,
                'achievement_pct' => $achPct,
                'status_color' => $this->calcEngine->evaluateStatus($achPct, 100.0, 95.0),
            ];
        }

        $overallAchPct = $totalPlanPcs > 0 ? round(($totalProducePcs / $totalPlanPcs) * 100, 2) : 100.0;

        return response()->json([
            'period' => [
                'id' => $period->id,
                'name' => $period->name,
                'year' => $period->year,
                'month' => $period->month,
                'is_closed' => $period->is_closed,
            ],
            'summary' => [
                'total_plan_pcs' => $totalPlanPcs,
                'total_produce_pcs' => $totalProducePcs,
                'overall_plan_achievement_pct' => $overallAchPct,
                'total_profit_loss' => $totalProfitLoss,
                'total_departments' => $departments->count(),
                'approved_departments' => $submissions->where('status', 'approved')->count(),
            ],
            'departments' => $deptCards,
        ]);
    }

    /**
     * Department detailed historical drill-down
     */
    public function departmentDetails(string $deptId, Request $request): JsonResponse
    {
        $department = Department::with('lines.supervisor')->find($deptId);
        if (!$department) {
            return response()->json(['error' => 'Department not found'], 404);
        }

        $submissions = KpiSubmission::with(['reportingPeriod', 'productionRecords', 'lineCostRecords', 'specializedRecords', 'qualityRecords'])
            ->where('department_id', $deptId)
            ->get();

        $monthlyTrends = [];
        foreach ($submissions as $sub) {
            $period = $sub->reportingPeriod;
            if (!$period) continue;

            $trendItem = [
                'period_name' => $period->name,
                'month' => $period->month,
                'status' => $sub->status,
                'plan_pcs' => 0,
                'produce_pcs' => 0,
                'achievement_pct' => 0.0,
                'profit_loss' => 0.0,
            ];

            if ($sub->productionRecords->isNotEmpty()) {
                $pRec = $sub->productionRecords->first();
                $trendItem['plan_pcs'] = $pRec->plan_pcs;
                $trendItem['produce_pcs'] = $pRec->produce_pcs;
                $trendItem['achievement_pct'] = (float) $pRec->pcs_ach_pct;
            }

            if ($sub->lineCostRecords->isNotEmpty()) {
                $cRec = $sub->lineCostRecords->first();
                $trendItem['profit_loss'] = (float) $cRec->total_profit_loss;
            }

            if ($sub->specializedRecords->isNotEmpty()) {
                $sRec = $sub->specializedRecords->first();
                $trendItem['metric_name'] = $sRec->metric_name;
                $trendItem['target_value'] = (float) $sRec->target_value;
                $trendItem['actual_value'] = (float) $sRec->actual_value;
                $trendItem['achievement_pct'] = (float) $sRec->achievement_pct;
            }

            $monthlyTrends[] = $trendItem;
        }

        // Sort by month
        usort($monthlyTrends, fn($a, $b) => $a['month'] <=> $b['month']);

        return response()->json([
            'department' => $department,
            'lines' => $department->lines,
            'monthly_trends' => $monthlyTrends,
        ]);
    }
}
