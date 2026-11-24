<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use App\Services\BackupService;
use App\Services\GoogleService;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BackupController extends Controller
{
    public function __construct(protected BackupService $backup, protected GoogleService $google) {}

    public function status(): JsonResponse
    {
        $user = CurrentUser::get();

        return response()->json([
            'google_connected' => $user->isGoogle(),
            'last_backup_at' => $user->last_backup_at?->toIso8601String(),
            'folder' => $this->google->backupFolderName(),
            'log' => BackupLog::orderByDesc('id')->limit(10)->get(['id', 'target', 'action', 'file_name', 'status', 'message', 'created_at']),
        ]);
    }

    public function googleBackup(): JsonResponse
    {
        try {
            $file = $this->backup->backupToGoogle();

            return response()->json(['ok' => true, 'file' => $file]);
        } catch (Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function googleList(): JsonResponse
    {
        try {
            return response()->json($this->google->list(CurrentUser::get()));
        } catch (Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function googleRestore(string $fileId): JsonResponse
    {
        try {
            $this->backup->restoreFromGoogle($fileId);

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function download(): BinaryFileResponse
    {
        $zip = $this->backup->createZip();
        $this->backup->log(CurrentUser::get(), 'local', 'backup', basename($zip), null, filesize($zip), 'ok');

        return response()->download($zip, basename($zip), ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
    }

    public function restore(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:512000']);
        try {
            $this->backup->restoreZip($request->file('file')->getRealPath());
            $this->backup->log(CurrentUser::get(), 'local', 'restore', $request->file('file')->getClientOriginalName(), null, $request->file('file')->getSize(), 'ok');

            return response()->json(['ok' => true]);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
