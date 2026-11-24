<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportDataService;
use App\Support\Months;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Process\Process;

class ReportExportController extends Controller
{
    public function __construct(protected ReportDataService $dataService) {}

    /** Generate the monthly KPI PowerPoint deck (native, editable). */
    public function exportPptx(Request $request): BinaryFileResponse|JsonResponse
    {
        $v = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'department_id' => 'nullable|integer|exists:departments,id',
        ]);
        $year = (int) $v['year'];
        $month = (int) $v['month'];
        $deptId = isset($v['department_id']) ? (int) $v['department_id'] : null;

        $payload = $this->dataService->payload($year, $month, $deptId);
        if (empty($payload['departments'])) {
            return response()->json(['error' => 'Add at least one department before exporting.'], 422);
        }

        $tempDir = storage_path('app/temp');
        File::ensureDirectoryExists($tempDir);
        $key = Str::uuid()->toString();
        $inputJson = $tempDir.DIRECTORY_SEPARATOR."input_{$key}.json";
        $outputPptx = $tempDir.DIRECTORY_SEPARATOR."deck_{$key}.pptx";
        File::put($inputJson, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        $nodeBin = $this->findNodeBinary();
        $scriptPath = base_path('scripts/generate_presentation.bundle.cjs');
        if (!File::exists($scriptPath)) {
            $scriptPath = base_path('scripts/generate_presentation.js');
        }

        $process = new Process([$nodeBin, $scriptPath, '--input', $inputJson, '--output', $outputPptx], base_path(), $this->childEnvironment());
        $process->setTimeout(300);

        try {
            $process->run();
        } catch (\Throwable $e) {
            File::delete($inputJson);
            Log::error('PPTX export: could not start Node.js', ['node' => $nodeBin, 'error' => $e->getMessage()]);

            return response()->json(['error' => 'Failed to start presentation engine (Node.js)', 'details' => $e->getMessage()], 500);
        }
        File::delete($inputJson);

        if (!$process->isSuccessful() || !File::exists($outputPptx)) {
            Log::error('PPTX export failed', [
                'node' => $nodeBin, 'script' => $scriptPath, 'exit_code' => $process->getExitCode(),
                'stderr' => mb_substr($process->getErrorOutput(), 0, 4000),
                'stdout' => mb_substr($process->getOutput(), 0, 2000),
            ]);

            return response()->json([
                'error' => 'Failed to generate presentation deck',
                'details' => mb_substr($process->getErrorOutput() ?: $process->getOutput(), 0, 1500),
            ], 500);
        }

        $company = Str::slug((string) Settings::get('company_name')) ?: 'company';
        $scope = $deptId ? '_'.Str::slug($payload['departments'][0]['code']) : '';
        $fileName = "{$company}_KPI_".Months::name($month)."_{$year}{$scope}.pptx";

        return response()->download($outputPptx, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Under PHP's built-in server Symfony Process forwards only env vars also present in
     * $_SERVER, dropping SystemRoot etc. -> node.exe aborts ("ncrypto::CSPRNG"). Pass them all.
     */
    protected function childEnvironment(): array
    {
        $env = getenv();
        if (!is_array($env)) {
            $env = [];
        }
        if (DIRECTORY_SEPARATOR === '\\') {
            $windir = $env['SystemRoot'] ?? $env['SYSTEMROOT'] ?? $env['windir'] ?? $env['WINDIR'] ?? 'C:\\Windows';
            $defaults = [
                'SystemRoot' => $windir, 'windir' => $windir, 'SystemDrive' => substr($windir, 0, 2),
                'ComSpec' => $windir.'\\System32\\cmd.exe', 'TEMP' => sys_get_temp_dir(), 'TMP' => sys_get_temp_dir(),
                'PATHEXT' => '.COM;.EXE;.BAT;.CMD',
            ];
            $lower = array_change_key_case($env, CASE_LOWER);
            foreach ($defaults as $k => $val) {
                if (!array_key_exists(strtolower($k), $lower)) {
                    $env[$k] = $val;
                }
            }
        }

        return $env;
    }

    protected function findNodeBinary(): string
    {
        foreach ([base_path('../runtime/node/node.exe'), base_path('runtime/node/node.exe')] as $bundled) {
            if (File::exists($bundled)) {
                return realpath($bundled) ?: $bundled;
            }
        }

        return 'node';
    }
}
