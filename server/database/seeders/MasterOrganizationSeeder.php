<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MasterOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roles = [
            ['id' => 1, 'slug' => 'super_admin', 'name' => 'Super Admin', 'description' => 'Full system configuration, backup, restore, and user management.'],
            ['id' => 2, 'slug' => 'management', 'name' => 'Management / Director', 'description' => 'Company-wide executive dashboards, reports, and final submission approvals.'],
            ['id' => 3, 'slug' => 'dept_head', 'name' => 'Department Head', 'description' => 'Reviews and submits monthly departmental KPI packages.'],
            ['id' => 4, 'slug' => 'pm', 'name' => 'Production Manager', 'description' => 'Oversees line operational metrics, output, and floor targets.'],
            ['id' => 5, 'slug' => 'ie', 'name' => 'Industrial Engineering (IE)', 'description' => 'Manages SMV, earned minutes, efficiency, and costing formulas.'],
            ['id' => 6, 'slug' => 'quality_mgr', 'name' => 'Quality Manager', 'description' => 'DHU, defect breakdowns, and factory quality metrics.'],
            ['id' => 7, 'slug' => 'hr', 'name' => 'HR Manager', 'description' => 'Manpower, attendance, absenteeism, and operator migration records.'],
            ['id' => 8, 'slug' => 'shipment_team', 'name' => 'Shipment & Commercial Team', 'description' => 'Buyer order quantities, cut-to-ship ratios, and leftover records.'],
            ['id' => 9, 'slug' => 'supervisor', 'name' => 'Floor Supervisor', 'description' => 'Daily line entry for assigned production lines.'],
            ['id' => 10, 'slug' => 'viewer', 'name' => 'Read-Only Viewer', 'description' => 'View authorized dashboards and reports.'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(['slug' => $role['slug']], $role);
        }

        // 2. Departments
        $departments = [
            ['id' => (string) Str::uuid(), 'code' => 'KNIT-01', 'name' => 'Knit-01 Department', 'department_type' => 'production', 'head_name' => 'PM-Hafizur Rahman', 'sort_order' => 1],
            ['id' => (string) Str::uuid(), 'code' => 'KNIT-02', 'name' => 'Knit-02 Department', 'department_type' => 'production', 'head_name' => 'FM-Mohibul Islam / IE-Touhid', 'sort_order' => 2],
            ['id' => (string) Str::uuid(), 'code' => 'KNIT-03', 'name' => 'Knit-03 Department', 'department_type' => 'production', 'head_name' => 'AGM-Rafiq / IEM-Rakib', 'sort_order' => 3],
            ['id' => (string) Str::uuid(), 'code' => 'WOVEN', 'name' => 'Woven Department', 'department_type' => 'production', 'head_name' => 'PM-Mr. Suhag / IEM-Habib', 'sort_order' => 4],
            ['id' => (string) Str::uuid(), 'code' => 'CUTTING', 'name' => 'Cutting Section', 'department_type' => 'cutting', 'head_name' => 'AGM-Mr. Jahangir', 'sort_order' => 5],
            ['id' => (string) Str::uuid(), 'code' => 'PRINTING', 'name' => 'Printing Section', 'department_type' => 'printing', 'head_name' => 'AGM-Mr. Azam', 'sort_order' => 6],
            ['id' => (string) Str::uuid(), 'code' => 'EMBROIDERY', 'name' => 'Embroidery Section', 'department_type' => 'embroidery', 'head_name' => 'EMBM-Mr. Zulfiker', 'sort_order' => 7],
            ['id' => (string) Str::uuid(), 'code' => 'SCHIFFLI', 'name' => 'Schiffli Section', 'department_type' => 'schiffli', 'head_name' => 'SFM-Mr. Kamal', 'sort_order' => 8],
            ['id' => (string) Str::uuid(), 'code' => 'SAMPLE', 'name' => 'Sample Section', 'department_type' => 'sample', 'head_name' => 'AGM-Mr. Hafiz Al Asad', 'sort_order' => 9],
        ];

        $deptMap = [];
        foreach ($departments as $dept) {
            DB::table('departments')->updateOrInsert(['code' => $dept['code']], $dept);
            $existing = DB::table('departments')->where('code', $dept['code'])->first();
            $deptMap[$dept['code']] = $existing->id;
        }

        // 3. Lines
        // Knit-01: Lines 1-9
        for ($i = 1; $i <= 9; $i++) {
            $lineNum = sprintf('Line No %02d', $i);
            DB::table('production_lines')->updateOrInsert(
                ['department_id' => $deptMap['KNIT-01'], 'line_number' => $lineNum],
                [
                    'id' => (string) Str::uuid(),
                    'department_id' => $deptMap['KNIT-01'],
                    'line_number' => $lineNum,
                    'line_name' => "Knit-01 $lineNum",
                    'sort_order' => $i,
                    'is_active' => true,
                ]
            );
        }

        // Knit-02: Lines 1-18
        for ($i = 1; $i <= 18; $i++) {
            $lineNum = sprintf('Line No %02d', $i);
            DB::table('production_lines')->updateOrInsert(
                ['department_id' => $deptMap['KNIT-02'], 'line_number' => $lineNum],
                [
                    'id' => (string) Str::uuid(),
                    'department_id' => $deptMap['KNIT-02'],
                    'line_number' => $lineNum,
                    'line_name' => "Knit-02 $lineNum",
                    'sort_order' => $i,
                    'is_active' => true,
                ]
            );
        }

        // Knit-03: Lines 1-9
        for ($i = 1; $i <= 9; $i++) {
            $lineNum = sprintf('Line No %02d', $i);
            DB::table('production_lines')->updateOrInsert(
                ['department_id' => $deptMap['KNIT-03'], 'line_number' => $lineNum],
                [
                    'id' => (string) Str::uuid(),
                    'department_id' => $deptMap['KNIT-03'],
                    'line_number' => $lineNum,
                    'line_name' => "Knit-03 $lineNum",
                    'sort_order' => $i,
                    'is_active' => true,
                ]
            );
        }

        // Woven: Lines 1-9
        for ($i = 1; $i <= 9; $i++) {
            $lineNum = sprintf('Line No %02d', $i);
            DB::table('production_lines')->updateOrInsert(
                ['department_id' => $deptMap['WOVEN'], 'line_number' => $lineNum],
                [
                    'id' => (string) Str::uuid(),
                    'department_id' => $deptMap['WOVEN'],
                    'line_number' => $lineNum,
                    'line_name' => "Woven $lineNum",
                    'sort_order' => $i,
                    'is_active' => true,
                ]
            );
        }

        // 4. KPI Definitions
        $kpiDefs = [
            ['code' => 'PLAN_ACH', 'name' => 'Plan Achievement', 'category' => 'production', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Actual Output / Planned Output) * 100'],
            ['code' => 'EFF', 'name' => 'Sewing Efficiency', 'category' => 'production', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Earned Minutes / Available Minutes) * 100'],
            ['code' => 'DHU', 'name' => 'Defects per Hundred Units (DHU)', 'category' => 'quality', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'lower_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Defect Count / Checked Units) * 100'],
            ['code' => 'LINE_COST_ACH', 'name' => 'Line Cost Achievement', 'category' => 'cost', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Budgeted Cost / Actual Cost) * 100'],
            ['code' => 'COST_PROD', 'name' => 'Costing Productivity', 'category' => 'cost', 'unit' => 'ratio', 'precision_decimals' => 4, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => 'Earned Value / Direct Cost'],
            ['code' => 'NPT_HOURS', 'name' => 'Non-Productive Time (NPT)', 'category' => 'npt', 'unit' => 'hours', 'precision_decimals' => 2, 'performance_direction' => 'lower_is_better', 'aggregation_type' => 'sum', 'formula_expression' => 'Sum of recorded non-productive lost hours'],
            ['code' => 'ABS', 'name' => 'Absenteeism Rate', 'category' => 'hr', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'lower_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Absent Manpower / Total Manpower) * 100'],
            ['code' => 'CUT_TO_SHIP', 'name' => 'Cut-to-Ship Ratio', 'category' => 'shipment', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Shipment Qty / Cutting Qty) * 100'],
            ['code' => 'ORDER_TO_SHIP', 'name' => 'Order-to-Ship Ratio', 'category' => 'shipment', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(Shipment Qty / Order Qty) * 100'],
            ['code' => 'SHORT_SHIP', 'name' => 'Short Shipment Quantity', 'category' => 'shipment', 'unit' => 'units', 'precision_decimals' => 0, 'performance_direction' => 'lower_is_better', 'aggregation_type' => 'sum', 'formula_expression' => 'Max(0, Order Qty - Shipment Qty)'],
            ['code' => 'LEFTOVER', 'name' => 'Leftover Quantity', 'category' => 'shipment', 'unit' => 'units', 'precision_decimals' => 0, 'performance_direction' => 'lower_is_better', 'aggregation_type' => 'sum', 'formula_expression' => 'Physical leftover count in finished warehouse'],
            ['code' => 'CUTTING_EFF', 'name' => 'Cutting Efficiency', 'category' => 'cutting', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => 'Actual cut output / Standard planned output'],
            ['code' => 'PRINT_EARNINGS', 'name' => 'Print Section Daily Earnings', 'category' => 'printing', 'unit' => 'USD', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'sum', 'formula_expression' => 'Actual production value against $2500/day target'],
            ['code' => 'SAMPLE_RFT', 'name' => 'Sample Right-First-Time (RFT)', 'category' => 'sample', 'unit' => '%', 'precision_decimals' => 2, 'performance_direction' => 'higher_is_better', 'aggregation_type' => 'weighted_sum', 'formula_expression' => '(First-Pass Approved Samples / Total Samples Submitted) * 100'],
        ];

        foreach ($kpiDefs as $kpi) {
            DB::table('kpi_definitions')->updateOrInsert(['code' => $kpi['code']], array_merge($kpi, [
                'id' => (string) Str::uuid(),
                'is_active' => true,
            ]));
        }

        // 5. Initial Backup Settings
        DB::table('backup_settings')->updateOrInsert(
            ['id' => 1],
            [
                'auto_backup_enabled' => true,
                'cron_schedule' => '0 2 * * *',
                'timezone' => 'Asia/Dhaka',
                'retention_daily' => 7,
                'retention_weekly' => 4,
                'retention_monthly' => 12,
            ]
        );
    }
}
