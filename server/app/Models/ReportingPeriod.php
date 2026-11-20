<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReportingPeriod extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'period_type',
        'year',
        'month',
        'start_date',
        'end_date',
        'is_closed',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
    ];

    public function submissions(): HasMany
    {
        return $this->hasMany(KpiSubmission::class);
    }
}
