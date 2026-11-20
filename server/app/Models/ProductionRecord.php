<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'line_id',
        'record_date',
        'month_name',
        'plan_hours',
        'produce_hours',
        'hour_ach_pct',
        'plan_pcs',
        'produce_pcs',
        'pcs_ach_pct',
        'earned_minutes',
        'available_minutes',
        'efficiency_pct',
        'operators_count',
        'helpers_count',
    ];

    protected $casts = [
        'record_date' => 'date',
        'plan_hours' => 'decimal:2',
        'produce_hours' => 'decimal:2',
        'hour_ach_pct' => 'decimal:4',
        'plan_pcs' => 'integer',
        'produce_pcs' => 'integer',
        'pcs_ach_pct' => 'decimal:4',
        'earned_minutes' => 'decimal:2',
        'available_minutes' => 'decimal:2',
        'efficiency_pct' => 'decimal:4',
        'operators_count' => 'integer',
        'helpers_count' => 'integer',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(KpiSubmission::class, 'submission_id');
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(ProductionLine::class, 'line_id');
    }
}
