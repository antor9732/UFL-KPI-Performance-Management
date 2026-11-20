<?php

namespace Tests\Unit;

use App\Services\KpiCalculationEngine;
use PHPUnit\Framework\TestCase;

class KpiCalculationEngineTest extends TestCase
{
    private KpiCalculationEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new KpiCalculationEngine();
    }

    public function test_plan_achievement_normal_calculation(): void
    {
        $result = $this->engine->calculatePlanAchievement(424642, 408159);
        $this->assertEquals(104.04, $result);
    }

    public function test_plan_achievement_handles_zero_planned(): void
    {
        $result = $this->engine->calculatePlanAchievement(0, 0);
        $this->assertEquals(0.0, $result);

        $result2 = $this->engine->calculatePlanAchievement(100, 0);
        $this->assertEquals(100.0, $result2);
    }

    public function test_efficiency_calculation(): void
    {
        // 50,000 earned mins / 60,000 available mins * 100 = 83.33%
        $result = $this->engine->calculateEfficiency(50000, 60000);
        $this->assertEquals(83.33, $result);
    }

    public function test_efficiency_handles_zero_available_mins(): void
    {
        $result = $this->engine->calculateEfficiency(1000, 0);
        $this->assertEquals(0.0, $result);
    }

    public function test_dhu_calculation(): void
    {
        // 45 defects / 1500 checked * 100 = 3.00%
        $result = $this->engine->calculateDHU(45, 1500);
        $this->assertEquals(3.0, $result);
    }

    public function test_dhu_handles_zero_checked_units(): void
    {
        $result = $this->engine->calculateDHU(0, 0);
        $this->assertEquals(0.0, $result);
    }

    public function test_short_shipment_calculation(): void
    {
        $result = $this->engine->calculateShortShipment(10000, 9500);
        $this->assertEquals(500, $result);

        // Over-shipment should not produce negative short shipment
        $result2 = $this->engine->calculateShortShipment(10000, 10500);
        $this->assertEquals(0, $result2);
    }

    public function test_weighted_ytd_calculation(): void
    {
        // Two months with different sample sizes:
        // Month 1: 10 defects / 1,000 checked (1.0%)
        // Month 2: 50 defects / 10,000 checked (0.5%)
        // Simple average would be (1.0 + 0.5) / 2 = 0.75%
        // Weighted YTD must be: (10 + 50) / (1000 + 10000) * 100 = 60 / 11000 * 100 = 0.55%
        $records = [
            ['defects' => 10, 'checked' => 1000],
            ['defects' => 50, 'checked' => 10000],
        ];

        $ytd = $this->engine->calculateWeightedYtd($records, 'defects', 'checked');
        $this->assertEquals(0.55, $ytd);
    }

    public function test_status_color_evaluation_higher_is_better(): void
    {
        // Target: 85%, Warning: 80%
        $green = $this->engine->evaluateStatus(86.0, 85.0, 80.0, 'higher_is_better');
        $this->assertEquals('green', $green);

        $yellow = $this->engine->evaluateStatus(82.0, 85.0, 80.0, 'higher_is_better');
        $this->assertEquals('yellow', $yellow);

        $red = $this->engine->evaluateStatus(75.0, 85.0, 80.0, 'higher_is_better');
        $this->assertEquals('red', $red);
    }

    public function test_status_color_evaluation_lower_is_better(): void
    {
        // Target DHU: 3.0%, Warning: 3.5%
        $green = $this->engine->evaluateStatus(2.5, 3.0, 3.5, 'lower_is_better');
        $this->assertEquals('green', $green);

        $yellow = $this->engine->evaluateStatus(3.2, 3.0, 3.5, 'lower_is_better');
        $this->assertEquals('yellow', $yellow);

        $red = $this->engine->evaluateStatus(4.2, 3.0, 3.5, 'lower_is_better');
        $this->assertEquals('red', $red);
    }
}
