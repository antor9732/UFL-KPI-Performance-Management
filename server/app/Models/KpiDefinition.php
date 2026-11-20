<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiDefinition extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'category',
        'unit',
        'precision_decimals',
        'performance_direction',
        'aggregation_type',
        'formula_expression',
        'formula_metadata',
        'is_active',
    ];

    protected $casts = [
        'precision_decimals' => 'integer',
        'formula_metadata' => 'array',
        'is_active' => 'boolean',
    ];

    public function targets(): HasMany
    {
        return $this->hasMany(KpiTarget::class);
    }
}
