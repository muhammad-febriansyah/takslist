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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('todo');
            $table->string('priority', 20)->default('medium');
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->unsignedBigInteger('sort_order')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'sort_order']);
            $table->index(['user_id', 'project_id']);
            $table->index(['user_id', 'due_date']);
            $table->index(['user_id', 'priority']);
            $table->index(['user_id', 'completed_at']);
            $table->index(['project_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
