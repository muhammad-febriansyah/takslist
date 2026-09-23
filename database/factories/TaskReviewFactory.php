<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskReview>
 */
class TaskReviewFactory extends Factory
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
            'submitted_by' => User::factory(),
            'reviewer_id' => User::factory()->state(['role' => 'atasan']),
            'status' => 'pending',
            'note' => null,
            'signature_path' => null,
            'signed_at' => null,
        ];
    }
}
