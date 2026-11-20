<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LineCostRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'line_id',
        'month_name',
        'budgeted_cost',
        'actual_cost',
        'total_profit_loss',
        'idle_hour_loss',
        'cost_ach_pct',
        'costing_productivity',
    ];

    protected $casts = [
        'budgeted_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'total_profit_loss' => 'decimal:2',
        'idle_hour_loss' => 'decimal:2',
        'cost_ach_pct' => 'decimal:4',
        'costing_productivity' => 'decimal:4',
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
