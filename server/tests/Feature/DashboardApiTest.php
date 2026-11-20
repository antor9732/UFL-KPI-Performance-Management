<?php

namespace Tests\Feature;

use Database\Seeders\HistoricalDataSeeder;
use Database\Seeders\MasterOrganizationSeeder;
use Database\Seeders\ReportingPeriodsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(MasterOrganizationSeeder::class);
        $this->seed(ReportingPeriodsSeeder::class);
        $this->seed(HistoricalDataSeeder::class);
    }

    public function test_departments_api_returns_seeded_departments(): void
    {
        $response = $this->getJson('/api/v1/departments');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            '*' => ['id', 'code', 'name', 'department_type', 'head_name', 'lines']
        ]);
        $this->assertGreaterThanOrEqual(9, count($response->json()));
    }

    public function test_company_overview_api_returns_data(): void
    {
        $response = $this->getJson('/api/v1/dashboard/company-overview');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'period' => ['id', 'name', 'year', 'month'],
            'summary' => ['total_plan_pcs', 'total_produce_pcs', 'overall_plan_achievement_pct', 'total_departments'],
            'departments' => [
                '*' => ['department_id', 'code', 'name', 'status', 'plan_pcs', 'produce_pcs', 'achievement_pct', 'status_color']
            ]
        ]);
    }

    public function test_reporting_periods_api(): void
    {
        $response = $this->getJson('/api/v1/reporting-periods');

        $response->assertStatus(200);
        $this->assertCount(12, $response->json());
    }

    public function test_department_details_api(): void
    {
        $dept = \App\Models\Department::where('code', 'KNIT-01')->first();
        $response = $this->getJson('/api/v1/dashboard/department/' . $dept->id);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'department' => ['id', 'code', 'name'],
            'lines',
            'monthly_trends' => [
                '*' => ['period_name', 'month', 'status', 'plan_pcs', 'produce_pcs', 'achievement_pct']
            ]
        ]);
    }
}
