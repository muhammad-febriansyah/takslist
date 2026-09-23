<?php

use App\Models\Task;
use App\Models\User;

it('allows owner to update and delete a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('tasks.update', $task), [
            'title' => 'Task diperbarui',
            'priority' => 'high',
            'due_date' => '2026-09-30',
        ])
        ->assertRedirect();

    expect($task->refresh()->title)->toBe('Task diperbarui')
        ->and($task->priority)->toBe('high');

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect(Task::find($task->id))->toBeNull();
});

it('prevents users from modifying another users task', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($owner)->create();

    $this->actingAs($otherUser)
        ->put(route('tasks.update', $task), ['title' => 'Tidak boleh'])
        ->assertForbidden();

    $this->actingAs($otherUser)
        ->delete(route('tasks.destroy', $task))
        ->assertForbidden();

    expect(Task::find($task->id))->not->toBeNull();
});

it('bulk deletes only tasks owned by authenticated user', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $firstTask = Task::factory()->for($owner)->create();
    $secondTask = Task::factory()->for($owner)->create();
    $otherTask = Task::factory()->for($otherUser)->create();

    $this->actingAs($owner)
        ->delete(route('tasks.bulk-destroy'), [
            'task_ids' => [$firstTask->id, $secondTask->id],
        ])
        ->assertRedirect();

    expect(Task::find($firstTask->id))->toBeNull()
        ->and(Task::find($secondTask->id))->toBeNull()
        ->and(Task::find($otherTask->id))->not->toBeNull();
});

it('rejects bulk deletion containing another users task', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $ownedTask = Task::factory()->for($owner)->create();
    $otherTask = Task::factory()->for($otherUser)->create();

    $this->actingAs($owner)
        ->delete(route('tasks.bulk-destroy'), [
            'task_ids' => [$ownedTask->id, $otherTask->id],
        ])
        ->assertSessionHasErrors('task_ids');

    expect(Task::find($ownedTask->id))->not->toBeNull()
        ->and(Task::find($otherTask->id))->not->toBeNull();
});
