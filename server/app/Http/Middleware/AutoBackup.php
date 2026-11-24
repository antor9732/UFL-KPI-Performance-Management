<?php

namespace App\Http\Middleware;

use App\Services\BackupService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** After a data change, back up to Google Drive (throttled) when a Google account is signed in. */
class AutoBackup
{
    public function __construct(protected BackupService $backup) {}

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            && $response->getStatusCode() < 400
            && !$request->is('api/v1/backup*', 'api/v1/auth*', 'api/v1/reports*')) {
            $this->backup->autoBackupIfDue();
        }
    }
}
