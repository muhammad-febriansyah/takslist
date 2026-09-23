<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $today = CarbonImmutable::today();
        $taskQuery = Task::visibleTo($user);
        $statusCounts = (clone $taskQuery)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn (int|string $count): int => (int) $count)
            ->all();
        $upcomingDeadlines = (clone $taskQuery)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today)
            ->where('status', '!=', 'done')
            ->orderBy('due_date')
            ->limit(5)
            ->get(['id', 'title', 'status', 'priority', 'due_date'])
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_date' => $task->due_date?->toDateString(),
            ])
            ->values();
        $recentTasks = (clone $taskQuery)
            ->latest('updated_at')
            ->limit(5)
            ->get(['id', 'title', 'status', 'updated_at'])
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'updated_at' => $task->updated_at?->toIso8601String(),
            ])
            ->values();
        $weeklyCompleted = collect(range(6, 0))->map(function (int $daysAgo) use ($user, $today): int {
            $date = $today->subDays($daysAgo);

            return Task::ownedBy($user)
                ->whereDate('completed_at', $date)
                ->count();
        })->values();

        $events = CalendarEvent::ownedBy($user)
            ->whereBetween('event_date', [$today, $today->addDays(14)])
            ->orderBy('event_date')
            ->limit(5)
            ->get(['id', 'title', 'event_date', 'color'])
            ->map(fn (CalendarEvent $event): array => [
                'id' => $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->toDateString(),
                'color' => $event->color,
            ])
            ->values();

        return Inertia::render('dashboard', [
            'stats' => [
                'total' => (clone $taskQuery)->count(),
                'in_progress' => $statusCounts['in_progress'] ?? 0,
                'completed' => $statusCounts['done'] ?? 0,
                'overdue' => (clone $taskQuery)
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', $today)
                    ->where('status', '!=', 'done')
                    ->count(),
                'calendar_events' => CalendarEvent::ownedBy($user)
                    ->whereDate('event_date', '>=', $today)
                    ->count(),
            ],
            'statusCounts' => [
                'todo' => $statusCounts['todo'] ?? 0,
                'in_progress' => $statusCounts['in_progress'] ?? 0,
                'review' => $statusCounts['review'] ?? 0,
                'done' => $statusCounts['done'] ?? 0,
            ],
            'weeklyCompleted' => $weeklyCompleted,
            'upcomingDeadlines' => $upcomingDeadlines,
            'recentTasks' => $recentTasks,
            'events' => $events,
        ]);
    }
}
