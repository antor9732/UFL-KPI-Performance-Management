<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeftoverRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'month_name',
        'buyer_name',
        'style_no',
        'leftover_qty',
        'reason',
        'warehouse_location',
    ];

    protected $casts = [
        'leftover_qty' => 'integer',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(KpiSubmission::class, 'submission_id');
    }
}
