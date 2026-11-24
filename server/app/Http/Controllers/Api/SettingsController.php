<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KpiGoal;
use App\Services\GoogleService;
use App\Support\Photos;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function show(GoogleService $google): JsonResponse
    {
        return response()->json($this->present($google));
    }

    public function update(Request $request, GoogleService $google): JsonResponse
    {
        $data = $request->validate([
            'company_name' => 'sometimes|required|string|max:150',
            'report_title' => 'sometimes|nullable|string|max:150',
            'cover_quote' => 'sometimes|nullable|string|max:500',
            'cover_quote_2' => 'sometimes|nullable|string|max:500',
            'cover_tagline' => 'sometimes|nullable|string|max:150',
            'currency_symbol' => 'sometimes|nullable|string|max:5',
            'google_client_id' => 'sometimes|nullable|string|max:255',
            'google_client_secret' => 'sometimes|nullable|string|max:255',
            'auto_backup_minutes' => 'sometimes|nullable|integer|min:5|max:1440',
        ]);
        foreach ($data as $key => $value) {
            if (in_array($key, Settings::EDITABLE, true)) {
                // An empty secret field in the form means "keep the saved one".
                if ($key === 'google_client_secret' && ($value === null || $value === '')) {
                    continue;
                }
                Settings::set($key, $value === null ? '' : (string) $value);
            }
        }

        return response()->json($this->present($google));
    }

    public function logo(Request $request, GoogleService $google): JsonResponse
    {
        if ($request->boolean('remove')) {
            Photos::delete(Settings::get('logo'));
            Settings::set('logo', '');
        } else {
            $request->validate(['logo' => 'required|image|max:8192']);
            Photos::delete(Settings::get('logo'));
            Settings::set('logo', Photos::store($request->file('logo'), 'logo'));
        }

        return response()->json($this->present($google));
    }

    public function goals(): JsonResponse
    {
        return response()->json(KpiGoal::orderBy('sort_order')->orderBy('id')->get(['id', 'group_name', 'category', 'target', 'responsible']));
    }

    public function saveGoals(Request $request): JsonResponse
    {
        $goals = $request->validate([
            'goals' => 'present|array',
            'goals.*.group_name' => 'required|string|max:100',
            'goals.*.category' => 'required|string|max:150',
            'goals.*.target' => 'nullable|string|max:50',
            'goals.*.responsible' => 'nullable|string|max:150',
        ])['goals'];

        DB::transaction(function () use ($goals) {
            KpiGoal::query()->delete();
            foreach (array_values($goals) as $i => $g) {
                KpiGoal::create($g + ['sort_order' => $i]);
            }
        });

        return $this->goals();
    }

    /** "Start fresh": remove all departments, lines, people, metrics, goals and photos. */
    public function resetData(Request $request): JsonResponse
    {
        $request->validate(['confirm' => 'required|in:DELETE']);
        DB::transaction(function () {
            foreach (['unit_metrics', 'unit_people', 'npt_reasons', 'line_metrics', 'line_staff', 'lines', 'departments', 'kpi_goals'] as $table) {
                DB::table($table)->delete();
            }
        });
        \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('photos');
        Settings::set('logo', '');

        return response()->json(['ok' => true]);
    }

    private function present(GoogleService $google): array
    {
        $all = Settings::all();

        return [
            'company_name' => Settings::get('company_name'),
            'report_title' => $all['report_title'],
            'cover_quote' => $all['cover_quote'],
            'cover_quote_2' => $all['cover_quote_2'],
            'cover_tagline' => $all['cover_tagline'],
            'currency_symbol' => $all['currency_symbol'],
            'auto_backup_minutes' => (int) $all['auto_backup_minutes'],
            'logo_url' => Photos::url($all['logo'] ?: null),
            'google_client_id' => Settings::get('google_client_id', ''),
            'google_client_secret_set' => $google->clientSecret() !== '',
            'google_configured' => $google->isConfigured(),
        ];
    }
}
