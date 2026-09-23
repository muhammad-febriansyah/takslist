<?php

use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard metrics only include authenticated users private data', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    Task::factory()->for($user)->create(['status' => 'in_progress']);
    Task::factory()->for($otherUser)->create(['status' => 'done']);
    CalendarEvent::factory()->for($user)->create(['event_date' => now()->addDay()->toDateString()]);
    CalendarEvent::factory()->for($otherUser)->create(['event_date' => now()->addDay()->toDateString()]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('stats.total', 1)
            ->where('stats.in_progress', 1)
            ->where('stats.completed', 0)
            ->where('stats.calendar_events', 1));
});
