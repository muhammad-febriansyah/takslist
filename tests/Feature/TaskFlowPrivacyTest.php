<?php

use App\Models\CalendarEvent;
use App\Models\Project;
use App\Models\Subtask;
use App\Models\Tag;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

it('limits owned queries to the authenticated users data', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();

    $ownedProject = Project::factory()->for($owner)->create();
    $otherProject = Project::factory()->for($otherUser)->create();
    $ownedTask = Task::factory()->for($owner)->for($ownedProject)->create();
    $otherTask = Task::factory()->for($otherUser)->for($otherProject)->create();
    $ownedTag = Tag::factory()->for($owner)->create();
    $otherTag = Tag::factory()->for($otherUser)->create();
    $ownedEvent = CalendarEvent::factory()->for($owner)->create();
    $otherEvent = CalendarEvent::factory()->for($otherUser)->create();

    expect(Project::ownedBy($owner)->pluck('id')->all())->toBe([$ownedProject->id])
        ->and(Task::ownedBy($owner)->pluck('id')->all())->toBe([$ownedTask->id])
        ->and(Tag::ownedBy($owner)->pluck('id')->all())->toBe([$ownedTag->id])
        ->and(Project::ownedBy($owner)->whereKey($otherProject->id)->exists())->toBeFalse()
        ->and(Task::ownedBy($owner)->whereKey($otherTask->id)->exists())->toBeFalse()
        ->and(Tag::ownedBy($owner)->whereKey($otherTag->id)->exists())->toBeFalse()
        ->and(CalendarEvent::ownedBy($owner)->whereKey($ownedEvent->id)->exists())->toBeTrue()
        ->and(CalendarEvent::ownedBy($owner)->whereKey($otherEvent->id)->exists())->toBeFalse();
});

it('denies cross-user access through policies', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $project = Project::factory()->for($owner)->create();
    $task = Task::factory()->for($owner)->for($project)->create();
    $subtask = Subtask::factory()->for($task)->create();
    $attachment = TaskAttachment::factory()->for($task)->create();
    $event = CalendarEvent::factory()->for($owner)->create();

    expect(Gate::forUser($owner)->allows('view', $project))->toBeTrue()
        ->and(Gate::forUser($otherUser)->allows('view', $project))->toBeFalse()
        ->and(Gate::forUser($owner)->allows('view', $task))->toBeTrue()
        ->and(Gate::forUser($otherUser)->allows('view', $task))->toBeFalse()
        ->and(Gate::forUser($owner)->allows('view', $subtask))->toBeTrue()
        ->and(Gate::forUser($otherUser)->allows('view', $subtask))->toBeFalse()
        ->and(Gate::forUser($owner)->allows('view', $attachment))->toBeTrue()
        ->and(Gate::forUser($otherUser)->allows('view', $attachment))->toBeFalse()
        ->and(Gate::forUser($owner)->allows('view', $event))->toBeTrue()
        ->and(Gate::forUser($otherUser)->allows('view', $event))->toBeFalse();
});
