<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignUuid('line_id')->nullable()->constrained('production_lines')->nullOnDelete();
            $table->date('record_date')->nullable();
            $table->string('month_name', 20)->nullable(); // e.g. "January", "October"
            $table->decimal('plan_hours', 12, 2)->default(0);
            $table->decimal('produce_hours', 12, 2)->default(0);
            $table->decimal('hour_ach_pct', 8, 4)->default(0);
            $table->integer('plan_pcs')->default(0);
            $table->integer('produce_pcs')->default(0);
            $table->decimal('pcs_ach_pct', 8, 4)->default(0);
            $table->decimal('earned_minutes', 14, 2)->default(0);
            $table->decimal('available_minutes', 14, 2)->default(0);
            $table->decimal('efficiency_pct', 8, 4)->default(0);
            $table->integer('operators_count')->default(0);
            $table->integer('helpers_count')->default(0);
            $table->timestamps();

            $table->index(['submission_id', 'line_id']);
        });

        Schema::create('line_cost_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignUuid('line_id')->nullable()->constrained('production_lines')->nullOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->decimal('budgeted_cost', 14, 2)->default(0);
            $table->decimal('actual_cost', 14, 2)->default(0);
            $table->decimal('total_profit_loss', 14, 2)->default(0);
            $table->decimal('idle_hour_loss', 14, 2)->default(0);
            $table->decimal('cost_ach_pct', 8, 4)->default(0);
            $table->decimal('costing_productivity', 10, 4)->default(0);
            $table->timestamps();

            $table->index(['submission_id', 'line_id']);
        });

        Schema::create('quality_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignUuid('line_id')->nullable()->constrained('production_lines')->nullOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->date('record_date')->nullable();
            $table->integer('checked_units')->default(0);
            $table->integer('defect_units')->default(0);
            $table->integer('total_defects')->default(0);
            $table->decimal('dhu', 8, 4)->default(0);
            $table->integer('rejection_units')->default(0);
            $table->decimal('ftt_pct', 8, 4)->default(0);
            $table->timestamps();

            $table->index(['submission_id', 'line_id']);
        });

        Schema::create('shipment_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->string('floor', 50)->nullable();
            $table->string('buyer_name', 150)->nullable();
            $table->string('order_no', 100)->nullable();
            $table->string('style_no', 100)->nullable();
            $table->integer('order_qty')->default(0);
            $table->integer('cutting_qty')->default(0);
            $table->integer('shipment_qty')->default(0);
            $table->integer('short_shipment_qty')->default(0);
            $table->decimal('cut_to_ship_pct', 8, 4)->default(0);
            $table->decimal('order_to_ship_pct', 8, 4)->default(0);
            $table->boolean('on_time')->default(true);
            $table->text('short_ship_reason')->nullable();
            $table->timestamps();

            $table->index(['submission_id', 'buyer_name']);
        });

        Schema::create('leftover_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->string('buyer_name', 150)->nullable();
            $table->string('style_no', 100)->nullable();
            $table->integer('leftover_qty')->default(0);
            $table->text('reason')->nullable();
            $table->string('warehouse_location', 100)->nullable();
            $table->timestamps();

            $table->index(['submission_id', 'buyer_name']);
        });

        Schema::create('npt_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignUuid('line_id')->nullable()->constrained('production_lines')->nullOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->string('reason_category', 150); // Material Delay, Machine Maintenance, Utility Failure, Quality Delay, etc.
            $table->decimal('loss_time_min', 12, 2)->default(0);
            $table->decimal('lost_hours', 10, 2)->default(0);
            $table->decimal('time_cost', 14, 2)->default(0);
            $table->decimal('npt_pct', 8, 4)->default(0);
            $table->text('corrective_action')->nullable();
            $table->string('responsible_person', 150)->nullable();
            $table->timestamps();

            $table->index(['submission_id', 'reason_category']);
        });

        Schema::create('hr_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->integer('total_manpower')->default(0);
            $table->integer('present_manpower')->default(0);
            $table->integer('absent_manpower')->default(0);
            $table->decimal('absenteeism_pct', 8, 4)->default(0);
            $table->integer('migration_count')->default(0);
            $table->decimal('overtime_hours', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('specialized_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->string('department_type', 50); // cutting, printing, embroidery, schiffli, sample
            $table->foreignUuid('supervisor_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('month_name', 20)->nullable();
            $table->string('metric_name', 150); // e.g. "Cutting Efficiency", "Print Earnings", "Sample RFT"
            $table->decimal('target_value', 19, 4)->nullable();
            $table->decimal('actual_value', 19, 4)->nullable();
            $table->decimal('achievement_pct', 8, 4)->nullable();
            $table->json('details')->nullable(); // flexible payload for section-specific attributes
            $table->timestamps();

            $table->index(['submission_id', 'department_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('specialized_records');
        Schema::dropIfExists('hr_records');
        Schema::dropIfExists('npt_records');
        Schema::dropIfExists('leftover_records');
        Schema::dropIfExists('shipment_records');
        Schema::dropIfExists('quality_records');
        Schema::dropIfExists('line_cost_records');
        Schema::dropIfExists('production_records');
    }
};
