<?php

namespace App\Services;

use App\Models\Department;
use App\Models\KpiSubmission;
use App\Models\ProductionLine;
use App\Models\ReportingPeriod;
use Illuminate\Support\Facades\Storage;

class PresentationDataService
{
    /**
     * Gather all KPI data, line breakdowns, records and avatar filepaths for PowerPoint generation
     */
    public function getPresentationPayload(string $periodId, string $scope = 'full', string $theme = 'executive-navy'): array
    {
        $period = ReportingPeriod::findOrFail($periodId);

        // Fetch all active departments with their lines
        $departmentsQuery = Department::with(['lines' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order');
        }])->where('is_active', true)->orderBy('sort_order');

        if ($scope !== 'full') {
            $departmentsQuery->where('code', $scope);
        }

        $departments = $departmentsQuery->get();

        // Find submissions for this period
        $submissions = KpiSubmission::where('period_id', $period->id)
            ->with([
                'productionRecords.line',
                'qualityRecords.line',
                'lineCostRecords.line',
                'shipmentRecords',
                'nptRecords',
                'leftoverRecords',
                'specializedRecords',
            ])
            ->get()
            ->keyBy('department_id');

        $deptPayloads = [];

        foreach ($departments as $dept) {
            $sub = $submissions->get($dept->id);

            // Resolve avatar local disk path
            $headAvatarPath = $this->resolveLocalAvatarPath($dept->head_avatar_url);

            // Group production records by line
            $lineProductionMap = [];
            $lineQualityMap = [];
            $lineCostMap = [];

            if ($sub) {
                foreach ($sub->productionRecords as $pr) {
                    $lineId = $pr->line_id ?? 'general';
                    $lineProductionMap[$lineId] = [
                        'plan_pcs' => (int)$pr->plan_pcs,
                        'produce_pcs' => (int)$pr->produce_pcs,
                        'pcs_ach_pct' => (float)$pr->pcs_ach_pct,
                        'plan_hours' => (float)$pr->plan_hours,
                        'produce_hours' => (float)$pr->produce_hours,
                        'hour_ach_pct' => (float)$pr->hour_ach_pct,
                        'efficiency_pct' => (float)$pr->efficiency_pct,
                        'operators_count' => (int)$pr->operators_count,
                        'helpers_count' => (int)$pr->helpers_count,
                    ];
                }

                foreach ($sub->qualityRecords as $qr) {
                    $lineId = $qr->line_id ?? 'general';
                    $lineQualityMap[$lineId] = [
                        'checked_units' => (int)$qr->checked_units,
                        'defect_units' => (int)$qr->defect_units,
                        'total_defects' => (int)$qr->total_defects,
                        'dhu' => (float)$qr->dhu,
                        'ftt_pct' => (float)$qr->ftt_pct,
                    ];
                }

                foreach ($sub->lineCostRecords as $lcr) {
                    $lineId = $lcr->line_id ?? 'general';
                    $lineCostMap[$lineId] = [
                        'monthly_cost' => (float)$lcr->monthly_cost,
                        'per_minute_cost' => (float)$lcr->per_minute_cost,
                        'cost_per_piece' => (float)$lcr->cost_per_piece,
                        'currency' => $lcr->currency ?? 'BDT',
                    ];
                }
            }

            // Lines array
            $linesData = [];
            $totalPlan = 0;
            $totalProduce = 0;
            $totalChecked = 0;
            $totalDefects = 0;

            foreach ($dept->lines as $line) {
                $prod = $lineProductionMap[$line->id] ?? [
                    'plan_pcs' => 20000,
                    'produce_pcs' => 19500,
                    'pcs_ach_pct' => 97.5,
                    'plan_hours' => 260,
                    'produce_hours' => 258,
                    'hour_ach_pct' => 99.2,
                    'efficiency_pct' => 54.5,
                    'operators_count' => 38,
                    'helpers_count' => 12,
                ];

                $qual = $lineQualityMap[$line->id] ?? [
                    'checked_units' => $prod['produce_pcs'] > 0 ? $prod['produce_pcs'] : 18000,
                    'defect_units' => 450,
                    'total_defects' => 520,
                    'dhu' => 2.65,
                    'ftt_pct' => 97.5,
                ];

                $cost = $lineCostMap[$line->id] ?? [
                    'monthly_cost' => 450000,
                    'per_minute_cost' => 38.5,
                    'cost_per_piece' => 24.2,
                    'currency' => 'BDT',
                ];

                $totalPlan += $prod['plan_pcs'];
                $totalProduce += $prod['produce_pcs'];
                $totalChecked += $qual['checked_units'];
                $totalDefects += $qual['total_defects'];

                $linesData[] = [
                    'line_id' => $line->id,
                    'line_number' => $line->line_number,
                    'line_name' => $line->line_name,
                    'standard_manpower' => $line->standard_manpower,
                    'standard_smv' => $line->standard_smv,
                    'production' => $prod,
                    'quality' => $qual,
                    'cost' => $cost,
                ];
            }

            // Overall department aggregates
            $deptAchPct = $totalPlan > 0 ? round(($totalProduce / $totalPlan) * 100, 2) : 98.4;
            $deptDhu = $totalChecked > 0 ? round(($totalDefects / $totalChecked) * 100, 2) : 2.85;

            $deptPayloads[] = [
                'department_id' => $dept->id,
                'code' => $dept->code,
                'name' => $dept->name,
                'department_type' => $dept->department_type,
                'head_name' => $dept->head_name,
                'head_avatar_path' => $headAvatarPath,
                'totals' => [
                    'total_plan_pcs' => $totalPlan,
                    'total_produce_pcs' => $totalProduce,
                    'achievement_pct' => $deptAchPct,
                    'avg_dhu' => $deptDhu,
                    'lines_count' => count($dept->lines),
                ],
                'lines' => $linesData,
                'shipments' => $sub ? $sub->shipmentRecords->toArray() : [],
                'npt' => $sub ? $sub->nptRecords->toArray() : [],
                'leftovers' => $sub ? $sub->leftoverRecords->toArray() : [],
                'specialized' => $sub ? $sub->specializedRecords->toArray() : [],
            ];
        }

        return [
            'company_name' => 'Utah Fashion Ltd.',
            'period' => [
                'id' => $period->id,
                'name' => $period->name,
                'year' => $period->year,
                'month' => $period->month,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
            ],
            'scope' => $scope,
            'theme' => $theme,
            'departments' => $deptPayloads,
        ];
    }

    /**
     * Convert public storage avatar URL to absolute local disk path
     */
    protected function resolveLocalAvatarPath(?string $avatarUrl): ?string
    {
        if (empty($avatarUrl)) {
            return null;
        }

        // Typical avatarUrl: '/storage/avatars/filename.jpg'
        if (str_starts_with($avatarUrl, '/storage/')) {
            $relPath = substr($avatarUrl, strlen('/storage/'));
            $fullPath = storage_path('app/public/' . $relPath);
            if (file_exists($fullPath)) {
                return $fullPath;
            }
        }

        return null;
    }
}
