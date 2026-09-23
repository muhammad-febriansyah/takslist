<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserPreference>
 */
class UserPreferenceFactory extends Factory
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
            'default_task_view' => 'board',
            'default_priority' => 'medium',
            'timezone' => 'Asia/Jakarta',
            'date_format' => 'DD MMM YYYY',
            'week_starts_on' => 1,
        ];
    }
}
