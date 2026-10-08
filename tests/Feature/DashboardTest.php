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

test('admin dashboard only includes admin owned tasks', function () {
    $admin = User::factory()->admin()->create();
    $otherUser = User::factory()->create();
    $ownedTask = Task::factory()->for($admin)->create([
        'title' => 'Task admin',
        'status' => 'in_progress',
    ]);
    Task::factory()->for($otherUser)->create([
        'title' => 'Task user lain',
        'status' => 'done',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 1)
            ->where('stats.in_progress', 1)
            ->where('stats.completed', 0)
            ->where('recentTasks.0.id', $ownedTask->id)
            ->missing('recentTasks.1'));
});

test('supervisor dashboard only includes supervisor owned tasks', function () {
    $supervisor = User::factory()->atasan()->create();
    $subordinate = User::factory()->create(['supervisor_id' => $supervisor->id]);
    $ownedTask = Task::factory()->for($supervisor)->create([
        'title' => 'Task atasan',
        'status' => 'in_progress',
    ]);
    Task::factory()->for($subordinate)->create([
        'title' => 'Task bawahan',
        'status' => 'done',
    ]);

    $this->actingAs($supervisor)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('stats.total', 1)
            ->where('stats.in_progress', 1)
            ->where('stats.completed', 0)
            ->where('recentTasks.0.id', $ownedTask->id)
            ->missing('recentTasks.1'));
});
