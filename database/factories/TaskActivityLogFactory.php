<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskActivityLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskActivityLog>
 */
class TaskActivityLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'action' => 'created',
            'metadata' => [],
            'created_at' => now(),
        ];
    }
}
