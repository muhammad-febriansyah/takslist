<?php

use App\Models\Task;
use App\Models\User;

it('shows admin monitoring only to admins', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->get(route('admin.monitoring'))
        ->assertInertia(fn ($page) => $page->component('admin/index'));

    $this->actingAs($user)
        ->get(route('admin.monitoring'))
        ->assertForbidden();
});

it('shows supervisors their own and direct subordinate tasks only', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state(['supervisor_id' => $supervisor->id])->create();
    $otherUser = User::factory()->create();
    $ownTask = Task::factory()->for($supervisor)->create(['title' => 'Task atasan', 'sort_order' => 1000]);
    $subordinateTask = Task::factory()->for($subordinate)->create(['title' => 'Task bawahan', 'sort_order' => 2000]);
    Task::factory()->for($otherUser)->create(['title' => 'Task privat lain']);

    $this->actingAs($supervisor)
        ->get(route('tasks.index'))
        ->assertInertia(fn ($page) => $page
            ->component('tasks/index')
            ->has('tasks', 2)
            ->where('tasks.0.id', $ownTask->id)
            ->where('tasks.1.id', $subordinateTask->id));
});

it('keeps admin from creating tasks', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('tasks.store'), ['title' => 'Tidak boleh'])
        ->assertForbidden();
});

it('lets admin inspect all tasks and filter by owner', function () {
    $admin = User::factory()->admin()->create();
    $firstUser = User::factory()->create();
    $secondUser = User::factory()->create();
    $firstTask = Task::factory()->for($firstUser)->create(['title' => 'Task pertama']);
    Task::factory()->for($secondUser)->create(['title' => 'Task kedua']);

    $this->actingAs($admin)
        ->get(route('tasks.index'))
        ->assertInertia(fn ($page) => $page->has('tasks', 2)->has('users', 3));

    $this->actingAs($admin)
        ->get(route('tasks.index', ['user_id' => $firstUser->id]))
        ->assertInertia(fn ($page) => $page->has('tasks', 1)->where('tasks.0.id', $firstTask->id));
});

it('filters task list by month while keeping undated tasks available', function () {
    $admin = User::factory()->admin()->create();
    $currentTask = Task::factory()->for($admin)->create(['due_date' => '2026-09-12', 'sort_order' => 1000]);
    $oldTask = Task::factory()->for($admin)->create(['due_date' => '2020-01-12', 'sort_order' => 3000]);
    $undatedTask = Task::factory()->for($admin)->create(['due_date' => null, 'sort_order' => 2000]);

    $this->actingAs($admin)
        ->get(route('tasks.index', ['period' => '2026-09']))
        ->assertInertia(fn ($page) => $page
            ->has('tasks', 2)
            ->where('tasks.0.id', $currentTask->id)
            ->where('tasks.1.id', $undatedTask->id)
            ->where('period', '2026-09'));

    expect($oldTask->exists)->toBeTrue();
});

test('redirects the root page to login', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
