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
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('default_task_view', 20)->default('board');
            $table->string('default_priority', 20)->default('medium');
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->string('date_format', 32)->default('DD MMM YYYY');
            $table->unsignedTinyInteger('week_starts_on')->default(1);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
