<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiTarget extends Model
{
    use HasUuids;

    protected $fillable = [
        'kpi_definition_id',
        'scope_type',
        'scope_id',
        'target_value',
        'warning_threshold',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'target_value' => 'decimal:4',
        'warning_threshold' => 'decimal:4',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function kpiDefinition(): BelongsTo
    {
        return $this->belongsTo(KpiDefinition::class);
    }
}
