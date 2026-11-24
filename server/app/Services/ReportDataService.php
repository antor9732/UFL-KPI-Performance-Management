<?php

namespace App\Services;

use App\Models\Department;
use App\Models\KpiGoal;
use App\Models\Line;
use App\Models\LineMetric;
use App\Models\NptReason;
use App\Models\UnitMetric;
use App\Support\Months;
use App\Support\Photos;
use App\Support\Settings;
use Illuminate\Support\Collection;

/**
 * Builds everything the presentation (and dashboards) need for one month:
 * year-to-date rows per line, department cost summary, NPT, units, goals.
 */
class ReportDataService
{
    public function payload(int $year, int $month, ?int $departmentId = null): array
    {
        $departments = Department::where('is_active', true)
            ->when($departmentId, fn ($q) => $q->where('id', $departmentId))
            ->orderBy('sort_order')->orderBy('id')
            ->with(['lines' => fn ($q) => $q->where('is_active', true), 'lines.staff', 'unitPeople'])
            ->get();

        $goalGroups = KpiGoal::orderBy('sort_order')->orderBy('id')->get()->groupBy('group_name');

        $depts = [];
        foreach ($departments as $dept) {
            $depts[] = $dept->isLines()
                ? $this->lineDepartment($dept, $year, $month)
                : $this->unitDepartment($dept, $year, $month);
        }

        $goals = [];
        foreach ($goalGroups as $group => $rows) {
            $goals[] = [
                'group' => $group,
                'rows' => $rows->map(fn ($g) => [
                    'category' => $g->category, 'target' => $g->target, 'responsible' => $g->responsible,
                ])->values()->all(),
            ];
        }

        return [
            'company_name' => Settings::get('company_name'),
            'report_title' => Settings::get('report_title'),
            'cover_quote' => Settings::get('cover_quote'),
            'cover_quote_2' => Settings::get('cover_quote_2'),
            'cover_tagline' => Settings::get('cover_tagline'),
            'currency' => Settings::get('currency_symbol', '$'),
            'logo' => Photos::absolute(Settings::get('logo')),
            'period' => [
                'year' => $year, 'month' => $month,
                'month_name' => Months::name($month),
                'name' => Months::name($month).' '.$year,
                'prev_year' => $year - 1,
            ],
            'goals' => $goals,
            'departments' => $depts,
        ];
    }

    /** Row labels for a year-to-date table: previous-year average + Jan..month. */
    public function rowKeys(int $year, int $month): array
    {
        $keys = [['year' => $year - 1, 'month' => 0, 'label' => ($year - 1).' Average', 'is_avg' => true]];
        for ($m = 1; $m <= $month; $m++) {
            $keys[] = ['year' => $year, 'month' => $m, 'label' => Months::name($m), 'is_avg' => false];
        }

        return $keys;
    }

