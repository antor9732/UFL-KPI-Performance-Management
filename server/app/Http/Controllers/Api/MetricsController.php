<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\LineMetric;
use App\Models\NptReason;
use App\Models\UnitMetric;
use App\Support\Months;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Monthly data entry: line metrics grid, NPT reasons and unit metrics,
 * including "copy previous month" roll-forward.
 */
class MetricsController extends Controller
{
    private function period(Request $request): array
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:0|max:12',
        ]);

        return [(int) $data['year'], (int) $data['month']];
    }

    /** Distinct months that have data (newest first) — for period pickers. */
    public function periods(): JsonResponse
    {
        $rows = DB::table('line_metrics')->select('year', 'month')->where('month', '>', 0)
            ->union(DB::table('unit_metrics')->select('year', 'month')->where('month', '>', 0))
            ->get()->unique(fn ($r) => $r->year.'-'.$r->month)
            ->sortByDesc(fn ($r) => $r->year * 100 + $r->month)->values();

        return response()->json($rows->map(fn ($r) => [
            'year' => (int) $r->year, 'month' => (int) $r->month, 'name' => Months::name((int) $r->month).' '.$r->year,
        ]));
    }

    public function lineMetrics(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        [$py, $pm] = $month === 0 ? [$year - 1, 0] : Months::previous($year, $month);
        $lines = $department->lines()->get();
        $current = LineMetric::whereIn('line_id', $lines->pluck('id'))->where('year', $year)->where('month', $month)->get()->keyBy('line_id');
        $previous = LineMetric::whereIn('line_id', $lines->pluck('id'))->where('year', $py)->where('month', $pm)->get()->keyBy('line_id');

        return response()->json([
            'year' => $year, 'month' => $month,
            'previous' => ['year' => $py, 'month' => $pm],
            'has_previous' => $previous->isNotEmpty(),
            'rows' => $lines->map(function ($line) use ($current, $previous) {
                $row = ['line_id' => $line->id, 'number' => $line->number, 'label' => $line->label()];
                foreach (LineMetric::FIELDS as $f) {
                    $row[$f] = $current->get($line->id)?->{$f};
                }
                $row['previous'] = $previous->get($line->id)?->only(LineMetric::FIELDS);

                return $row;
            })->values(),
        ]);
    }

    public function saveLineMetrics(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        $rules = ['rows' => 'required|array', 'rows.*.line_id' => 'required|integer'];
        foreach (LineMetric::FIELDS as $f) {
            $rules["rows.*.$f"] = 'nullable|numeric';
        }
        $rows = $request->validate($rules)['rows'];
        $lineIds = $department->lines()->pluck('id')->all();

        DB::transaction(function () use ($rows, $lineIds, $year, $month) {
            foreach ($rows as $row) {
                if (!in_array((int) $row['line_id'], $lineIds, true)) {
                    continue;
                }
                $values = [];
                foreach (LineMetric::FIELDS as $f) {
                    $values[$f] = isset($row[$f]) && $row[$f] !== '' ? $row[$f] : null;
                }
                // Cost difference = profit/loss + idle loss when not typed in.
                if ($values['cost_diff'] === null && ($values['profit_loss'] !== null || $values['idle_loss'] !== null)) {
                    $values['cost_diff'] = (float) ($values['profit_loss'] ?? 0) + (float) ($values['idle_loss'] ?? 0);
                }
                LineMetric::updateOrCreate(
                    ['line_id' => (int) $row['line_id'], 'year' => $year, 'month' => $month],
                    $values
                );
            }
        });

        return $this->lineMetrics($department, $request);
    }

    /** Copy targets (or everything) from the previous month into empty cells of this month. */
    public function copyPrevious(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        abort_if($month === 0, 422, 'Pick a month');
        $mode = $request->input('mode', 'targets'); // targets | all
        [$py, $pm] = Months::previous($year, $month);
        $copied = 0;

        if ($department->isLines()) {
            $fields = $mode === 'all' ? LineMetric::FIELDS : LineMetric::TARGET_FIELDS;
            foreach ($department->lines()->get() as $line) {
                $prev = LineMetric::where(['line_id' => $line->id, 'year' => $py, 'month' => $pm])->first();
                if (!$prev) {
                    continue;
                }
                $cur = LineMetric::firstOrNew(['line_id' => $line->id, 'year' => $year, 'month' => $month]);
                foreach ($fields as $f) {
                    if ($cur->{$f} === null) {
                        $cur->{$f} = $prev->{$f};
                    }
                }
                $cur->save();
                $copied++;
            }
            $response = $this->lineMetrics($department, $request);
        } else {
            $fields = $mode === 'all' ? UnitMetric::FIELDS : UnitMetric::TARGET_FIELDS;
            foreach (UnitMetric::where(['department_id' => $department->id, 'year' => $py, 'month' => $pm])->get() as $prev) {
                $cur = UnitMetric::firstOrNew([
                    'department_id' => $department->id, 'unit_person_id' => $prev->unit_person_id, 'year' => $year, 'month' => $month,
                ]);
                foreach ($fields as $f) {
                    if ($cur->{$f} === null) {
                        $cur->{$f} = $prev->{$f};
                    }
                }
                $cur->save();
                $copied++;
            }
            $response = $this->unitMetrics($department, $request);
        }

        $data = $response->getData(true);
        $data['copied'] = $copied;

        return response()->json($data);
    }

    public function npt(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);

        return response()->json([
            'year' => $year, 'month' => $month,
            'reasons' => NptReason::where(['department_id' => $department->id, 'year' => $year, 'month' => $month])
                ->orderBy('sort_order')->orderBy('id')->get(['id', 'reason', 'hours']),
        ]);
    }

    public function saveNpt(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        $reasons = $request->validate([
            'reasons' => 'present|array',
            'reasons.*.reason' => 'required|string|max:255',
            'reasons.*.hours' => 'nullable|numeric|min:0',
        ])['reasons'];

        DB::transaction(function () use ($department, $year, $month, $reasons) {
            NptReason::where(['department_id' => $department->id, 'year' => $year, 'month' => $month])->delete();
            foreach (array_values($reasons) as $i => $r) {
                NptReason::create([
                    'department_id' => $department->id, 'year' => $year, 'month' => $month,
                    'reason' => $r['reason'], 'hours' => $r['hours'] ?? 0, 'sort_order' => $i,
                ]);
            }
        });

        return $this->npt($department, $request);
    }

    public function unitMetrics(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        [$py, $pm] = $month === 0 ? [$year - 1, 0] : Months::previous($year, $month);
        $people = collect([['id' => 0, 'label' => $department->name.' (overall)']])
            ->concat($department->unitPeople()->get()->map(fn ($p) => ['id' => $p->id, 'label' => $p->label]));
        $current = UnitMetric::where(['department_id' => $department->id, 'year' => $year, 'month' => $month])->get()->keyBy('unit_person_id');
        $previous = UnitMetric::where(['department_id' => $department->id, 'year' => $py, 'month' => $pm])->get()->keyBy('unit_person_id');

        return response()->json([
            'year' => $year, 'month' => $month,
            'previous' => ['year' => $py, 'month' => $pm],
            'has_previous' => $previous->isNotEmpty(),
            'rows' => $people->map(function ($p) use ($current, $previous) {
                $row = ['unit_person_id' => $p['id'], 'label' => $p['label']];
                foreach (UnitMetric::FIELDS as $f) {
                    $row[$f] = $current->get($p['id'])?->{$f};
                }
                $row['previous'] = $previous->get($p['id'])?->only(UnitMetric::FIELDS);

                return $row;
            })->values(),
        ]);
    }

    public function saveUnitMetrics(Department $department, Request $request): JsonResponse
    {
        [$year, $month] = $this->period($request);
        $rules = ['rows' => 'required|array', 'rows.*.unit_person_id' => 'required|integer|min:0'];
        foreach (UnitMetric::FIELDS as $f) {
            $rules["rows.*.$f"] = 'nullable|numeric';
        }
        $rows = $request->validate($rules)['rows'];
        $validPeople = array_merge([0], $department->unitPeople()->pluck('id')->all());

        DB::transaction(function () use ($rows, $validPeople, $department, $year, $month) {
            foreach ($rows as $row) {
                if (!in_array((int) $row['unit_person_id'], $validPeople, true)) {
                    continue;
                }
                $values = [];
                foreach (UnitMetric::FIELDS as $f) {
                    $values[$f] = isset($row[$f]) && $row[$f] !== '' ? $row[$f] : null;
                }
                UnitMetric::updateOrCreate([
                    'department_id' => $department->id, 'unit_person_id' => (int) $row['unit_person_id'],
                    'year' => $year, 'month' => $month,
                ], $values);
            }
        });

        return $this->unitMetrics($department, $request);
    }
}
