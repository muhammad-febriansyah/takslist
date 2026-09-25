<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('timesheet_submissions', function (Blueprint $table): void {
            $table->string('signature_path')->nullable()->after('approved_role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('timesheet_submissions', function (Blueprint $table): void {
            $table->dropColumn('signature_path');
        });
    }
};
