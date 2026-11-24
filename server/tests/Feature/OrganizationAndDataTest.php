<?php

namespace Tests\Feature;

use App\Models\LineMetric;
use App\Models\LineStaff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrganizationAndDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_name_is_a_setting_not_hard_coded(): void
    {
        $this->getJson('/api/v1/settings')->assertOk()->assertJsonPath('company_name', 'Your Company Ltd.');
        $this->putJson('/api/v1/settings', ['company_name' => 'Acme Garments'])->assertOk()->assertJsonPath('company_name', 'Acme Garments');
        $this->getJson('/api/v1/settings')->assertJsonPath('company_name', 'Acme Garments');
    }

    public function test_create_department_with_lines_and_six_staff_slots(): void
    {
        $dept = $this->postJson('/api/v1/departments', ['code' => 'Knit-01', 'name' => 'Knit-01 Department', 'kind' => 'lines', 'line_count' => 3])
            ->assertCreated()->json();
        $this->assertCount(3, $dept['lines']);
        $this->assertCount(6, $dept['lines'][0]['staff']);
        $this->assertSame('IE', $dept['lines'][0]['staff'][0]['role']);
        $this->assertTrue($dept['lines'][0]['staff'][0]['is_vacant']);
    }

    public function test_staff_photo_upload_name_and_vacancy(): void
    {
        Storage::fake('public');
        $dept = $this->postJson('/api/v1/departments', ['code' => 'W', 'name' => 'Woven', 'kind' => 'lines', 'line_count' => 1])->json();
        $lineId = $dept['lines'][0]['id'];

        $res = $this->post("/api/v1/lines/{$lineId}/staff/2", [
            'role' => 'SUP', 'name' => 'Santa', 'photo' => UploadedFile::fake()->image('santa.jpg', 1200, 1600),
        ], ['Accept' => 'application/json'])->assertOk()->json();

        $slot = $res['staff'][1];
        $this->assertSame('Santa', $slot['name']);
        $this->assertFalse($slot['is_vacant']);
        $this->assertStringStartsWith('/storage/photos/', $slot['photo_url']);
        $path = LineStaff::where('line_id', $lineId)->where('position', 2)->value('photo');
        Storage::disk('public')->assertExists($path);
        // big photos are shrunk to keep decks small
        [$w, $h] = getimagesize(Storage::disk('public')->path($path));
        $this->assertLessThanOrEqual(600, max($w, $h));

        $this->post("/api/v1/lines/{$lineId}/staff/2", ['is_vacant' => '1'], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('staff.1.is_vacant', true);
    }

    public function test_save_line_metrics_and_cost_diff_is_derived(): void
    {
        $dept = $this->postJson('/api/v1/departments', ['code' => 'K', 'name' => 'K', 'kind' => 'lines', 'line_count' => 2])->json();
        $lineId = $dept['lines'][0]['id'];

        $this->putJson("/api/v1/departments/{$dept['id']}/line-metrics", [
            'year' => 2026, 'month' => 10,
            'rows' => [['line_id' => $lineId, 'eff_target' => 80, 'eff_ach' => 83, 'profit_loss' => 1016, 'idle_loss' => -135, 'sew_dhu' => 3.44]],
        ])->assertOk();

        $m = LineMetric::where(['line_id' => $lineId, 'year' => 2026, 'month' => 10])->first();
        $this->assertEquals(881, $m->cost_diff);
        $this->assertEquals(3.44, $m->sew_dhu);
    }

    public function test_copy_previous_month_targets_into_empty_cells(): void
    {
        $dept = $this->postJson('/api/v1/departments', ['code' => 'K', 'name' => 'K', 'kind' => 'lines', 'line_count' => 1])->json();
        $lineId = $dept['lines'][0]['id'];
        LineMetric::create(['line_id' => $lineId, 'year' => 2026, 'month' => 9, 'eff_target' => 80, 'eff_ach' => 82, 'prod_target' => 110, 'sew_dhu_target' => 3, 'fin_dhu_target' => 2]);

        $res = $this->postJson("/api/v1/departments/{$dept['id']}/copy-previous", ['year' => 2026, 'month' => 10, 'mode' => 'targets'])->assertOk()->json();
        $this->assertSame(1, $res['copied']);
        $row = $res['rows'][0];
        $this->assertEquals(80, $row['eff_target']);
        $this->assertEquals(110, $row['prod_target']);
        $this->assertNull($row['eff_ach']); // actuals are not copied in "targets" mode
    }

    public function test_npt_and_unit_metrics_round_trip(): void
    {
        $knit = $this->postJson('/api/v1/departments', ['code' => 'K', 'name' => 'K', 'kind' => 'lines', 'line_count' => 1])->json();
        $this->putJson("/api/v1/departments/{$knit['id']}/npt", ['year' => 2026, 'month' => 10, 'reasons' => [
            ['reason' => 'Fabric delay', 'hours' => 400], ['reason' => 'Machine breakdown', 'hours' => 46],
        ]])->assertOk()->assertJsonCount(2, 'reasons');

        $cut = $this->postJson('/api/v1/departments', ['code' => 'Cutting', 'name' => 'Cutting', 'kind' => 'unit'])->json();
        $sup = $this->post("/api/v1/departments/{$cut['id']}/unit-people", ['label' => 'Sup-Salam'], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->putJson("/api/v1/departments/{$cut['id']}/unit-metrics", ['year' => 2026, 'month' => 10, 'rows' => [
            ['unit_person_id' => 0, 'plan' => 1000, 'produce' => 990, 'eff_target' => 85, 'eff_ach' => 84],
            ['unit_person_id' => $sup['id'], 'plan' => 500, 'produce' => 500, 'eff_ach' => 86],
        ]])->assertOk()->assertJsonPath('rows.0.plan', 1000)->assertJsonPath('rows.1.eff_ach', 86);
    }

    public function test_dashboard_and_department_view(): void
    {
        $this->seed(\Database\Seeders\DemoSeeder::class);
        $this->getJson('/api/v1/dashboard?year=2026&month=10')->assertOk()
            ->assertJsonPath('company_name', 'Your Company Ltd.')
            ->assertJsonStructure(['totals' => ['cost_ytd', 'eff_ach', 'sew_dhu'], 'departments' => [['id', 'code', 'summary']]]);
        $this->getJson('/api/v1/dashboard/department/1?year=2026&month=10')->assertOk()
            ->assertJsonStructure(['department' => ['lines' => [['label', 'rows', 'ytd', 'staff']], 'prod_rows', 'cost_rows']]);
    }

    public function test_reset_data_requires_confirmation(): void
    {
        $this->seed(\Database\Seeders\DemoSeeder::class);
        $this->postJson('/api/v1/settings/reset-data', ['confirm' => 'nope'])->assertStatus(422);
        $this->postJson('/api/v1/settings/reset-data', ['confirm' => 'DELETE'])->assertOk();
        $this->getJson('/api/v1/departments')->assertOk()->assertJsonCount(0);
    }
}
