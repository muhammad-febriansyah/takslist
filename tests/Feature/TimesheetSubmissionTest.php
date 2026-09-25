<?php

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

$signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

it('stores one timesheet submission per user and period', function () use ($signatureData) {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('tasks.timesheet-submissions.store'), [
            'department' => 'Product',
            'client' => 'SIM',
            'approved_by' => 'Atasan TaskFlow',
            'approved_role' => 'Atasan',
            'period' => '2026-09',
            'signature_data' => $signatureData,
        ])
        ->assertRedirect();

    expect(TimesheetSubmission::query()->where('user_id', $user->id)->first())
        ->not->toBeNull()
        ->department->toBe('Product')
        ->client->toBe('SIM')
        ->approved_by->toBe('Atasan TaskFlow')
        ->period->toBe('2026-09')
        ->signature_path->not->toBeNull()
        ->status->toBe('pending');
});

it('sends completed period tasks to the supervisor when a timesheet is submitted', function () use ($signatureData) {
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $eligibleTask = Task::factory()->done()->for($subordinate)->create([
        'due_date' => '2026-09-10',
    ]);
    $otherPeriodTask = Task::factory()->done()->for($subordinate)->create([
        'due_date' => '2026-08-10',
    ]);
    $incompleteTask = Task::factory()->for($subordinate)->create([
        'status' => 'in_progress',
        'due_date' => '2026-09-11',
    ]);

    $this->actingAs($subordinate)
        ->post(route('tasks.timesheet-submissions.store'), [
            'department' => 'Product',
            'client' => 'SIM',
            'approved_by' => 'Atasan TaskFlow',
            'approved_role' => 'Atasan',
            'period' => '2026-09',
            'signature_data' => $signatureData,
        ])
        ->assertRedirect();

    expect($eligibleTask->refresh()->status)->toBe('review')
        ->and(TaskReview::query()->where('task_id', $eligibleTask->id)->first())
        ->reviewer_id->toBe($supervisor->id)
        ->status->toBe('pending')
        ->and($otherPeriodTask->refresh()->status)->toBe('done')
        ->and($incompleteTask->refresh()->status)->toBe('in_progress')
        ->and(TimesheetSubmission::query()->where('user_id', $subordinate->id)->where('period', '2026-09')->value('status'))->toBe('pending');
});

it('lists saved submissions with search status filter and pagination', function () {
    $user = User::factory()->create();

    foreach (range(1, 11) as $index) {
        TimesheetSubmission::factory()->for($user)->create([
            'period' => sprintf('202%d-%02d', intdiv($index - 1, 12), (($index - 1) % 12) + 1),
            'department' => 'Design '.$index,
            'status' => 'approved',
        ]);
    }

    TimesheetSubmission::factory()->for($user)->create([
        'period' => '2027-01',
        'department' => 'Finance',
        'status' => 'pending',
    ]);
    TimesheetSubmission::factory()->create([
        'period' => '2027-02',
        'department' => 'Design other user',
        'status' => 'approved',
    ]);

    $this->actingAs($user)
        ->get(route('tasks.index', [
            'submission_search' => 'Design',
            'submission_status' => 'approved',
        ]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('tasks/index')
            ->where('submission_search', 'Design')
            ->where('submission_status', 'approved')
            ->where('timesheet_submissions.total', 11)
            ->where('timesheet_submissions.per_page', 10)
            ->where('timesheet_submissions.current_page', 1)
            ->has('timesheet_submissions.data', 10)
        );
});

it('marks saved submission approved after all period tasks receive signed approval', function () {
    Storage::fake('public');
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create([
        'status' => 'review',
        'due_date' => '2026-09-10',
    ]);
    $review = TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'pending',
    ]);
    $submission = TimesheetSubmission::factory()->for($subordinate)->create([
        'period' => '2026-09',
        'status' => 'pending',
    ]);

    $this->actingAs($supervisor)
        ->patch(route('reviews.update', $review), [
            'decision' => 'approved',
            'signature_data' => 'data:image/png;base64,'.base64_encode('signature'),
        ])
        ->assertRedirect();

    expect($submission->refresh()->status)->toBe('approved');
});

it('shows submission approved when reviewed tasks are approved even if another period task was not submitted', function () {
    Storage::fake('public');
    $supervisor = User::factory()->state(['role' => 'atasan'])->create();
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $reviewedTask = Task::factory()->for($subordinate)->create([
        'status' => 'done',
        'due_date' => '2026-09-10',
    ]);
    Task::factory()->for($subordinate)->create([
        'status' => 'done',
        'due_date' => '2026-09-20',
    ]);
    $review = TaskReview::factory()->create([
        'task_id' => $reviewedTask->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'approved',
        'signature_path' => 'signatures/approved.png',
    ]);
    Storage::disk('public')->put($review->signature_path, 'signature');
    TimesheetSubmission::factory()->for($subordinate)->create([
        'period' => '2026-09',
        'status' => 'pending',
    ]);

    $this->actingAs($subordinate)
        ->get(route('tasks.index', ['period' => '2026-09']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('tasks/index')
            ->where('timesheet_submissions.data.0.status', 'approved')
            ->where('timesheet_submissions.data.0.can_download', true));
});
