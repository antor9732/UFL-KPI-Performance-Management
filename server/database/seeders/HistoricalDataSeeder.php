<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HistoricalDataSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('data/historical_2026_oct.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("Historical JSON file not found at $jsonPath");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        $periods = DB::table('reporting_periods')->where('year', 2026)->get()->keyBy('month');
        $knit01Dept = DB::table('departments')->where('code', 'KNIT-01')->first();
        $cuttingDept = DB::table('departments')->where('code', 'CUTTING')->first();
        $printingDept = DB::table('departments')->where('code', 'PRINTING')->first();

        $monthMap = [
            'January' => 1, 'February' => 2, 'March' => 3, 'April' => 4,
            'May' => 5, 'June' => 6, 'July' => 7, 'August' => 8,
            'September' => 9, 'October' => 10,
        ];

        // 1. Knit-01 Monthly Summary Records
        if (!empty($data['knit01_summary']) && $knit01Dept) {
            foreach ($data['knit01_summary'] as $item) {
                $row = $item['data'];
                $monthName = trim($row['C'] ?? '');
                if (!isset($monthMap[$monthName])) {
                    continue;
                }
                $mNum = $monthMap[$monthName];
                $period = $periods->get($mNum);
                if (!$period) {
                    continue;
                }

                $subId = (string) Str::uuid();
                DB::table('kpi_submissions')->updateOrInsert(
                    ['reporting_period_id' => $period->id, 'department_id' => $knit01Dept->id, 'version' => 1],
                    [
                        'id' => $subId,
                        'reporting_period_id' => $period->id,
                        'department_id' => $knit01Dept->id,
                        'status' => 'approved',
                        'submission_notes' => "Auto-imported historical baseline from reference report ($monthName 2026)",
                        'approved_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                // Re-fetch submission ID if existing
                $existingSub = DB::table('kpi_submissions')
                    ->where('reporting_period_id', $period->id)
                    ->where('department_id', $knit01Dept->id)
                    ->first();
                $finalSubId = $existingSub->id;

                // Production record
                $planHours = (float) ($row['D'] ?? 0);
                $produceHours = (float) ($row['E'] ?? 0);
                $planPcs = (int) ($row['G'] ?? 0);
                $producePcs = (int) ($row['H'] ?? 0);

                DB::table('production_records')->updateOrInsert(
                    ['submission_id' => $finalSubId, 'month_name' => $monthName],
                    [
                        'id' => (string) Str::uuid(),
                        'submission_id' => $finalSubId,
                        'month_name' => $monthName,
                        'plan_hours' => $planHours,
                        'produce_hours' => $produceHours,
                        'hour_ach_pct' => $planHours > 0 ? round(($produceHours / $planHours) * 100, 2) : 0,
                        'plan_pcs' => $planPcs,
                        'produce_pcs' => $producePcs,
                        'pcs_ach_pct' => $planPcs > 0 ? round(($producePcs / $planPcs) * 100, 2) : 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                // Line Cost record
                $profitLoss = (float) ($row['J'] ?? 0);
                $idleLoss = (float) ($row['K'] ?? 0);
                DB::table('line_cost_records')->updateOrInsert(
                    ['submission_id' => $finalSubId, 'month_name' => $monthName],
                    [
                        'id' => (string) Str::uuid(),
                        'submission_id' => $finalSubId,
                        'month_name' => $monthName,
                        'total_profit_loss' => $profitLoss,
                        'idle_hour_loss' => $idleLoss,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // 2. Cutting Section Summary
        if (!empty($data['cutting_summary']) && $cuttingDept) {
            foreach ($data['cutting_summary'] as $item) {
                $row = $item['data'];
                $monthName = trim($row['C'] ?? '');
                if (!isset($monthMap[$monthName])) {
                    continue;
                }
                $mNum = $monthMap[$monthName];
                $period = $periods->get($mNum);
                if (!$period) {
                    continue;
                }

                $subId = (string) Str::uuid();
                DB::table('kpi_submissions')->updateOrInsert(
                    ['reporting_period_id' => $period->id, 'department_id' => $cuttingDept->id, 'version' => 1],
                    [
                        'id' => $subId,
                        'reporting_period_id' => $period->id,
                        'department_id' => $cuttingDept->id,
                        'status' => 'approved',
                        'submission_notes' => "Historical Cutting KPI import ($monthName 2026)",
                        'approved_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                $existingSub = DB::table('kpi_submissions')
                    ->where('reporting_period_id', $period->id)
                    ->where('department_id', $cuttingDept->id)
                    ->first();

                $targetEff = (float) ($row['D'] ?? 0) * 100;
                $achEff = (float) ($row['E'] ?? 0) * 100;
                $knitPlan = (int) ($row['F'] ?? 0);
                $knitProduce = (int) ($row['G'] ?? 0);
                $cutToIssue = (float) ($row['J'] ?? 0) * 100;

                DB::table('specialized_records')->updateOrInsert(
                    ['submission_id' => $existingSub->id, 'metric_name' => 'Cutting Efficiency'],
                    [
                        'id' => (string) Str::uuid(),
                        'submission_id' => $existingSub->id,
                        'department_type' => 'cutting',
                        'month_name' => $monthName,
                        'metric_name' => 'Cutting Efficiency',
                        'target_value' => $targetEff,
                        'actual_value' => $achEff,
                        'achievement_pct' => $targetEff > 0 ? round(($achEff / $targetEff) * 100, 2) : 0,
                        'details' => json_encode([
                            'knit_plan' => $knitPlan,
                            'knit_produce' => $knitProduce,
                            'cut_to_issue_pct' => $cutToIssue,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // 3. Printing Section Summary
        if (!empty($data['print_summary']) && $printingDept) {
            foreach ($data['print_summary'] as $item) {
                $row = $item['data'];
                $monthName = trim($row['C'] ?? '');
                if (!isset($monthMap[$monthName])) {
                    continue;
                }
                $mNum = $monthMap[$monthName];
                $period = $periods->get($mNum);
                if (!$period) {
                    continue;
                }

                $subId = (string) Str::uuid();
                DB::table('kpi_submissions')->updateOrInsert(
                    ['reporting_period_id' => $period->id, 'department_id' => $printingDept->id, 'version' => 1],
                    [
                        'id' => $subId,
                        'reporting_period_id' => $period->id,
                        'department_id' => $printingDept->id,
                        'status' => 'approved',
                        'submission_notes' => "Historical Printing KPI import ($monthName 2026)",
                        'approved_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                $existingSub = DB::table('kpi_submissions')
                    ->where('reporting_period_id', $period->id)
                    ->where('department_id', $printingDept->id)
                    ->first();

                $planPcs = (int) ($row['D'] ?? 0);
                $producePcs = (int) ($row['E'] ?? 0);
                $eff = (float) ($row['G'] ?? 0) * 100;
                $targetEarnings = (float) ($row['H'] ?? 0);
                $produceEarnings = (float) ($row['I'] ?? 0);

                DB::table('specialized_records')->updateOrInsert(
                    ['submission_id' => $existingSub->id, 'metric_name' => 'Print Productivity'],
                    [
                        'id' => (string) Str::uuid(),
                        'submission_id' => $existingSub->id,
                        'department_type' => 'printing',
                        'month_name' => $monthName,
                        'metric_name' => 'Print Productivity',
                        'target_value' => $targetEarnings,
                        'actual_value' => $produceEarnings,
                        'achievement_pct' => $targetEarnings > 0 ? round(($produceEarnings / $targetEarnings) * 100, 2) : 0,
                        'details' => json_encode([
                            'plan_pcs' => $planPcs,
                            'produce_pcs' => $producePcs,
                            'efficiency_pct' => $eff,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
