<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnitMetric extends Model
{
    protected $guarded = ['id'];

    public const FIELDS = ['plan', 'produce', 'eff_target', 'eff_ach', 'earning_target', 'earning', 'dhu_target', 'dhu'];

    public const TARGET_FIELDS = ['eff_target', 'earning_target', 'dhu_target'];

    protected $casts = [
        'year' => 'integer', 'month' => 'integer', 'unit_person_id' => 'integer',
        'plan' => 'float', 'produce' => 'float', 'eff_target' => 'float', 'eff_ach' => 'float',
        'earning_target' => 'float', 'earning' => 'float', 'dhu_target' => 'float', 'dhu' => 'float',
    ];
}
