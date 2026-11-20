<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'line_id',
        'month_name',
        'record_date',
        'checked_units',
        'defect_units',
        'total_defects',
        'dhu',
        'rejection_units',
        'ftt_pct',
    ];

    protected $casts = [
        'record_date' => 'date',
        'checked_units' => 'integer',
        'defect_units' => 'integer',
        'total_defects' => 'integer',
        'dhu' => 'decimal:4',
        'rejection_units' => 'integer',
        'ftt_pct' => 'decimal:4',
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
