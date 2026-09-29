<?php

use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\User;

it('returns visible tasks and own agendas for global search', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $ownTask = Task::factory()->for($user)->create(['title' => 'Support laporan BPR']);
    $ownAgenda = CalendarEvent::factory()->for($user)->create(['title' => 'Support meeting']);
    Task::factory()->for($otherUser)->create(['title' => 'Support private task']);
    CalendarEvent::factory()->for($otherUser)->create(['title' => 'Support private agenda']);

    $this->actingAs($user)
        ->getJson(route('search', ['q' => 'support']))
        ->assertOk()
        ->assertJsonCount(2, 'results')
        ->assertJsonFragment(['type' => 'task', 'id' => $ownTask->id, 'title' => 'Support laporan BPR'])
        ->assertJsonFragment(['type' => 'agenda', 'id' => $ownAgenda->id, 'title' => 'Support meeting'])
        ->assertJsonMissing(['title' => 'Support private task'])
        ->assertJsonMissing(['title' => 'Support private agenda']);
});

it('returns an empty result for a blank global search', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('search'))
        ->assertOk()
        ->assertExactJson(['results' => []]);
});

it('keeps atasan global search private from subordinate tasks', function () {
    $atasan = User::factory()->atasan()->create();
    $subordinate = User::factory()->state(['supervisor_id' => $atasan->id])->create();
    Task::factory()->for($atasan)->create(['title' => 'Support task atasan']);
    Task::factory()->for($subordinate)->create(['title' => 'Support task bawahan']);

    $this->actingAs($atasan)
        ->getJson(route('search', ['q' => 'support']))
        ->assertOk()
        ->assertJsonFragment(['title' => 'Support task atasan'])
        ->assertJsonMissing(['title' => 'Support task bawahan']);
});
