<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Key/value application settings (company name, cover texts, Google credentials ...).
 */
class Settings
{
    public const DEFAULTS = [
        'company_name' => 'Your Company Ltd.',
        'report_title' => 'KPI Performance',
        'cover_quote' => 'Alone we can do so little, together we can do so much. — Helen Keller',
        'cover_quote_2' => '',
        'cover_tagline' => 'Work & Win Together…',
        'currency_symbol' => '$',
        'logo' => '',
        'google_client_id' => '',
        'google_client_secret' => '',
        'auto_backup_minutes' => '30',
        'active_user_id' => '',
    ];

    /** Keys that the settings screen may edit. */
    public const EDITABLE = [
        'company_name', 'report_title', 'cover_quote', 'cover_quote_2', 'cover_tagline', 'currency_symbol',
        'google_client_id', 'google_client_secret', 'auto_backup_minutes',
    ];

    private static ?array $cache = null;

    public static function all(): array
    {
        if (self::$cache === null) {
            $rows = Schema::hasTable('app_settings')
                ? DB::table('app_settings')->pluck('value', 'key')->all()
                : [];
            self::$cache = array_merge(self::DEFAULTS, array_filter($rows, fn ($v) => $v !== null));
        }

        return self::$cache;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = self::all()[$key] ?? null;
        if ($value === null || $value === '') {
            // Allow build-time defaults from .env, e.g. GOOGLE_CLIENT_ID
            $env = env(strtoupper($key));
            if (is_string($env) && $env !== '') {
                return $env;
            }

            return $default ?? (self::DEFAULTS[$key] ?? null);
        }

        return $value;
    }

    public static function set(string $key, ?string $value): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'updated_at' => now(), 'created_at' => now()]
        );
        self::$cache = null;
    }

    public static function flush(): void
    {
        self::$cache = null;
    }
}
