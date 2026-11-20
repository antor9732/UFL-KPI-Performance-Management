<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KpiSubmission extends Model
{
    use HasUuids;

    protected $fillable = [
        'reporting_period_id',
        'department_id',
        'submitted_by_user_id',
        'status',
        'submission_notes',
        'approved_by_user_id',
        'approved_at',
        'version',
    ];

    protected $casts = [
        'version' => 'integer',
        'approved_at' => 'datetime',
    ];

    public function reportingPeriod(): BelongsTo
    {
        return $this->belongsTo(ReportingPeriod::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(Approval::class);
    }

    public function productionRecords(): HasMany
    {
        return $this->hasMany(ProductionRecord::class, 'submission_id');
    }

    public function lineCostRecords(): HasMany
    {
        return $this->hasMany(LineCostRecord::class, 'submission_id');
    }

    public function qualityRecords(): HasMany
    {
        return $this->hasMany(QualityRecord::class, 'submission_id');
    }

    public function shipmentRecords(): HasMany
    {
        return $this->hasMany(ShipmentRecord::class, 'submission_id');
    }

    public function leftoverRecords(): HasMany
    {
        return $this->hasMany(LeftoverRecord::class, 'submission_id');
    }

    public function nptRecords(): HasMany
    {
        return $this->hasMany(NptRecord::class, 'submission_id');
    }

    public function hrRecords(): HasMany
    {
        return $this->hasMany(HrRecord::class, 'submission_id');
    }

    public function specializedRecords(): HasMany
    {
        return $this->hasMany(SpecializedRecord::class, 'submission_id');
    }
}
