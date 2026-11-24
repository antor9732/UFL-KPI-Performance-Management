<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LineMetric extends Model
{
    protected $guarded = ['id'];

    public const FIELDS = [
        'eff_target', 'eff_ach', 'prod_target', 'prod_ach', 'profit_loss', 'idle_loss', 'cost_diff',
        'sew_dhu_target', 'sew_dhu', 'fin_dhu_target', 'fin_dhu',
    ];

    /** Fields that are targets (copied forward to a new month). */
    public const TARGET_FIELDS = ['eff_target', 'prod_target', 'sew_dhu_target', 'fin_dhu_target'];

    protected $casts = [
        'year' => 'integer', 'month' => 'integer',
        'eff_target' => 'float', 'eff_ach' => 'float', 'prod_target' => 'float', 'prod_ach' => 'float',
        'profit_loss' => 'float', 'idle_loss' => 'float', 'cost_diff' => 'float',
        'sew_dhu_target' => 'float', 'sew_dhu' => 'float', 'fin_dhu_target' => 'float', 'fin_dhu' => 'float',
    ];
}
