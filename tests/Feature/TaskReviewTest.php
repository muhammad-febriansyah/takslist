<?php

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

it('allows a subordinate to submit a task to their supervisor', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'done']);

    $this->actingAs($subordinate)
        ->post(route('tasks.review.store', $task))
        ->assertRedirect();

    expect($task->refresh()->status)->toBe('review');
    expect(TaskReview::query()->where('task_id', $task->id)->first())
        ->reviewer_id->toBe($supervisor->id)
        ->status->toBe('pending');
    expect(DatabaseNotification::query()->where('notifiable_id', $supervisor->id)->count())->toBe(1);
});

it('submits eligible completed tasks for a selected period', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $eligibleTask = Task::factory()->for($subordinate)->done()->create(['due_date' => '2026-09-10']);
    $otherPeriodTask = Task::factory()->for($subordinate)->done()->create(['due_date' => '2026-08-10']);
    $pendingTask = Task::factory()->for($subordinate)->done()->create(['due_date' => '2026-09-11']);
    $approvedTask = Task::factory()->for($subordinate)->done()->create(['due_date' => '2026-09-12']);
    TaskReview::factory()->create([
        'task_id' => $pendingTask->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'pending',
    ]);
    TaskReview::factory()->create([
        'task_id' => $approvedTask->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'approved',
    ]);

    $this->actingAs($subordinate)
        ->post(route('reviews.submit-period'), ['period' => '2026-09'])
        ->assertRedirect();

    expect($eligibleTask->refresh()->status)->toBe('review')
        ->and(TaskReview::query()->where('task_id', $eligibleTask->id)->first())
        ->reviewer_id->toBe($supervisor->id)
        ->status->toBe('pending')
        ->and($otherPeriodTask->refresh()->status)->toBe('done')
        ->and($pendingTask->refresh()->status)->toBe('done')
        ->and($approvedTask->refresh()->status)->toBe('done')
        ->and(DatabaseNotification::query()->where('notifiable_id', $supervisor->id)->count())->toBe(1);
});

it('requires a completed task before review submission', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'in_progress']);

    $this->actingAs($subordinate)
        ->post(route('tasks.review.store', $task))
        ->assertForbidden();
});

it('exposes review status and supervisor on the task list', function () {
    $supervisor = User::factory()->state(['role' => 'atasan', 'position' => 'Head of IT'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'review']);

    TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($subordinate)
        ->get(route('tasks.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('tasks/index')
            ->where('tasks.0.supervisor.name', $supervisor->name)
            ->where('tasks.0.review.status', 'pending')
            ->where('tasks.0.review.reviewer.name', $supervisor->name)
            ->where('export_approver.name', $supervisor->name)
            ->where('export_approver.position', 'Head of IT'));
});

it('allows assigned supervisor to approve with a signature', function () {
    Storage::fake('public');
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'review']);
    $review = TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($supervisor)
        ->patch(route('reviews.update', $review), [
            'decision' => 'approved',
            'note' => 'Sudah sesuai.',
            'signature_data' => 'data:image/png;base64,'.base64_encode('signature'),
        ])
        ->assertRedirect();

    expect($review->refresh()->status)->toBe('approved')
        ->and($review->signature_path)->not->toBeNull()
        ->and($task->refresh()->status)->toBe('done');

    Storage::disk('public')->assertExists($review->signature_path);
    expect(DatabaseNotification::query()->where('notifiable_id', $subordinate->id)->count())->toBe(1);

    $this->actingAs($subordinate)
        ->get(route('reviews.signature', $review))
        ->assertDownload('tanda-tangan-review-'.$review->id.'.png');
});

it('forbids an unrelated supervisor from reviewing a task', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $otherSupervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'review']);
    $review = TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
    ]);

    $this->actingAs($otherSupervisor)
        ->patch(route('reviews.update', $review), [
            'decision' => 'rejected',
            'note' => 'Tidak boleh.',
        ])
        ->assertForbidden();
});

it('allows a supervisor to bulk approve pending reviews with one signature', function () {
    Storage::fake('public');
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $firstSubordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $supervisor->id])->create();
    $secondSubordinate = User::factory()->state(['role' => 'bawahan', 'supervisor_id' => $supervisor->id])->create();
    $firstTask = Task::factory()->for($firstSubordinate)->create(['status' => 'review']);
    $secondTask = Task::factory()->for($secondSubordinate)->create(['status' => 'review']);
    $firstReview = TaskReview::factory()->create(['task_id' => $firstTask->id, 'submitted_by' => $firstSubordinate->id, 'reviewer_id' => $supervisor->id]);
    $secondReview = TaskReview::factory()->create(['task_id' => $secondTask->id, 'submitted_by' => $secondSubordinate->id, 'reviewer_id' => $supervisor->id]);

    $this->actingAs($supervisor)
        ->post(route('reviews.bulk-approve'), [
            'review_ids' => [$firstReview->id, $secondReview->id],
            'note' => 'Disetujui bersama.',
            'signature_data' => 'data:image/png;base64,'.base64_encode('signature'),
        ])
        ->assertRedirect();

    expect($firstReview->refresh()->status)->toBe('approved')
        ->and($secondReview->refresh()->status)->toBe('approved')
        ->and($firstTask->refresh()->status)->toBe('done')
        ->and($secondTask->refresh()->status)->toBe('done')
        ->and(DatabaseNotification::query()->whereIn('notifiable_id', [$firstSubordinate->id, $secondSubordinate->id])->count())->toBe(2);

    Storage::disk('public')->assertExists($firstReview->signature_path);
    Storage::disk('public')->assertExists($secondReview->signature_path);
});

it('requires a note when a supervisor returns a task', function () {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['status' => 'review']);
    $review = TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'pending',
    ]);

    $this->actingAs($supervisor)
        ->patch(route('reviews.update', $review), [
            'decision' => 'rejected',
        ])
        ->assertSessionHasErrors('note');

    expect($review->refresh()->status)->toBe('pending')
        ->and($task->refresh()->status)->toBe('review');
});

it('marks only the signed-in user notification as read', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $notification = $user->notifications()->create([
        'id' => (string) str()->uuid(),
        'type' => 'App\\Notifications\\TaskFlowNotification',
        'data' => ['type' => 'info', 'title' => 'Info', 'message' => 'Info', 'href' => route('dashboard')],
    ]);
    $otherNotification = $otherUser->notifications()->create([
        'id' => (string) str()->uuid(),
        'type' => 'App\\Notifications\\TaskFlowNotification',
        'data' => ['type' => 'info', 'title' => 'Info', 'message' => 'Info', 'href' => route('dashboard')],
    ]);

    $this->actingAs($user)
        ->patch(route('notifications.read', $notification))
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull()
        ->and($otherNotification->fresh()->read_at)->toBeNull();
});

test('redirects the root page to login', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
