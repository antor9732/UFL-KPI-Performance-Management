<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NptReason extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['hours' => 'float', 'year' => 'integer', 'month' => 'integer'];
}
