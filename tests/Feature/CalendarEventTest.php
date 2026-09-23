<?php

use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('shows only private calendar events and not tasks', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    CalendarEvent::factory()->for($owner)->create([
        'title' => 'Mancing sore',
        'event_date' => now()->toDateString(),
    ]);
    CalendarEvent::factory()->for($otherUser)->create([
        'title' => 'Agenda user lain',
        'event_date' => now()->toDateString(),
    ]);
    Task::factory()->for($owner)->create([
        'title' => 'Task tidak masuk calendar',
        'due_date' => now()->toDateString(),
    ]);

    $this->actingAs($owner)
        ->get(route('calendar.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('calendar/index')
            ->where('events', fn ($events): bool => $events->count() === 1
                && $events->first()['title'] === 'Mancing sore'),
        );
});

it('creates a calendar event with a selected color', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('calendar.events.store'), [
            'title' => 'Mancing sore',
            'description' => 'Bawa umpan.',
            'event_date' => '2026-09-22',
            'color' => '#4F7CAC',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('calendar.index'));

    $event = CalendarEvent::query()->where('user_id', $user->id)->first();

    expect($event->title)->toBe('Mancing sore')
        ->and($event->color)->toBe('#4F7CAC');
});

it('rejects invalid calendar colors', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('calendar.events.store'), [
            'title' => 'Agenda invalid',
            'event_date' => '2026-09-22',
            'color' => 'green',
        ])
        ->assertSessionHasErrors('color');
});
