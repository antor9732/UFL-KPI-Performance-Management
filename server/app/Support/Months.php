<?php

namespace App\Support;

class Months
{
    public const NAMES = [1 => 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'];

    public static function name(int $month): string
    {
        return self::NAMES[$month] ?? '';
    }

    public static function short(int $month): string
    {
        return substr(self::name($month), 0, 3);
    }

    /** [year, month] of the month before. */
    public static function previous(int $year, int $month): array
    {
        return $month <= 1 ? [$year - 1, 12] : [$year, $month - 1];
    }
}
