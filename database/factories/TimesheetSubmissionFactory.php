<?php

namespace Database\Factories;

use App\Models\TimesheetSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimesheetSubmission>
 */
class TimesheetSubmissionFactory extends Factory
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
            'period' => '2026-09',
            'status' => 'pending',
            'department' => 'IT',
            'client' => 'SIM',
            'approved_by' => 'Atasan',
            'approved_role' => 'Atasan',
            'submitted_at' => now(),
        ];
    }
}
