<?php

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

it('stores one timesheet submission per user and period', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('tasks.timesheet-submissions.store'), [
            'department' => 'Product',
            'client' => 'SIM',
            'approved_by' => 'Atasan TaskFlow',
            'approved_role' => 'Atasan',
            'period' => '2026-09',
        ])
        ->assertRedirect();

    expect(TimesheetSubmission::query()->where('user_id', $user->id)->first())
        ->not->toBeNull()
        ->department->toBe('Product')
        ->client->toBe('SIM')
        ->approved_by->toBe('Atasan TaskFlow')
        ->period->toBe('2026-09')
        ->status->toBe('pending');
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
