<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Approval;
use App\Models\Department;
use App\Models\KpiSubmission;
use App\Models\LineCostRecord;
use App\Models\NptRecord;
use App\Models\ProductionRecord;
use App\Models\QualityRecord;
use App\Models\ReportingPeriod;
use App\Models\SpecializedRecord;
use App\Services\KpiCalculationEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KpiSubmissionController extends Controller
{
    public function __construct(private KpiCalculationEngine $calcEngine)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = KpiSubmission::with(['department', 'reportingPeriod', 'submittedBy', 'approvedBy']);

        if ($request->has('period_id')) {
            $query->where('reporting_period_id', $request->query('period_id'));
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->query('department_id'));
        }

        $submissions = $query->orderBy('created_at', 'desc')->get();
        return response()->json($submissions);
    }

    public function show(string $id): JsonResponse
    {
        $submission = KpiSubmission::with([
            'department.lines.supervisor',
            'reportingPeriod',
            'productionRecords.line',
            'lineCostRecords.line',
            'qualityRecords.line',
            'shipmentRecords',
            'leftoverRecords',
            'nptRecords.line',
            'specializedRecords.supervisor',
            'approvals.user',
        ])->find($id);

        if (!$submission) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        return response()->json($submission);
    }

    public function approve(string $id, Request $request): JsonResponse
    {
        $submission = KpiSubmission::find($id);
        if (!$submission) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        $submission->status = 'approved';
        $submission->approved_at = now();
        $submission->save();

        Approval::create([
            'kpi_submission_id' => $submission->id,
            'user_id' => $request->user()?->id ?? 1,
            'action' => 'approve',
            'comments' => $request->input('comments', 'Approved by Management'),
        ]);

        return response()->json(['message' => 'Submission approved successfully', 'submission' => $submission]);
    }

    public function reject(string $id, Request $request): JsonResponse
    {
        $submission = KpiSubmission::find($id);
        if (!$submission) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        $submission->status = 'rejected';
        $submission->save();

        Approval::create([
            'kpi_submission_id' => $submission->id,
            'user_id' => $request->user()?->id ?? 1,
            'action' => 'reject',
            'comments' => $request->input('comments', 'Rejected - revision required'),
            'reason_for_change' => $request->input('reason_for_change'),
        ]);

        return response()->json(['message' => 'Submission rejected', 'submission' => $submission]);
    }

    /**
     * Clone previous month's data to the current/target reporting period.
     * Copies lines, targets, budgets, and plans so the user only edits modified values!
     */
    public function clonePreviousPeriod(Request $request): JsonResponse
    {
        $request->validate([
            'target_period_id' => 'required|uuid',
            'source_period_id' => 'nullable|uuid',
            'department_id' => 'nullable|uuid',
        ]);

        $targetPeriod = ReportingPeriod::find($request->input('target_period_id'));
        if (!$targetPeriod) {
            return response()->json(['error' => 'Target reporting period not found'], 404);
        }

        // Determine source period
        if ($request->has('source_period_id') && $request->input('source_period_id')) {
            $sourcePeriod = ReportingPeriod::find($request->input('source_period_id'));
        } else {
            // Find immediately preceding month
            $prevMonth = $targetPeriod->month === 1 ? 12 : $targetPeriod->month - 1;
            $prevYear = $targetPeriod->month === 1 ? $targetPeriod->year - 1 : $targetPeriod->year;
            $sourcePeriod = ReportingPeriod::where('year', $prevYear)->where('month', $prevMonth)->first();
        }

        if (!$sourcePeriod) {
            return response()->json(['error' => 'Source reporting period not found to copy from'], 404);
        }

        $deptQuery = Department::where('is_active', true);
        if ($request->has('department_id') && $request->input('department_id')) {
            $deptQuery->where('id', $request->input('department_id'));
        }
        $departments = $deptQuery->get();

        $clonedCount = 0;

        DB::transaction(function () use ($sourcePeriod, $targetPeriod, $departments, &$clonedCount) {
            foreach ($departments as $dept) {
                $sourceSub = KpiSubmission::with(['productionRecords', 'lineCostRecords', 'qualityRecords', 'nptRecords', 'specializedRecords'])
                    ->where('reporting_period_id', $sourcePeriod->id)
                    ->where('department_id', $dept->id)
                    ->orderBy('version', 'desc')
                    ->first();

                // If no source submission exists, create a fresh draft with active lines
                $targetSub = KpiSubmission::firstOrCreate(
                    [
                        'reporting_period_id' => $targetPeriod->id,
                        'department_id' => $dept->id,
                        'version' => 1,
                    ],
                    [
                        'id' => (string) Str::uuid(),
                        'status' => 'draft',
                        'submission_notes' => "Cloned baseline from {$sourcePeriod->name} for {$targetPeriod->name}",
                    ]
                );

                if ($sourceSub) {
                    // 1. Clone Production Records (Carry over Plan, reset Actual for new month entry)
                    foreach ($sourceSub->productionRecords as $pRec) {
                        ProductionRecord::updateOrCreate(
                            [
                                'submission_id' => $targetSub->id,
                                'line_id' => $pRec->line_id,
                            ],
                            [
                                'id' => (string) Str::uuid(),
                                'month_name' => explode(' ', $targetPeriod->name)[0],
                                'plan_hours' => $pRec->plan_hours,
                                'produce_hours' => 0,
                                'hour_ach_pct' => 0,
                                'plan_pcs' => $pRec->plan_pcs,
                                'produce_pcs' => 0,
                                'pcs_ach_pct' => 0,
                                'earned_minutes' => 0,
                                'available_minutes' => 0,
                                'efficiency_pct' => 0,
                                'operators_count' => $pRec->operators_count,
                                'helpers_count' => $pRec->helpers_count,
                            ]
                        );
                    }

                    // 2. Clone Line Cost Records (Carry over budgeted cost)
                    foreach ($sourceSub->lineCostRecords as $cRec) {
                        LineCostRecord::updateOrCreate(
                            [
                                'submission_id' => $targetSub->id,
                                'line_id' => $cRec->line_id,
                            ],
                            [
                                'id' => (string) Str::uuid(),
                                'month_name' => explode(' ', $targetPeriod->name)[0],
                                'budgeted_cost' => $cRec->budgeted_cost,
                                'actual_cost' => 0,
                                'total_profit_loss' => 0,
                                'idle_hour_loss' => 0,
                                'cost_ach_pct' => 0,
                                'costing_productivity' => 0,
                            ]
                        );
                    }

                    // 3. Clone Specialized Records (Cutting, Printing, etc.)
                    foreach ($sourceSub->specializedRecords as $sRec) {
                        SpecializedRecord::updateOrCreate(
                            [
                                'submission_id' => $targetSub->id,
                                'metric_name' => $sRec->metric_name,
                            ],
                            [
                                'id' => (string) Str::uuid(),
                                'department_type' => $sRec->department_type,
                                'supervisor_id' => $sRec->supervisor_id,
                                'month_name' => explode(' ', $targetPeriod->name)[0],
                                'metric_name' => $sRec->metric_name,
                                'target_value' => $sRec->target_value,
                                'actual_value' => 0,
                                'achievement_pct' => 0,
                                'details' => $sRec->details,
                            ]
                        );
                    }
                } else {
                    // Populate from master lines if no previous submission
                    $lines = $dept->lines;
                    foreach ($lines as $line) {
                        ProductionRecord::firstOrCreate(
                            ['submission_id' => $targetSub->id, 'line_id' => $line->id],
                            [
                                'id' => (string) Str::uuid(),
                                'month_name' => explode(' ', $targetPeriod->name)[0],
                                'plan_pcs' => 40000,
                                'produce_pcs' => 0,
                            ]
                        );
                    }
                }

                $clonedCount++;
            }
        });

        return response()->json([
            'message' => "Successfully cloned baseline from {$sourcePeriod->name} to {$targetPeriod->name} for {$clonedCount} departments.",
            'source_period' => $sourcePeriod->name,
            'target_period' => $targetPeriod->name,
            'departments_cloned' => $clonedCount,
        ]);
    }

    /**
     * Batch update records for high-speed spreadsheet-like inline editing
     */
    public function batchUpdate(string $id, Request $request): JsonResponse
    {
        $submission = KpiSubmission::find($id);
        if (!$submission) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        $records = $request->input('production_records', []);
        $costRecords = $request->input('line_cost_records', []);
        $qualityRecords = $request->input('quality_records', []);
        $specializedRecords = $request->input('specialized_records', []);

        DB::transaction(function () use ($records, $costRecords, $qualityRecords, $specializedRecords, $submission) {
            // Update production rows
            foreach ($records as $row) {
                if (isset($row['id'])) {
                    $rec = ProductionRecord::find($row['id']);
                    if ($rec) {
                        $planPcs = (int) ($row['plan_pcs'] ?? $rec->plan_pcs);
                        $producePcs = (int) ($row['produce_pcs'] ?? $rec->produce_pcs);
                        $rec->plan_pcs = $planPcs;
                        $rec->produce_pcs = $producePcs;
                        $rec->pcs_ach_pct = $this->calcEngine->calculatePlanAchievement($producePcs, $planPcs);

                        $planHours = (float) ($row['plan_hours'] ?? $rec->plan_hours);
                        $produceHours = (float) ($row['produce_hours'] ?? $rec->produce_hours);
                        $rec->plan_hours = $planHours;
                        $rec->produce_hours = $produceHours;
                        $rec->hour_ach_pct = $this->calcEngine->calculatePlanAchievement($produceHours, $planHours);

                        $rec->save();
                    }
                }
            }

            // Update cost rows
            foreach ($costRecords as $row) {
                if (isset($row['id'])) {
                    $cRec = LineCostRecord::find($row['id']);
                    if ($cRec) {
                        $cRec->total_profit_loss = (float) ($row['total_profit_loss'] ?? $cRec->total_profit_loss);
                        $cRec->idle_hour_loss = (float) ($row['idle_hour_loss'] ?? $cRec->idle_hour_loss);
                        $cRec->save();
                    }
                }
            }

            // Update quality rows
            foreach ($qualityRecords as $row) {
                if (isset($row['id'])) {
                    $qRec = QualityRecord::find($row['id']);
                    if ($qRec) {
                        $checked = (int) ($row['checked_units'] ?? $qRec->checked_units);
                        $defects = (int) ($row['defect_units'] ?? $qRec->defect_units);
                        $qRec->checked_units = $checked;
                        $qRec->defect_units = $defects;
                        $qRec->dhu = $this->calcEngine->calculateDHU($defects, $checked);
                        $qRec->save();
                    }
                }
            }

            // Update specialized rows
            foreach ($specializedRecords as $row) {
                if (isset($row['id'])) {
                    $sRec = SpecializedRecord::find($row['id']);
                    if ($sRec) {
                        $actual = (float) ($row['actual_value'] ?? $sRec->actual_value);
                        $target = (float) ($row['target_value'] ?? $sRec->target_value);
                        $sRec->actual_value = $actual;
                        $sRec->target_value = $target;
                        $sRec->achievement_pct = $target > 0 ? round(($actual / $target) * 100, 2) : 0;
                        $sRec->save();
                    }
                }
            }

            $submission->touch();
        });

        return response()->json([
            'message' => 'Records updated successfully',
            'submission' => $this->show($id)->getData(),
        ]);
    }
}
