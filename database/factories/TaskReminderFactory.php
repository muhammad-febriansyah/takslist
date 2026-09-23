<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskReminder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskReminder>
 */
class TaskReminderFactory extends Factory
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
            'remind_at' => now()->addDay(),
            'sent_at' => null,
        ];
    }

    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'sent_at' => now(),
        ]);
    }
}
