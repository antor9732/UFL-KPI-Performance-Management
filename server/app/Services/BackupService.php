<?php

namespace App\Services;

use App\Models\BackupLog;
use App\Models\User;
use App\Support\CurrentUser;
use App\Support\Settings;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * A backup is one .zip: a consistent copy of the SQLite database + all photos.
 * It can be downloaded/uploaded locally or stored in the signed-in user's Google Drive.
 */
class BackupService
{
    public function __construct(protected GoogleService $google) {}

    public function databasePath(): string
    {
        return (string) config('database.connections.sqlite.database');
    }

    public function createZip(): string
    {
        $dir = storage_path('app/temp');
        File::ensureDirectoryExists($dir);
        $stamp = now()->format('Ymd_His');
        $dbCopy = $dir.DIRECTORY_SEPARATOR."db_{$stamp}_".bin2hex(random_bytes(3)).'.sqlite';
        $zipPath = $dir.DIRECTORY_SEPARATOR.$this->fileName($stamp);

        // Consistent snapshot even while the app is running.
        DB::statement('VACUUM INTO ?', [$dbCopy]);

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create backup file.');
        }
        $zip->addFile($dbCopy, 'database.sqlite');
        $photoDir = Storage::disk('public')->path('photos');
        if (is_dir($photoDir)) {
            foreach (File::allFiles($photoDir) as $file) {
                $zip->addFile($file->getPathname(), 'photos/'.str_replace('\\', '/', $file->getRelativePathname()));
            }
        }
        $zip->addFromString('manifest.json', json_encode([
            'app' => 'kpi-performance-system',
            'format' => 1,
            'created_at' => now()->toIso8601String(),
            'company' => Settings::get('company_name'),
        ], JSON_PRETTY_PRINT));
        $zip->close();
        @unlink($dbCopy);

        return $zipPath;
    }

    public function fileName(?string $stamp = null): string
    {
        $company = preg_replace('/[^A-Za-z0-9]+/', '_', (string) Settings::get('company_name')) ?: 'KPI';

        return trim($company, '_').'_KPI_backup_'.($stamp ?? now()->format('Ymd_His')).'.zip';
    }

    public function backupToGoogle(?User $user = null): array
    {
        $user ??= CurrentUser::get();
        if (!$user->isGoogle()) {
            throw new RuntimeException('Sign in with Google to back up to Google Drive.');
        }
        $zip = $this->createZip();
        try {
            $file = $this->google->upload($user, $zip, basename($zip));
            $user->last_backup_at = now();
            $user->save();
            $this->log($user, 'google', 'backup', basename($zip), $file['id'] ?? null, filesize($zip), 'ok');

            return $file;
        } catch (Throwable $e) {
            $this->log($user, 'google', 'backup', basename($zip), null, filesize($zip), 'failed', $e->getMessage());
            throw $e;
        } finally {
            @unlink($zip);
        }
    }

    /** Called after data changes: backs up to Drive when signed in and the interval has passed. */
    public function autoBackupIfDue(): void
    {
        try {
            $user = CurrentUser::get();
            if (!$user->isGoogle() || !$this->google->isConfigured()) {
                return;
            }
            $minutes = max(5, (int) Settings::get('auto_backup_minutes', '30'));
            if ($user->last_backup_at && $user->last_backup_at->gt(now()->subMinutes($minutes))) {
                return;
            }
            $this->backupToGoogle($user);
        } catch (Throwable $e) {
            report($e);
        }
    }

    public function restoreFromGoogle(string $fileId): void
    {
        $user = CurrentUser::get();
        $dir = storage_path('app/temp');
        File::ensureDirectoryExists($dir);
        $target = $dir.DIRECTORY_SEPARATOR.'restore_'.bin2hex(random_bytes(4)).'.zip';
        try {
            $this->google->download($user, $fileId, $target);
            $this->restoreZip($target);
            $this->log($user, 'google', 'restore', $fileId, $fileId, filesize($target), 'ok');
        } finally {
            @unlink($target);
        }
    }

    public function restoreZip(string $zipPath): void
    {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true || $zip->locateName('database.sqlite') === false) {
            throw new RuntimeException('This is not a valid KPI System backup file.');
        }

        $dir = storage_path('app/temp/restore_'.bin2hex(random_bytes(4)));
        File::ensureDirectoryExists($dir);
        $zip->extractTo($dir);
        $zip->close();

        $newDb = $dir.DIRECTORY_SEPARATOR.'database.sqlite';
        $header = (string) file_get_contents($newDb, false, null, 0, 16);
        if (!str_starts_with($header, 'SQLite format 3')) {
            File::deleteDirectory($dir);
            throw new RuntimeException('The backup does not contain a valid database.');
        }

        // Keep the account that is signed in right now (its tokens are encrypted with this PC's key).
        $current = CurrentUser::get();
        $keepUser = $current->is_default ? null : (array) DB::table('users')->where('id', $current->id)->first();

        DB::disconnect();
        $dbPath = $this->databasePath();
        $safety = $dbPath.'.before-restore';
        @copy($dbPath, $safety);
        if (!@copy($newDb, $dbPath)) {
            File::deleteDirectory($dir);
            throw new RuntimeException('Could not replace the database file.');
        }
        DB::reconnect();
        Settings::flush();

        // Photos
        $photoSrc = $dir.DIRECTORY_SEPARATOR.'photos';
        if (is_dir($photoSrc)) {
            $photoDst = Storage::disk('public')->path('photos');
            File::deleteDirectory($photoDst);
            File::ensureDirectoryExists($photoDst);
            File::copyDirectory($photoSrc, $photoDst);
        }
        File::deleteDirectory($dir);

        // Bring an older backup up to the current schema.
        Artisan::call('migrate', ['--force' => true]);

        $this->repairAccounts($keepUser);
        @unlink($safety);
    }

    /** Tokens encrypted on another PC cannot be read here: clear them, re-attach the current account. */
    private function repairAccounts(?array $keepUser): void
    {
        foreach (DB::table('users')->whereNotNull('google_refresh_token')->get() as $row) {
            try {
                Crypt::decryptString($row->google_refresh_token);
            } catch (Throwable) {
                DB::table('users')->where('id', $row->id)->update([
                    'google_refresh_token' => null, 'google_access_token' => null, 'google_token_expires_at' => null,
                ]);
            }
        }

        if (!DB::table('users')->where('is_default', true)->exists()) {
            CurrentUser::defaultUser();
        }

        if ($keepUser) {
            unset($keepUser['id']);
            DB::table('users')->updateOrInsert(['email' => $keepUser['email']], $keepUser);
            $id = DB::table('users')->where('email', $keepUser['email'])->value('id');
            Settings::set('active_user_id', (string) $id);
        } else {
            Settings::set('active_user_id', '');
        }
    }

    public function log(?User $user, string $target, string $action, ?string $file, ?string $remoteId, ?int $size, string $status, ?string $message = null): void
    {
        BackupLog::create([
            'user_id' => $user?->id, 'target' => $target, 'action' => $action, 'file_name' => $file,
            'remote_id' => $remoteId, 'size' => $size, 'status' => $status, 'message' => $message ? mb_substr($message, 0, 2000) : null,
        ]);
    }
}
