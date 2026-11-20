<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'month_name',
        'floor',
        'buyer_name',
        'order_no',
        'style_no',
        'order_qty',
        'cutting_qty',
        'shipment_qty',
        'short_shipment_qty',
        'cut_to_ship_pct',
        'order_to_ship_pct',
        'on_time',
        'short_ship_reason',
    ];

    protected $casts = [
        'order_qty' => 'integer',
        'cutting_qty' => 'integer',
        'shipment_qty' => 'integer',
        'short_shipment_qty' => 'integer',
        'cut_to_ship_pct' => 'decimal:4',
        'order_to_ship_pct' => 'decimal:4',
        'on_time' => 'boolean',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(KpiSubmission::class, 'submission_id');
    }
}