    public function lineDepartment(Department $dept, int $year, int $month): array
    {
        $lineIds = $dept->lines->pluck('id');
        $metrics = LineMetric::whereIn('line_id', $lineIds)
            ->where(fn ($q) => $q->where('year', $year)->where('month', '<=', $month)
                ->orWhere('year', $year - 1))
            ->get()
            ->groupBy('line_id');

        $lines = [];
        foreach ($dept->lines as $line) {
            $lines[] = $this->lineBlock($line, $metrics->get($line->id, collect()), $year, $month);
        }

        // Department cost summary (slide "Line wise Cost Achievement")
        $prodRows = [];
        $prodRows[] = ['label' => 'Target', 'values' => array_map(fn ($l) => $l['latest_target']['prod_target'], $lines)];
        $prodRows[] = ['label' => ($year - 1).' Average', 'values' => array_map(fn ($l) => $l['prev_avg']['prod_ach'], $lines)];
        $prodRows[] = ['label' => $year.' Average', 'values' => array_map(fn ($l) => $l['ytd']['prod_ach'], $lines)];
        for ($m = 1; $m <= $month; $m++) {
            $prodRows[] = ['label' => Months::name($m), 'values' => array_map(fn ($l) => $l['by_month'][$m]['prod_ach'] ?? null, $lines)];
        }
        foreach ($prodRows as &$r) {
            $r['avg'] = $this->avg($r['values']);
        }
        unset($r);

        $costRows = [];
        $costRows[] = ['label' => $year.' Total', 'values' => array_map(fn ($l) => $l['ytd']['cost_total'], $lines)];
        for ($m = 1; $m <= $month; $m++) {
            $vals = array_map(fn ($l) => $l['by_month'][$m]['cost_diff'] ?? null, $lines);
            if (count(array_filter($vals, fn ($v) => $v !== null)) > 0) {
                $costRows[] = ['label' => Months::name($m), 'values' => $vals];
            }
        }
        foreach ($costRows as &$r) {
            $r['total'] = $this->sum($r['values']);
        }
        unset($r);

        $npt = NptReason::where('department_id', $dept->id)->where('year', $year)->where('month', $month)
            ->orderBy('sort_order')->orderBy('id')->get(['reason', 'hours'])->toArray();

        return [
            'id' => $dept->id,
            'kind' => 'lines',
            'code' => $dept->code,
            'name' => $dept->name,
            'goal_group' => $dept->goal_group,
            'head_label' => $dept->head_label,
            'head_photo' => Photos::absolute($dept->head_photo),
            'lines' => $lines,
            'line_labels' => array_map(fn ($l) => 'Line-'.$l['number'], $lines),
            'cost_total' => $this->sum(array_map(fn ($l) => $l['ytd']['cost_total'], $lines)),
            'prod_rows' => $prodRows,
            'cost_rows' => $costRows,
            'npt' => ['reasons' => $npt, 'total' => array_sum(array_column($npt, 'hours'))],
            'summary' => [
                'eff_ach' => $this->avg(array_map(fn ($l) => $l['current']['eff_ach'], $lines)),
                'prod_ach' => $this->avg(array_map(fn ($l) => $l['current']['prod_ach'], $lines)),
                'sew_dhu' => $this->avg(array_map(fn ($l) => $l['current']['sew_dhu'], $lines)),
                'fin_dhu' => $this->avg(array_map(fn ($l) => $l['current']['fin_dhu'], $lines)),
                'cost_month' => $this->sum(array_map(fn ($l) => $l['current']['cost_diff'], $lines)),
            ],
        ];
    }

    private function lineBlock(Line $line, Collection $metrics, int $year, int $month): array
    {
        $byKey = $metrics->keyBy(fn ($m) => $m->year.'-'.$m->month);
        $rows = [];
        $byMonth = [];
        foreach ($this->rowKeys($year, $month) as $key) {
            $m = $byKey->get($key['year'].'-'.$key['month']);
            if (!$m && $key['is_avg']) {
                $m = $this->averageOf($metrics->where('year', $year - 1)->where('month', '>', 0));
            }
            $values = [];
            foreach (LineMetric::FIELDS as $f) {
                $values[$f] = $m ? ($m instanceof LineMetric ? $m->{$f} : ($m[$f] ?? null)) : null;
            }
            $rows[] = ['label' => $key['label'], 'is_avg' => $key['is_avg']] + $values;
            if (!$key['is_avg']) {
                $byMonth[$key['month']] = $values;
            }
        }

        $ytd = collect($byMonth);
        $latestTarget = [];
        foreach (LineMetric::TARGET_FIELDS as $f) {
            $latestTarget[$f] = $ytd->pluck($f)->filter(fn ($v) => $v !== null)->last();
        }
        $current = $byMonth[$month] ?? array_fill_keys(LineMetric::FIELDS, null);
        $staff = [];
        foreach ($line->staff as $s) {
            $staff[] = [
                'position' => $s->position, 'role' => $s->role, 'name' => $s->name,
                'label' => $s->label(), 'vacant' => (bool) $s->is_vacant || (!$s->photo && !$s->name),
                'photo' => $s->is_vacant ? null : Photos::absolute($s->photo),
            ];
        }

        return [
            'id' => $line->id,
            'number' => $line->number,
            'label' => $line->label(),
            'staff' => $staff,
            'rows' => $rows,
            'by_month' => $byMonth,
            'current' => $current,
            'latest_target' => $latestTarget,
            'prev_avg' => $rows[0],
            'ytd' => [
                'cost_total' => $this->sum($ytd->pluck('cost_diff')->all()),
                'sew_dhu' => $this->avg($ytd->pluck('sew_dhu')->all()),
                'fin_dhu' => $this->avg($ytd->pluck('fin_dhu')->all()),
                'eff_ach' => $this->avg($ytd->pluck('eff_ach')->all()),
                'prod_ach' => $this->avg($ytd->pluck('prod_ach')->all()),
            ],
        ];
    }

