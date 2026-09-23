<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskAttachment>
 */
class TaskAttachmentFactory extends Factory
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
            'original_name' => 'document.pdf',
            'disk' => 'local',
            'path' => 'tasks/'.fake()->uuid().'/document.pdf',
            'mime_type' => 'application/pdf',
            'size' => 1024,
        ];
    }
}
