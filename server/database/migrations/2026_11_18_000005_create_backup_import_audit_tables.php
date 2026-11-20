<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignUuid('reporting_period_id')->nullable()->constrained('reporting_periods')->nullOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_filename', 255);
            $table->string('stored_filepath', 500);
            $table->integer('rows_total')->default(0);
            $table->integer('rows_successful')->default(0);
            $table->integer('rows_failed')->default(0);
            $table->json('error_summary')->nullable();
            $table->timestamps();
        });

        Schema::create('generated_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reporting_period_id')->constrained('reporting_periods')->cascadeOnDelete();
            $table->string('report_type', 50); // full_company_pptx, dept_pptx, pdf_summary, excel_dump
            $table->json('scope_filter')->nullable();
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_path', 500);
            $table->bigInteger('file_size_bytes')->default(0);
            $table->timestamps();
        });

        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('auto_backup_enabled')->default(true);
            $table->string('cron_schedule', 50)->default('0 2 * * *');
            $table->string('timezone', 50)->default('Asia/Dhaka');
            $table->smallInteger('retention_daily')->default(7);
            $table->smallInteger('retention_weekly')->default(4);
            $table->smallInteger('retention_monthly')->default(12);
            $table->string('google_drive_folder_id', 255)->nullable();
            $table->string('connected_google_email', 150)->nullable();
            $table->timestamp('last_successful_backup_at')->nullable();
            $table->timestamps();
        });

        Schema::create('backup_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('backup_type', 30)->default('scheduled'); // scheduled, manual, pre_migration
            $table->string('archive_filename', 255);
            $table->bigInteger('file_size_bytes')->default(0);
            $table->string('sha256_checksum', 64);
            $table->boolean('encrypted_status')->default(true);
            $table->string('google_drive_file_id', 255)->nullable();
            $table->string('upload_status', 30)->default('pending'); // pending, completed, failed
            $table->string('source_host_id', 100)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('entity_type', 100)->nullable();
            $table->string('entity_id', 100)->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['entity_type', 'entity_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('backup_history');
        Schema::dropIfExists('backup_settings');
        Schema::dropIfExists('generated_reports');
        Schema::dropIfExists('import_batches');
    }
};
