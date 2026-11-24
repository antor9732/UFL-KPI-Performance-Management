<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LineStaff extends Model
{
    protected $table = 'line_staff';

    protected $guarded = ['id'];

    protected $casts = ['is_vacant' => 'boolean', 'position' => 'integer'];

    /** Slide label, e.g. "IE-Rabbi" or "LC-" when the slot has no name. */
    public function label(): string
    {
        return trim(($this->role ?? '').'-'.($this->name ?? ''), ' ');
    }
}
