<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(protected ReportDataService $data) {}

    public function overview(Request $request): JsonResponse
    {
        $v = $request->validate(['year' => 'required|integer', 'month' => 'required|integer|min:1|max:12']);
        $payload = $this->data->payload((int) $v['year'], (int) $v['month']);

        $depts = array_map(function ($d) {
            $base = [
                'id' => $d['id'], 'code' => $d['code'], 'name' => $d['name'], 'kind' => $d['kind'],
                'head_label' => $d['head_label'], 'summary' => $d['summary'],
            ];
            if ($d['kind'] === 'lines') {
                $base['line_count'] = count($d['lines']);
                $base['cost_total'] = $d['cost_total'];
                $base['npt_total'] = $d['npt']['total'];
            }

            return $base;
        }, $payload['departments']);

        $lineDepts = array_filter($payload['departments'], fn ($d) => $d['kind'] === 'lines');
        $avg = fn (array $vals) => ($v = array_values(array_filter($vals, fn ($x) => $x !== null))) ? round(array_sum($v) / count($v), 2) : null;

        return response()->json([
            'company_name' => $payload['company_name'],
            'period' => $payload['period'],
            'totals' => [
                'cost_ytd' => array_sum(array_map(fn ($d) => $d['cost_total'] ?? 0, $lineDepts)),
                'cost_month' => array_sum(array_map(fn ($d) => $d['summary']['cost_month'] ?? 0, $lineDepts)),
                'eff_ach' => $avg(array_map(fn ($d) => $d['summary']['eff_ach'], $lineDepts)),
                'prod_ach' => $avg(array_map(fn ($d) => $d['summary']['prod_ach'], $lineDepts)),
                'sew_dhu' => $avg(array_map(fn ($d) => $d['summary']['sew_dhu'], $lineDepts)),
                'fin_dhu' => $avg(array_map(fn ($d) => $d['summary']['fin_dhu'], $lineDepts)),
            ],
            'departments' => array_values($depts),
        ]);
    }

    public function department(int $id, Request $request): JsonResponse
    {
        $v = $request->validate(['year' => 'required|integer', 'month' => 'required|integer|min:1|max:12']);
        $payload = $this->data->payload((int) $v['year'], (int) $v['month'], $id);
        abort_if(empty($payload['departments']), 404);
        $d = $payload['departments'][0];

        // Photos are absolute paths for the generator; the UI does not need them.
        unset($d['head_photo']);
        if (isset($d['lines'])) {
            foreach ($d['lines'] as &$l) {
                foreach ($l['staff'] as &$s) {
                    unset($s['photo']);
                }
            }
        }
        if (isset($d['people'])) {
            foreach ($d['people'] as &$p) {
                unset($p['photo']);
            }
        }

        return response()->json(['period' => $payload['period'], 'department' => $d]);
    }
}
