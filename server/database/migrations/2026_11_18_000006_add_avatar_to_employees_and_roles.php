<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('avatar_url', 500)->nullable()->after('designation');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->string('avatar_url', 500)->nullable()->after('description');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->string('head_avatar_url', 500)->nullable()->after('head_name');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn('head_avatar_url');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });
    }
};
