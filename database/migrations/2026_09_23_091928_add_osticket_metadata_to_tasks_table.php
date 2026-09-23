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
        Schema::table('tasks', function (Blueprint $table): void {
            $table->string('external_source', 30)->default('local')->after('description');
            $table->unsignedBigInteger('external_ticket_id')->nullable()->after('external_source');
            $table->string('external_ticket_number', 30)->nullable()->after('external_ticket_id');
            $table->string('external_status', 30)->nullable()->after('external_ticket_number');
            $table->string('external_assignee_name', 255)->nullable()->after('external_status');

            $table->unique(['external_source', 'external_ticket_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropUnique(['external_source', 'external_ticket_id']);
            $table->dropColumn([
                'external_source',
                'external_ticket_id',
                'external_ticket_number',
                'external_status',
                'external_assignee_name',
            ]);
        });
    }
};
