<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecializedRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'department_type',
        'supervisor_id',
        'month_name',
        'metric_name',
        'target_value',
        'actual_value',
        'achievement_pct',
        'details',
    ];

    protected $casts = [
        'target_value' => 'decimal:4',
        'actual_value' => 'decimal:4',
        'achievement_pct' => 'decimal:4',
        'details' => 'array',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(KpiSubmission::class, 'submission_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id');
    }
}
