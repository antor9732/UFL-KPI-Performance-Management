<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ReportingPeriodsSeeder extends Seeder
{
    public function run(): void
    {
        $months = [
            1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April',
            5 => 'May', 6 => 'June', 7 => 'July', 8 => 'August',
            9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December'
        ];

        foreach ($months as $num => $name) {
            $startDate = Carbon::create(2026, $num, 1)->startOfMonth()->toDateString();
            $endDate = Carbon::create(2026, $num, 1)->endOfMonth()->toDateString();
            $isClosed = $num <= 10; // Jan-Oct 2026 are completed in the reference report

            DB::table('reporting_periods')->updateOrInsert(
                ['period_type' => 'monthly', 'year' => 2026, 'month' => $num],
                [
                    'id' => (string) Str::uuid(),
                    'name' => "$name 2026",
                    'period_type' => 'monthly',
                    'year' => 2026,
                    'month' => $num,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'is_closed' => $isClosed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
