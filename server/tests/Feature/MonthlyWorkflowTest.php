<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\ReportingPeriod;
use Database\Seeders\HistoricalDataSeeder;
use Database\Seeders\MasterOrganizationSeeder;
use Database\Seeders\ReportingPeriodsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(MasterOrganizationSeeder::class);
        $this->seed(ReportingPeriodsSeeder::class);
        $this->seed(HistoricalDataSeeder::class);
    }

    public function test_clone_previous_month_to_november(): void
    {
        // Source: October 2026 (Month 10)
        // Target: November 2026 (Month 11)
        $octPeriod = ReportingPeriod::where('year', 2026)->where('month', 10)->first();
        $novPeriod = ReportingPeriod::where('year', 2026)->where('month', 11)->first();

        $response = $this->postJson('/api/v1/submissions/clone-previous-period', [
            'source_period_id' => $octPeriod->id,
            'target_period_id' => $novPeriod->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'source_period' => 'October 2026',
            'target_period' => 'November 2026',
        ]);

        // Verify that Knit-01 has a cloned draft for November
        $knit01 = Department::where('code', 'KNIT-01')->first();
        $this->assertDatabaseHas('kpi_submissions', [
            'reporting_period_id' => $novPeriod->id,
            'department_id' => $knit01->id,
            'status' => 'draft',
        ]);
    }

    public function test_personnel_api_lists_roles_and_departments(): void
    {
        $response = $this->getJson('/api/v1/personnel');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'departments',
            'roles',
            'employees',
        ]);
    }
}
