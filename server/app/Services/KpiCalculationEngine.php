<?php

namespace App\Services;

class KpiCalculationEngine
{
    /**
     * Calculate Plan Achievement (%)
     * Safeguard: zero planned output returns 0 or null
     */
    public function calculatePlanAchievement(float|int $actualOutput, float|int $plannedOutput): ?float
    {
        if ($plannedOutput <= 0) {
            return $actualOutput > 0 ? 100.0 : 0.0;
        }

        return round(($actualOutput / $plannedOutput) * 100, 2);
    }

    /**
     * Calculate Sewing Efficiency (%)
     * Formula: (Standard Earned Minutes / Available Working Minutes) * 100
     */
    public function calculateEfficiency(float $earnedMinutes, float $availableMinutes): ?float
    {
        if ($availableMinutes <= 0) {
            return 0.0;
        }

        return round(($earnedMinutes / $availableMinutes) * 100, 2);
    }

    /**
     * Calculate Defects per Hundred Units (DHU %)
     * Formula: (Defect Count / Checked Units) * 100
     */
    public function calculateDHU(int $defectUnits, int $checkedUnits): float
    {
        if ($checkedUnits <= 0) {
            return 0.0;
        }

        return round(($defectUnits / $checkedUnits) * 100, 2);
    }

    /**
     * Calculate Line Cost Achievement (%)
     * Formula: (Budgeted Line Cost / Actual Line Cost) * 100
     */
    public function calculateLineCostAchievement(float $budgetedCost, float $actualCost): ?float
    {
        if ($actualCost <= 0) {
            return null;
        }

        return round(($budgetedCost / $actualCost) * 100, 2);
    }

    /**
     * Calculate Cut to Ship Ratio (%)
     */
    public function calculateCutToShip(int $shipmentQty, int $cuttingQty): ?float
    {
        if ($cuttingQty <= 0) {
            return null;
        }

        return round(($shipmentQty / $cuttingQty) * 100, 2);
    }

    /**
     * Calculate Order to Ship Ratio (%)
     */
    public function calculateOrderToShip(int $shipmentQty, int $orderQty): ?float
    {
        if ($orderQty <= 0) {
            return null;
        }

        return round(($shipmentQty / $orderQty) * 100, 2);
    }

    /**
     * Calculate Short Shipment Quantity
     */
    public function calculateShortShipment(int $orderQty, int $shipmentQty): int
    {
        return max(0, $orderQty - $shipmentQty);
    }

    /**
     * Calculate Absenteeism Rate (%)
     */
    public function calculateAbsenteeism(int $absentManpower, int $totalManpower): float
    {
        if ($totalManpower <= 0) {
            return 0.0;
        }

        return round(($absentManpower / $totalManpower) * 100, 2);
    }

    /**
     * Calculate Sample Right-First-Time (RFT %)
     */
    public function calculateSampleRFT(int $firstPassApproved, int $totalSubmitted): float
    {
        if ($totalSubmitted <= 0) {
            return 0.0;
        }

        return round(($firstPassApproved / $totalSubmitted) * 100, 2);
    }

    /**
     * Evaluate performance status color (green, yellow, red, grey)
     */
    public function evaluateStatus(
        ?float $actualValue,
        float $targetValue,
        ?float $warningThreshold = null,
        string $direction = 'higher_is_better'
    ): string {
        if ($actualValue === null) {
            return 'grey';
        }

        $warning = $warningThreshold ?? ($direction === 'higher_is_better' ? $targetValue * 0.95 : $targetValue * 1.05);

        if ($direction === 'higher_is_better') {
            if ($actualValue >= $targetValue) {
                return 'green';
            }
            if ($actualValue >= $warning) {
                return 'yellow';
            }
            return 'red';
        }

        if ($direction === 'lower_is_better') {
            if ($actualValue <= $targetValue) {
                return 'green';
            }
            if ($actualValue <= $warning) {
                return 'yellow';
            }
            return 'red';
        }

        return abs($actualValue - $targetValue) < 0.001 ? 'green' : 'red';
    }

    /**
     * Calculate Weighted YTD ratio across an array of period records
     * Strictly avoids averaging percentages.
     *
     * @param array $records array of items with numerator and denominator keys
     */
    public function calculateWeightedYtd(array $records, string $numeratorKey, string $denominatorKey): ?float
    {
        $sumNumerator = 0.0;
        $sumDenominator = 0.0;

        foreach ($records as $rec) {
            $sumNumerator += (float) ($rec[$numeratorKey] ?? 0);
            $sumDenominator += (float) ($rec[$denominatorKey] ?? 0);
        }

        if ($sumDenominator <= 0) {
            return null;
        }

        return round(($sumNumerator / $sumDenominator) * 100, 2);
    }
}
