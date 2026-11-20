<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->string('department_type', 50)->default('production'); // production, cutting, printing, embroidery, schiffli, sample, hr, quality
            $table->string('head_name', 150)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('production_areas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('floor_location', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('employee_code', 50)->unique();
            $table->string('full_name', 150);
            $table->string('designation', 100)->nullable();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('phone', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('production_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignUuid('production_area_id')->nullable()->constrained('production_areas')->nullOnDelete();
            $table->string('line_number', 50); // e.g. "Line No 01", "Line-01"
            $table->string('line_name', 150)->nullable();
            $table->foreignUuid('supervisor_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->integer('standard_manpower')->default(0);
            $table->decimal('standard_smv', 8, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_lines');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('production_areas');
        Schema::dropIfExists('departments');
    }
};
