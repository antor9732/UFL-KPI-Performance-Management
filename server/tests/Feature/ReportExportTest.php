<?php

namespace Tests\Feature;

use Database\Seeders\HistoricalDataSeeder;
use Database\Seeders\MasterOrganizationSeeder;
use Database\Seeders\ReportingPeriodsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(MasterOrganizationSeeder::class);
        $this->seed(ReportingPeriodsSeeder::class);
        $this->seed(HistoricalDataSeeder::class);
    }

    public function test_can_export_85_slide_pptx_presentation(): void
    {
        $response = $this->get('/api/v1/reports/export-pptx');

        $response->assertStatus(200);
        $this->assertEquals(
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            $response->headers->get('Content-Type')
        );
        $this->assertStringContainsString('UFL_KPI_Presentation', $response->headers->get('Content-Disposition'));
    }

    public function test_can_export_presentation_with_custom_background_theme(): void
    {
        $response = $this->get('/api/v1/reports/export-pptx?theme=corporate-white');

        $response->assertStatus(200);
        $this->assertStringContainsString('corporate-white', $response->headers->get('Content-Disposition'));
    }
}
