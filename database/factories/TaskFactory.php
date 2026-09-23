<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'project_id' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => 'todo',
            'priority' => 'medium',
            'start_date' => null,
            'due_date' => null,
            'sort_order' => fake()->numberBetween(1000, 100000),
            'completed_at' => null,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
        ]);
    }

    public function review(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'review',
        ]);
    }

    public function done(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'done',
            'completed_at' => now(),
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => 'high',
        ]);
    }
}
