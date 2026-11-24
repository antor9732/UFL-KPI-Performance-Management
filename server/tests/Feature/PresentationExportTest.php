<?php

namespace Tests\Feature;

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class PresentationExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_exports_full_deck_with_company_name_and_line_slides(): void
    {
        $this->seed(DemoSeeder::class);
        $this->putJson('/api/v1/settings', ['company_name' => 'Acme Garments']);

        $res = $this->get('/api/v1/reports/export-pptx?year=2026&month=10');
        $res->assertOk();
        $this->assertMatchesRegularExpression('/acme-garments_KPI_October_2026\.pptx/i', (string) $res->headers->get('content-disposition'));

        $file = $res->baseResponse->getFile()->getPathname();
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($file) === true);
        $slides = 0;
        $text = '';
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            $this->assertStringEndsNotWith('/', $name, 'no folder entries');
            if (preg_match('#^ppt/slides/slide\d+\.xml$#', $name)) {
                $slides++;
                $text .= $zip->getFromIndex($i);
            }
        }
        $zip->close();

        // cover + 2 goal slides + 3 line depts x (cost + lines + npt) + units + thank you
        $this->assertGreaterThan(20, $slides);
        $this->assertStringContainsString('Acme Garments', $text);
        $this->assertStringContainsString('Line No 01', $text);
        $this->assertStringContainsString('Line wise Cost Achievement', $text);
        $this->assertStringContainsString('Major Reason For NPT', $text);
        $this->assertStringNotContainsString('Utah', $text);
    }

    public function test_export_single_department(): void
    {
        $this->seed(DemoSeeder::class);
        $this->get('/api/v1/reports/export-pptx?year=2026&month=10&department_id=1')->assertOk();
    }

    public function test_export_without_departments_explains(): void
    {
        $this->getJson('/api/v1/reports/export-pptx?year=2026&month=10')->assertStatus(422)->assertJsonPath('error', 'Add at least one department before exporting.');
    }
}
