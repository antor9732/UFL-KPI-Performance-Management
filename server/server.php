<?php

/**
 * Router for PHP's built-in web server (desktop / client mode).
 *
 * Usage: php -S 127.0.0.1:8000 -t public server.php
 *
 * - Serves real files from public/ directly (SPA bundle, favicon, etc.)
 * - Serves uploaded photos from storage/app/public under /storage/* without
 *   needing `php artisan storage:link` (symlinks need admin rights on Windows)
 * - Sends everything else to Laravel (public/index.php)
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
$publicPath = __DIR__.'/public';

// 1. Uploaded files (avatars / photos) -> storage/app/public
if (str_starts_with($uri, '/storage/')) {
    $storageRoot = realpath(__DIR__.'/storage/app/public');
    $file = $storageRoot ? realpath($storageRoot.'/'.substr($uri, strlen('/storage/'))) : false;

    if ($file && is_file($file) && str_starts_with($file, $storageRoot)) {
        $types = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif' => 'image/gif', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
        ];
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        header('Content-Type: '.($types[$ext] ?? 'application/octet-stream'));
        header('Content-Length: '.filesize($file));
        header('Cache-Control: public, max-age=86400');
        readfile($file);
        return true;
    }

    http_response_code(404);
    return true;
}

// 2. Existing static files in public/ (but never raw .php files)
if ($uri !== '/' && is_file($publicPath.$uri) && !str_ends_with(strtolower($uri), '.php')) {
    return false;
}

// 3. The app screen itself (/, /dashboard, ...) -> index.html straight away.
//    No Laravel boot needed, and never cached so an update can't leave a stale page.
if (!str_starts_with($uri, '/api/') && !str_starts_with($uri, '/auth/') && $uri !== '/up' && is_file($publicPath.'/index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    readfile($publicPath.'/index.html');
    return true;
}

// 4. API -> Laravel
$_SERVER['SCRIPT_FILENAME'] = $publicPath.'/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
require_once $publicPath.'/index.php';
