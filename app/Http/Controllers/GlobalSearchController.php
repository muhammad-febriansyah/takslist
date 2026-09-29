<?php

namespace App\Http\Controllers;

use App\Http\Requests\GlobalSearchRequest;
use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class GlobalSearchController extends Controller
{
    public function __invoke(GlobalSearchRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $query = trim((string) $request->validated('q'));

        if ($query === '') {
            return response()->json(['results' => []]);
        }

        $tasks = Task::ownedBy($user)
            ->where(function (Builder $searchQuery) use ($query): void {
                $searchQuery
                    ->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%")
                    ->orWhere('external_ticket_number', 'like', "%{$query}%");
            })
            ->with('user:id,name')
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get(['id', 'user_id', 'title', 'description', 'status', 'priority', 'due_date']);

        $events = CalendarEvent::ownedBy($user)
            ->where(function (Builder $searchQuery) use ($query): void {
                $searchQuery
                    ->where('title', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%");
            })
            ->orderByDesc('event_date')
            ->limit(6)
            ->get(['id', 'title', 'description', 'event_date', 'color']);

        return response()->json([
            'results' => $tasks
                ->map(fn (Task $task): array => [
                    'type' => 'task',
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'date' => $task->due_date?->toDateString(),
                    'owner' => $task->user?->only(['id', 'name']),
                ])
                ->concat($events->map(fn (CalendarEvent $event): array => [
                    'type' => 'agenda',
                    'id' => $event->id,
                    'title' => $event->title,
                    'description' => $event->description,
                    'status' => null,
                    'priority' => null,
                    'date' => $event->event_date?->toDateString(),
                    'color' => $event->color,
                    'owner' => null,
                ]))
                ->values(),
        ]);
    }
}
