<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add Google OAuth & status fields to users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_sub', 100)->nullable()->unique()->after('id');
            $table->string('avatar_url', 500)->nullable()->after('email');
            $table->foreignUuid('department_id')->nullable()->after('avatar_url')->constrained('departments')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('department_id');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('name', 100);
            $table->string('module', 50);
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignUuid('line_id')->nullable()->constrained('production_lines')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('user_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email', 150);
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 128)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_invitations');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['google_sub', 'avatar_url', 'department_id', 'is_active', 'last_login_at']);
        });
    }
};
