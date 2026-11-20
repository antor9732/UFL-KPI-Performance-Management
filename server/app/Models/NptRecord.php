<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NptRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'line_id',
        'month_name',
        'reason_category',
        'loss_time_min',
        'lost_hours',
        'time_cost',
        'npt_pct',
        'corrective_action',
        'responsible_person',
    ];

    protected $casts = [
        'loss_time_min' => 'decimal:2',
        'lost_hours' => 'decimal:2',
        'time_cost' => 'decimal:2',
        'npt_pct' => 'decimal:4',
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
