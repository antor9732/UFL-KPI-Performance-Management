<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Photos live in storage/app/public/photos and are served at /storage/photos/...
 * The database stores the relative path "photos/<file>".
 */
class Photos
{
    public const MAX_SIDE = 600; // shown about 1 inch wide on slides

    public static function store(UploadedFile $file, string $prefix = 'photo'): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $ext = $ext === 'jpeg' ? 'jpg' : $ext;
        $name = (Str::slug($prefix) ?: 'photo').'_'.Str::random(10).'.'.$ext;
        $path = $file->storeAs('photos', $name, 'public');
        self::shrink(Storage::disk('public')->path($path), $ext);

        return $path;
    }

    /** Phone photos are often 3-8 MB; keep them small so decks stay light. */
    public static function shrink(string $abs, string $ext): void
    {
        if (!function_exists('imagecreatefromstring') || !in_array($ext, ['jpg', 'png', 'webp'], true)) {
            return;
        }
        $info = @getimagesize($abs);
        if (!$info || max($info[0], $info[1]) <= self::MAX_SIDE) {
            return;
        }
        $src = @imagecreatefromstring((string) file_get_contents($abs));
        if (!$src) {
            return;
        }
        $scale = self::MAX_SIDE / max($info[0], $info[1]);
        $w = max(1, (int) round($info[0] * $scale));
        $h = max(1, (int) round($info[1] * $scale));
        $dst = imagecreatetruecolor($w, $h);
        if ($ext !== 'jpg') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $w, $h, $info[0], $info[1]);
        match ($ext) {
            'jpg' => imagejpeg($dst, $abs, 85),
            'png' => imagepng($dst, $abs, 6),
            'webp' => function_exists('imagewebp') ? imagewebp($dst, $abs, 85) : null,
        };
        imagedestroy($src);
        imagedestroy($dst);
    }

    public static function delete(?string $path): void
    {
        if ($path && str_starts_with($path, 'photos/')) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? '/storage/'.ltrim($path, '/') : null;
    }

    public static function absolute(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        $abs = Storage::disk('public')->path($path);

        return is_file($abs) ? $abs : null;
    }
}
