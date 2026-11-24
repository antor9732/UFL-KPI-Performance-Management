<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];

    public function lines(): HasMany
    {
        return $this->hasMany(Line::class)->orderBy('sort_order')->orderBy('number');
    }

    public function unitPeople(): HasMany
    {
        return $this->hasMany(UnitPerson::class)->orderBy('sort_order')->orderBy('id');
    }

    public function nptReasons(): HasMany
    {
        return $this->hasMany(NptReason::class)->orderBy('sort_order');
    }

    public function isLines(): bool
    {
        return $this->kind === 'lines';
    }
}
