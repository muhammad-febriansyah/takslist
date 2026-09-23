<?php

namespace Database\Factories;

use App\Models\CalendarEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CalendarEvent>
 */
class CalendarEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'event_date' => fake()->date(),
            'color' => fake()->randomElement(['#2D875C', '#D88B20', '#4F7CAC', '#A855F7']),
        ];
    }
}
