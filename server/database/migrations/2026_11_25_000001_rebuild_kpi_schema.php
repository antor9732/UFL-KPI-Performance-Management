<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Company-neutral KPI schema that mirrors the monthly KPI presentation:
 * departments -> lines -> line staff (6 photo slots) -> monthly line metrics,
 * plus NPT reasons, KPI goals, unit (cutting/print/...) metrics and settings.
 *
 * Replaces the first prototype schema (submissions/records), which is dropped.
 */
return new class extends Migration
{
    private array $legacy = [
        'approvals', 'kpi_targets', 'production_records', 'line_cost_records', 'quality_records',
        'shipment_records', 'leftover_records', 'npt_records', 'hr_records', 'specialized_records',
        'kpi_submissions', 'kpi_definitions', 'reporting_periods', 'import_batches', 'generated_reports',
        'backup_settings', 'backup_history', 'audit_logs', 'user_invitations', 'user_roles',
        'role_permissions', 'permissions', 'roles', 'production_lines', 'employees', 'production_areas',
        'departments',
    ];

    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        foreach (array_merge($this->legacy, ['backup_logs', 'unit_metrics', 'unit_people', 'kpi_goals', 'npt_reasons',
            'line_metrics', 'line_staff', 'lines', 'app_settings']) as $table) {
            Schema::dropIfExists($table);
        }
        Schema::enableForeignKeyConstraints();

        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);              // short tab label, e.g. "Knit-01"
            $table->string('name', 150);             // full name, e.g. "Knit-01 Department"
            $table->string('kind', 20)->default('lines'); // lines = sewing lines, unit = cutting/print/...
            $table->string('head_label', 150)->nullable(); // e.g. "PM-Hafizur"
            $table->string('head_photo', 500)->nullable();
            $table->string('goal_group', 100)->nullable(); // which KPI goal table applies
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->integer('number');
            $table->string('name', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('line_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('line_id')->constrained('lines')->cascadeOnDelete();
            $table->unsignedTinyInteger('position');   // 1..6, left to right on the slide
            $table->string('role', 30)->nullable();     // IE, SUP, LC, APM, QC ...
            $table->string('name', 100)->nullable();
            $table->string('photo', 500)->nullable();
            $table->boolean('is_vacant')->default(false);
            $table->timestamps();
            $table->unique(['line_id', 'position']);
        });

        Schema::create('line_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('line_id')->constrained('lines')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month'); // 1..12, 0 = whole-year average row
            $table->decimal('eff_target', 8, 2)->nullable();
            $table->decimal('eff_ach', 8, 2)->nullable();
            $table->decimal('prod_target', 8, 2)->nullable();
            $table->decimal('prod_ach', 8, 2)->nullable();
            $table->decimal('profit_loss', 14, 2)->nullable();
            $table->decimal('idle_loss', 14, 2)->nullable();
            $table->decimal('cost_diff', 14, 2)->nullable();
            $table->decimal('sew_dhu_target', 8, 2)->nullable();
            $table->decimal('sew_dhu', 8, 2)->nullable();
            $table->decimal('fin_dhu_target', 8, 2)->nullable();
            $table->decimal('fin_dhu', 8, 2)->nullable();
            $table->timestamps();
            $table->unique(['line_id', 'year', 'month']);
        });

        Schema::create('npt_reasons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->string('reason', 255);
            $table->decimal('hours', 12, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['department_id', 'year', 'month']);
        });

        Schema::create('kpi_goals', function (Blueprint $table) {
            $table->id();
            $table->string('group_name', 100);
            $table->string('category', 150);
            $table->string('target', 50)->nullable();
            $table->string('responsible', 150)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('unit_people', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('label', 150);   // e.g. "Sup-Salam"
            $table->string('photo', 500)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('unit_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->unsignedBigInteger('unit_person_id')->default(0); // 0 = whole unit
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month'); // 0 = whole-year average row
            $table->decimal('plan', 16, 2)->nullable();
            $table->decimal('produce', 16, 2)->nullable();
            $table->decimal('eff_target', 8, 2)->nullable();
            $table->decimal('eff_ach', 8, 2)->nullable();
            $table->decimal('earning_target', 16, 2)->nullable();
            $table->decimal('earning', 16, 2)->nullable();
            $table->decimal('dhu_target', 8, 2)->nullable();
            $table->decimal('dhu', 8, 2)->nullable();
            $table->timestamps();
            $table->unique(['department_id', 'unit_person_id', 'year', 'month']);
        });

        $userColumns = [
            'is_default' => fn (Blueprint $t) => $t->boolean('is_default')->default(false),
            'google_id' => fn (Blueprint $t) => $t->string('google_id', 100)->nullable(),
            'avatar_url' => fn (Blueprint $t) => $t->string('avatar_url', 500)->nullable(),
            'google_refresh_token' => fn (Blueprint $t) => $t->text('google_refresh_token')->nullable(),
            'google_access_token' => fn (Blueprint $t) => $t->text('google_access_token')->nullable(),
            'google_token_expires_at' => fn (Blueprint $t) => $t->timestamp('google_token_expires_at')->nullable(),
            'last_backup_at' => fn (Blueprint $t) => $t->timestamp('last_backup_at')->nullable(),
        ];
        foreach ($userColumns as $column => $add) {
            if (!Schema::hasColumn('users', $column)) {
                Schema::table('users', fn (Blueprint $table) => $add($table));
            }
        }

        Schema::create('backup_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('target', 20);       // google | local
            $table->string('action', 20);       // backup | restore
            $table->string('file_name', 255)->nullable();
            $table->string('remote_id', 255)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('status', 20);       // ok | failed
            $table->text('message')->nullable();
            $table->timestamps();
        });

        // Default local user: the app always works without any login.
        DB::table('users')->where('is_default', true)->delete();
        DB::table('users')->insert([
            'name' => 'Admin',
            'email' => 'admin@local',
            'password' => bcrypt(bin2hex(random_bytes(16))),
            'is_default' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        foreach (['backup_logs', 'unit_metrics', 'unit_people', 'kpi_goals', 'npt_reasons', 'line_metrics',
            'line_staff', 'lines', 'departments', 'app_settings'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_default', 'google_id', 'avatar_url', 'google_refresh_token',
                'google_access_token', 'google_token_expires_at', 'last_backup_at']);
        });
    }
};
