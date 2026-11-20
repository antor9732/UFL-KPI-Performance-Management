<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'department_id',
        'production_area_id',
        'line_number',
        'line_name',
        'supervisor_id',
        'standard_manpower',
        'standard_smv',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'standard_manpower' => 'integer',
        'standard_smv' => 'decimal:2',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(ProductionArea::class, 'production_area_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'supervisor_id');
    }

    public function productionRecords(): HasMany
    {
        return $this->hasMany(ProductionRecord::class, 'line_id');
    }

    public function qualityRecords(): HasMany
    {
        return $this->hasMany(QualityRecord::class, 'line_id');
    }

    public function nptRecords(): HasMany
    {
        return $this->hasMany(NptRecord::class, 'line_id');
    }
}
