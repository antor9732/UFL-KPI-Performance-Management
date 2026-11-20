<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reporting_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 50); // e.g. "October 2026", "2026-10"
            $table->string('period_type', 20)->default('monthly'); // monthly, quarterly, yearly
            $table->smallInteger('year');
            $table->tinyInteger('month');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique(['period_type', 'year', 'month']);
        });

        Schema::create('kpi_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique(); // PLAN_ACH, EFF, DHU, LINE_COST_ACH, NPT_HOURS, etc.
            $table->string('name', 150);
            $table->string('category', 50); // production, quality, cost, shipment, npt, hr, cutting, printing, etc.
            $table->string('unit', 30)->default('%'); // %, hours, units, currency, count
            $table->tinyInteger('precision_decimals')->default(2);
            $table->string('performance_direction', 30)->default('higher_is_better'); // higher_is_better, lower_is_better, exact
            $table->string('aggregation_type', 30)->default('weighted_sum'); // weighted_sum, sum, average, last
            $table->text('formula_expression')->nullable(); // description or expression
            $table->json('formula_metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('kpi_targets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kpi_definition_id')->constrained('kpi_definitions')->cascadeOnDelete();
            $table->string('scope_type', 30)->default('company'); // company, department, line, supervisor
            $table->uuid('scope_id')->nullable();
            $table->decimal('target_value', 19, 4);
            $table->decimal('warning_threshold', 19, 4)->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index(['kpi_definition_id', 'scope_type', 'scope_id']);
        });

        Schema::create('kpi_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reporting_period_id')->constrained('reporting_periods')->cascadeOnDelete();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('draft'); // draft, submitted, approved, rejected, revision_required
            $table->text('submission_notes')->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->integer('version')->default(1);
            $table->timestamps();

            $table->unique(['reporting_period_id', 'department_id', 'version']);
        });

        Schema::create('approvals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kpi_submission_id')->constrained('kpi_submissions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 30); // submit, approve, reject, request_revision, revise
            $table->text('comments')->nullable();
            $table->string('reason_for_change', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approvals');
        Schema::dropIfExists('kpi_submissions');
        Schema::dropIfExists('kpi_targets');
        Schema::dropIfExists('kpi_definitions');
        Schema::dropIfExists('reporting_periods');
    }
};
