<?php

use App\Models\CalendarEvent;
use App\Models\Project;
use App\Models\Subtask;
use App\Models\Tag;
use App\Models\Task;
use App\Models\TaskActivityLog;
use App\Models\TaskAttachment;
use App\Models\TaskReminder;
use App\Models\User;
use App\Models\UserPreference;

it('persists the ERD task flow relationships', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $task = Task::factory()->for($user)->for($project)->create();
    $subtask = Subtask::factory()->for($task)->create();
    $tag = Tag::factory()->for($user)->create();
    $attachment = TaskAttachment::factory()->for($task)->create();
    $activityLog = TaskActivityLog::factory()->for($task)->create();
    $reminder = TaskReminder::factory()->for($task)->create();
    $preferences = UserPreference::factory()->for($user)->create();
    $calendarEvent = CalendarEvent::factory()->for($user)->create();

    $task->tags()->attach($tag);

    expect($user->projects->first()->is($project))->toBeTrue()
        ->and($user->tasks->first()->is($task))->toBeTrue()
        ->and($user->tags->first()->is($tag))->toBeTrue()
        ->and($user->calendarEvents->first()->is($calendarEvent))->toBeTrue()
        ->and($user->preferences->is($preferences))->toBeTrue()
        ->and($project->tasks->first()->is($task))->toBeTrue()
        ->and($task->subtasks->first()->is($subtask))->toBeTrue()
        ->and($task->attachments->first()->is($attachment))->toBeTrue()
        ->and($task->activityLogs->first()->is($activityLog))->toBeTrue()
        ->and($task->reminders->first()->is($reminder))->toBeTrue()
        ->and($task->tags->first()->is($tag))->toBeTrue();
});

it('applies ERD defaults and casts', function () {
    $task = Task::factory()->create();
    $subtask = Subtask::factory()->for($task)->completed()->create();
    $preferences = UserPreference::factory()->create();
    $activityLog = TaskActivityLog::factory()->for($task)->create();

    expect($task->status)->toBe('todo')
        ->and($task->priority)->toBe('medium')
        ->and($task->sort_order)->toBeInt()
        ->and($subtask->is_completed)->toBeTrue()
        ->and($subtask->completed_at)->not->toBeNull()
        ->and($preferences->timezone)->toBe('Asia/Jakarta')
        ->and($preferences->week_starts_on)->toBeInt()
        ->and($activityLog->metadata)->toBeArray();
});
