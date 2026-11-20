<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'department_type',
        'head_name',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function areas(): HasMany
    {
        return $this->hasMany(ProductionArea::class)->orderBy('sort_order');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ProductionLine::class)->orderBy('sort_order');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(KpiSubmission::class);
    }
}
