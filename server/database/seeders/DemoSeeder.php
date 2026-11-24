<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\KpiGoal;
use App\Models\Line;
use App\Models\LineMetric;
use App\Models\LineStaff;
use App\Models\NptReason;
use App\Models\UnitMetric;
use App\Models\UnitPerson;
use App\Support\Settings;
use Illuminate\Database\Seeder;

/**
 * Neutral demo data so a fresh install shows how everything works.
 * Settings > "Start fresh" removes it.
 */
class DemoSeeder extends Seeder
{
    private int $seed = 7;

    private function rnd(float $min, float $max, int $dec = 2): float
    {
        $this->seed = ($this->seed * 1103515245 + 12345) % 2147483648;

        return round($min + ($this->seed / 2147483648) * ($max - $min), $dec);
    }

    public function run(int $year = 2026, int $lastMonth = 10): void
    {
        Settings::set('company_name', 'Your Company Ltd.');

        $goals = [
            'Sewing' => [
                ['Efficiency', '80%', 'IE Head, all PMs'], ['Productivity Achievement', '110%', 'IE Head, all PMs'],
                ['Line Cost Achievement', '100%', 'IE Head, all PMs'], ['DHU (Sewing)', 'Below 3%', 'Quality Head'],
                ['DHU (Finishing)', 'Below 2%', 'Quality Head'], ['On Time Delivery', '100%', 'All PMs'],
                ['Order to Ship', '102%', 'All PMs'], ['Cut to Ship', '100%', 'All PMs'],
                ['Absenteeism', 'Below 3%', 'HR'], ['NPT (Man Hours)', '0%', 'IE Head'],
            ],
            'Cutting & Print' => [
                ['Efficiency', '85%', 'IE Head'], ['Productivity Achievement', '100%', 'Cutting Head'],
                ['Cut Panel Rejection', 'Below 1.0%', 'Quality Head'], ['DHU', 'Below 0.5%', 'Quality Head'],
                ['On Time Input Delivery', '100%', 'All PMs'], ['Absenteeism', 'Below 3%', 'HR'],
            ],
        ];
        $i = 0;
        foreach ($goals as $group => $rows) {
            foreach ($rows as [$cat, $target, $resp]) {
                KpiGoal::create(['group_name' => $group, 'category' => $cat, 'target' => $target, 'responsible' => $resp, 'sort_order' => $i++]);
            }
        }

        $names = ['Rahim', 'Karim', 'Nadia', 'Sumon', 'Farhana', 'Jamal', 'Ruma', 'Tanvir', 'Sabina', 'Hasan',
            'Mitu', 'Rakib', 'Shila', 'Arif', 'Lima', 'Babul', 'Shapla', 'Masud', 'Rina', 'Kamal'];
        $roles = ['IE', 'SUP', 'SUP', 'LC', 'APM', 'QC'];

        $lineDepts = [['Knit-01', 'Knit-01 Department', 'PM-Rahman', 6], ['Knit-02', 'Knit-02 Department', 'PM-Hossain', 6], ['Woven', 'Woven Department', 'PM-Alam', 4]];
        foreach ($lineDepts as $d => [$code, $name, $head, $count]) {
            $dept = Department::create(['code' => $code, 'name' => $name, 'kind' => 'lines', 'head_label' => $head, 'goal_group' => 'Sewing', 'sort_order' => $d + 1]);
            for ($n = 1; $n <= $count; $n++) {
                $line = Line::create(['department_id' => $dept->id, 'number' => $n, 'sort_order' => $n]);
                foreach ($roles as $p => $role) {
                    $vacant = ($n + $p) % 7 === 0;
                    LineStaff::create([
                        'line_id' => $line->id, 'position' => $p + 1, 'role' => $role,
                        'name' => $vacant ? '' : $names[($n * 3 + $p + $d * 5) % count($names)], 'is_vacant' => $vacant,
                    ]);
                }
                LineMetric::create([
                    'line_id' => $line->id, 'year' => $year - 1, 'month' => 0,
                    'eff_target' => 75, 'eff_ach' => $this->rnd(65, 80), 'prod_target' => 102, 'prod_ach' => $this->rnd(95, 103),
                    'sew_dhu_target' => 3, 'sew_dhu' => $this->rnd(3.2, 5.2), 'fin_dhu_target' => 2, 'fin_dhu' => $this->rnd(1.8, 4),
                ]);
                for ($m = 1; $m <= $lastMonth; $m++) {
                    $hasCost = $m >= 7;
                    $profit = $hasCost ? $this->rnd(-6000, 6000, 0) : null;
                    $idle = $hasCost ? -$this->rnd(100, 5000, 0) : null;
                    LineMetric::create([
                        'line_id' => $line->id, 'year' => $year, 'month' => $m,
                        'eff_target' => 80, 'eff_ach' => $this->rnd(74, 92),
                        'prod_target' => $m >= 7 ? 110 : 102, 'prod_ach' => $this->rnd(92, 110),
                        'profit_loss' => $profit, 'idle_loss' => $idle, 'cost_diff' => $hasCost ? $profit + $idle : null,
                        'sew_dhu_target' => 3, 'sew_dhu' => $this->rnd(2.1, 4.6),
                        'fin_dhu_target' => 2, 'fin_dhu' => $this->rnd(1.1, 2.6),
                    ]);
                }
            }
            foreach ([['Machine breakdown (Maintenance)', 40], ['Fabric delay (Fabric Team)', 380], ['Cut panel checking delay (Cutting Quality)', 220], ['Training / Meeting (HR)', 120]] as $k => [$reason, $hours]) {
                NptReason::create(['department_id' => $dept->id, 'year' => $year, 'month' => $lastMonth, 'reason' => $reason, 'hours' => $hours + $d * 30, 'sort_order' => $k]);
            }
        }

        $units = [['Cutting', 'Cutting Section', 'AGM-Jahid', ['Sup-Salam', 'Sup-Sumon']], ['Printing', 'Printing Section', 'Manager-Azad', []]];
        foreach ($units as $u => [$code, $name, $head, $people]) {
            $dept = Department::create(['code' => $code, 'name' => $name, 'kind' => 'unit', 'head_label' => $head, 'goal_group' => 'Cutting & Print', 'sort_order' => 10 + $u]);
            $ids = [0];
            foreach ($people as $k => $label) {
                $ids[] = UnitPerson::create(['department_id' => $dept->id, 'label' => $label, 'sort_order' => $k])->id;
            }
            foreach ($ids as $pid) {
                $scale = $pid === 0 ? 1 : 0.4;
                UnitMetric::create(['department_id' => $dept->id, 'unit_person_id' => $pid, 'year' => $year - 1, 'month' => 0,
                    'plan' => round(800000 * $scale), 'produce' => round(780000 * $scale), 'eff_target' => 82, 'eff_ach' => $this->rnd(70, 80),
                    'dhu_target' => 0.5, 'dhu' => $this->rnd(0.2, 0.7)]);
                for ($m = 1; $m <= $lastMonth; $m++) {
                    $plan = round($this->rnd(600000, 900000, 0) * $scale);
                    UnitMetric::create(['department_id' => $dept->id, 'unit_person_id' => $pid, 'year' => $year, 'month' => $m,
                        'plan' => $plan, 'produce' => round($plan * $this->rnd(0.94, 1.03)), 'eff_target' => 85, 'eff_ach' => $this->rnd(76, 90),
                        'earning_target' => $u === 1 && $pid === 0 ? 65000 : null, 'earning' => $u === 1 && $pid === 0 ? $this->rnd(55000, 72000, 0) : null,
                        'dhu_target' => 0.5, 'dhu' => $this->rnd(0.15, 0.65)]);
                }
            }
        }
    }
}
