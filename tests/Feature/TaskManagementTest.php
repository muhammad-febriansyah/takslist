<?php

use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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
            'task_ids' => [$secondTask->id, $firstTask->id],
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

it('bulk updates status and completion time only for owned tasks', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $firstTask = Task::factory()->for($owner)->create(['status' => 'in_progress']);
    $secondTask = Task::factory()->for($owner)->create(['status' => 'review']);
    $otherTask = Task::factory()->for($otherUser)->create(['status' => 'in_progress']);

    $this->actingAs($owner)
        ->patch(route('tasks.bulk-status'), [
            'task_ids' => [$secondTask->id, $firstTask->id],
            'status' => 'done',
        ])
        ->assertRedirect();

    expect($firstTask->refresh()->status)->toBe('done')
        ->and($firstTask->completed_at)->not->toBeNull()
        ->and($secondTask->refresh()->status)->toBe('done')
        ->and($secondTask->completed_at)->not->toBeNull()
        ->and($otherTask->refresh()->status)->toBe('in_progress')
        ->and($otherTask->completed_at)->toBeNull();
});

it('rejects bulk status updates containing another users task', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $ownedTask = Task::factory()->for($owner)->create();
    $otherTask = Task::factory()->for($otherUser)->create();

    $this->actingAs($owner)
        ->patch(route('tasks.bulk-status'), [
            'task_ids' => [$ownedTask->id, $otherTask->id],
            'status' => 'done',
        ])
        ->assertSessionHasErrors('task_ids');

    expect($ownedTask->refresh()->status)->toBe('todo')
        ->and($otherTask->refresh()->status)->toBe('todo');
});

it('lets a dept head bulk delete tasks of their own subordinates', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $supervisor->id])->create();
    $firstTask = Task::factory()->for($subordinate)->create(['status' => 'review']);
    $secondTask = Task::factory()->for($subordinate)->create(['status' => 'review']);

    $this->actingAs($supervisor)
        ->delete(route('tasks.bulk-destroy'), [
            'task_ids' => [$firstTask->id, $secondTask->id],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertModelMissing($firstTask);
    $this->assertModelMissing($secondTask);
});

it('lets a dept head bulk move subordinate tasks to another status', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $supervisor->id])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'review']);

    $this->actingAs($supervisor)
        ->patch(route('tasks.bulk-status'), [
            'task_ids' => [$task->id],
            'status' => 'done',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($task->refresh()->status)->toBe('done')
        ->and($task->completed_at)->not->toBeNull();
});

it('rejects dept head bulk actions on tasks of another supervisors subordinate', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $otherSupervisor = User::factory()->state(['role' => 'atasan'])->create();
    $otherSubordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $otherSupervisor->id])->create();
    $task = Task::factory()->for($otherSubordinate)->create(['status' => 'review']);

    $this->actingAs($supervisor)
        ->patch(route('tasks.bulk-status'), ['task_ids' => [$task->id], 'status' => 'done'])
        ->assertSessionHasErrors(['task_ids' => 'Sebagian task tidak ditemukan untuk akun ini.']);

    $this->actingAs($supervisor)
        ->delete(route('tasks.bulk-destroy'), ['task_ids' => [$task->id]])
        ->assertSessionHasErrors(['task_ids' => 'Sebagian task tidak ditemukan untuk akun ini.']);

    $this->assertModelExists($task);
    expect($task->refresh()->status)->toBe('review');
});

it('marks subordinate tasks as bulk manageable for their dept head', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $supervisor->id])->create();
    Task::factory()->for($subordinate)->create(['status' => 'review', 'due_date' => now()->toDateString()]);

    $this->actingAs($supervisor)
        ->get(route('tasks.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.can_bulk_manage', true)
            ->where('tasks.0.can_edit', false));
});
