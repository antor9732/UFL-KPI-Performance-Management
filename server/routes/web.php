<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/auth/google/redirect', [AuthController::class, 'redirect']);
Route::get('/auth/google/callback', [AuthController::class, 'callback']);

Route::get('/{any?}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath, ['Cache-Control' => 'no-cache, no-store, must-revalidate']);
    }

    return response()->json(['message' => 'KPI Performance System API is running.'], 200);
})->where('any', '^(?!api|storage|auth).*$');
