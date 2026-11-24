<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportingPeriod;
use App\Services\PresentationDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Process\Process;

class ReportExportController extends Controller
{
    public function __construct(
        protected PresentationDataService $dataService
    ) {}

    /**
     * Generate and stream the 85-slide PowerPoint deck for the specified period and scope
     */
    public function exportPptx(Request $request): BinaryFileResponse|JsonResponse
    {
        $request->validate([
            'period_id' => 'nullable|uuid|exists:reporting_periods,id',
            'scope' => 'nullable|string',
            'theme' => 'nullable|string|in:executive-navy,corporate-white,slate-dark,royal-gold',
        ]);

        $periodId = $request->input('period_id');
        if (!$periodId) {
            $period = ReportingPeriod::where('year', 2026)->where('month', 10)->first()
                ?? ReportingPeriod::latest('start_date')->first();
            if (!$period) {
                return response()->json(['error' => 'No reporting period found. Please create a reporting period first.'], 422);
            }
            $periodId = $period->id;
        } else {
            $period = ReportingPeriod::findOrFail($periodId);
        }

        $scope = $request->input('scope', 'full');
        $theme = $request->input('theme', 'executive-navy');

        // Prepare presentation payload
        $payload = $this->dataService->getPresentationPayload($periodId, $scope, $theme);

        // Ensure temp output directory exists
        $tempDir = storage_path('app/temp');
        if (!File::exists($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        $uniqueKey = Str::uuid()->toString();
        $inputJsonPath = $tempDir . DIRECTORY_SEPARATOR . "input_{$uniqueKey}.json";
        $outputPptxPath = $tempDir . DIRECTORY_SEPARATOR . "UFL_KPI_{$period->year}_{$period->month}_{$uniqueKey}.pptx";

        File::put($inputJsonPath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        // Locate bundled or system node binary
        $nodeBin = $this->findNodeBinary();
        // Prefer the self-contained bundle (pptxgenjs inlined) so client PCs
        // do not need node_modules. Fall back to the source script for dev.
        $scriptPath = base_path('scripts/generate_presentation.bundle.cjs');
        if (!File::exists($scriptPath)) {
            $scriptPath = base_path('scripts/generate_presentation.js');
        }

        $process = new Process([
            $nodeBin,
            $scriptPath,
            '--input',
            $inputJsonPath,
            '--output',
            $outputPptxPath,
        ]);

        $process->setTimeout(180); // 3 minutes timeout for 85 slides
        $process->setWorkingDirectory(base_path());

        try {
            $process->run();
        } catch (\Throwable $e) {
            File::delete($inputJsonPath);
            return response()->json([
                'error' => 'Failed to start presentation engine (Node.js)',
                'details' => $e->getMessage(),
            ], 500);
        }

        // Clean up input json
        if (File::exists($inputJsonPath)) {
            File::delete($inputJsonPath);
        }

        if (!$process->isSuccessful() || !File::exists($outputPptxPath)) {
            return response()->json([
                'error' => 'Failed to generate presentation deck',
                'details' => $process->getErrorOutput() ?: $process->getOutput(),
            ], 500);
        }

        $cleanPeriodName = Str::slug($period->name);
        $themeTag = Str::slug($theme);
        $downloadFileName = "UFL_KPI_Presentation_{$cleanPeriodName}_{$themeTag}.pptx";

        return response()->download($outputPptxPath, $downloadFileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Locate bundled or system node.exe binary
     */
    protected function findNodeBinary(): string
    {
        $candidates = [
            base_path('../runtime/node/node.exe'),
            base_path('runtime/node/node.exe'),
        ];
        foreach ($candidates as $bundled) {
            if (File::exists($bundled)) {
                return realpath($bundled) ?: $bundled;
            }
        }

        return 'node';
    }
}