    public function unitDepartment(Department $dept, int $year, int $month): array
    {
        $metrics = UnitMetric::where('department_id', $dept->id)
            ->where(fn ($q) => $q->where('year', $year)->where('month', '<=', $month)->orWhere('year', $year - 1))
            ->get()->groupBy('unit_person_id');

        $block = function (Collection $rows) use ($year, $month) {
            $byKey = $rows->keyBy(fn ($m) => $m->year.'-'.$m->month);
            $out = [];
            foreach ($this->rowKeys($year, $month) as $key) {
                $m = $byKey->get($key['year'].'-'.$key['month']);
                if (!$m && $key['is_avg']) {
                    $m = $this->averageOf($rows->where('year', $year - 1)->where('month', '>', 0), UnitMetric::FIELDS);
                }
                $v = [];
                foreach (UnitMetric::FIELDS as $f) {
                    $v[$f] = $m ? ($m instanceof UnitMetric ? $m->{$f} : ($m[$f] ?? null)) : null;
                }
                $v['prod_ach'] = ($v['plan'] ?? 0) > 0 && $v['produce'] !== null ? round($v['produce'] / $v['plan'] * 100, 2) : null;
                $v['earning_ach'] = ($v['earning_target'] ?? 0) > 0 && $v['earning'] !== null ? round($v['earning'] / $v['earning_target'] * 100, 2) : null;
                $out[] = ['label' => $key['label'], 'is_avg' => $key['is_avg']] + $v;
            }

            return $out;
        };

        $people = [];
        foreach ($dept->unitPeople as $p) {
            $people[] = [
                'id' => $p->id, 'label' => $p->label, 'photo' => Photos::absolute($p->photo),
                'rows' => $block($metrics->get($p->id, collect())),
            ];
        }
        $overall = $block($metrics->get(0, collect()));
        $current = collect($overall)->last();

        return [
            'id' => $dept->id,
            'kind' => 'unit',
            'code' => $dept->code,
            'name' => $dept->name,
            'goal_group' => $dept->goal_group,
            'head_label' => $dept->head_label,
            'head_photo' => Photos::absolute($dept->head_photo),
            'rows' => $overall,
            'people' => $people,
            'npt' => ['reasons' => [], 'total' => 0],
            'summary' => [
                'eff_ach' => $current['eff_ach'] ?? null,
                'prod_ach' => $current['prod_ach'] ?? null,
                'dhu' => $current['dhu'] ?? null,
                'ytd_eff' => $this->avg(array_column(array_slice($overall, 1), 'eff_ach')),
            ],
        ];
    }

    private function averageOf(Collection $rows, array $fields = LineMetric::FIELDS): ?array
    {
        if ($rows->isEmpty()) {
            return null;
        }
        $out = [];
        foreach ($fields as $f) {
            $out[$f] = $this->avg($rows->pluck($f)->all());
        }

        return $out;
    }

    public function avg(array $values): ?float
    {
        $v = array_values(array_filter($values, fn ($x) => $x !== null && $x !== ''));

        return $v ? round(array_sum($v) / count($v), 2) : null;
    }

    public function sum(array $values): ?float
    {
        $v = array_values(array_filter($values, fn ($x) => $x !== null && $x !== ''));

        return $v ? round(array_sum($v), 2) : null;
    }
}
