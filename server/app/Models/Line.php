<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Line extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['is_active' => 'boolean', 'number' => 'integer', 'sort_order' => 'integer'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(LineStaff::class)->orderBy('position');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(LineMetric::class);
    }

    public function label(): string
    {
        return $this->name ?: sprintf('Line No %02d', $this->number);
    }
}
