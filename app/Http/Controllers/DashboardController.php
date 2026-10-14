<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Task;
use App\Models\TaskReview;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $today = CarbonImmutable::today();
        $taskQuery = Task::ownedBy($user);
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
        $completedByDate = Task::ownedBy($user)
            ->whereDate('completed_at', '>=', $today->subDays(6))
            ->pluck('completed_at')
            ->countBy(fn ($completedAt): string => $completedAt->toDateString());
        $weeklyCompleted = collect(range(6, 0))
            ->map(fn (int $daysAgo): int => (int) ($completedByDate[$today->subDays($daysAgo)->toDateString()] ?? 0))
            ->values();

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
            'view' => match (true) {
                $user->isAdmin() => 'admin',
                $user->isAtasan() => 'dept_head',
                default => 'officer',
            },
            'officer' => $user->isBawahan() ? $this->officerPanel($user, $today) : null,
            'team' => $user->isAtasan() ? $this->teamPanel($user, $today) : null,
            'system' => $user->isAdmin() ? $this->systemPanel($today) : null,
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

    /**
     * @return array<string, mixed>
     */
    private function officerPanel(User $user, CarbonImmutable $today): array
    {
        $period = $today->format('Y-m');
        $submission = TimesheetSubmission::query()
            ->where('user_id', $user->id)
            ->where('period', $period)
            ->first(['status', 'approved_by', 'submitted_at']);

        $returnedTasks = Task::ownedBy($user)
            ->whereHas('latestReview', fn ($query) => $query->where('status', 'rejected'))
            ->with('latestReview.reviewer:id,name')
            ->latest('updated_at')
            ->limit(5)
            ->get(['id', 'title', 'due_date'])
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'due_date' => $task->due_date?->toDateString(),
                'note' => $task->latestReview?->note,
                'reviewer' => $task->latestReview?->reviewer?->name,
            ])
            ->values();

        return [
            'timesheet' => [
                'period' => $period,
                'status' => $submission?->status ?? 'not_submitted',
                'approved_by' => $submission?->approved_by,
                'submitted_at' => $submission?->submitted_at?->toIso8601String(),
            ],
            'supervisor' => $user->supervisor?->only(['id', 'name', 'position']),
            'returned_tasks' => $returnedTasks,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function teamPanel(User $user, CarbonImmutable $today): array
    {
        $members = User::query()
            ->where('supervisor_id', $user->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'position']);
        $memberIds = $members->pluck('id');
        $teamTasks = Task::query()->whereIn('user_id', $memberIds);

        $statusCounts = (clone $teamTasks)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
        $workload = (clone $teamTasks)
            ->selectRaw(
                "user_id,
                sum(case when status != 'done' then 1 else 0 end) as active_count,
                sum(case when status != 'done' and due_date is not null and due_date < ? then 1 else 0 end) as overdue_count,
                sum(case when status = 'done' then 1 else 0 end) as done_count",
                [$today->toDateString()],
            )
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');
        $pendingReviews = TaskReview::query()
            ->where('reviewer_id', $user->id)
            ->where('status', 'pending')
            ->selectRaw('submitted_by, count(*) as aggregate, min(created_at) as oldest_at')
            ->groupBy('submitted_by')
            ->get()
            ->keyBy('submitted_by');
        $completedByDate = (clone $teamTasks)
            ->whereDate('completed_at', '>=', $today->subDays(6))
            ->pluck('completed_at')
            ->countBy(fn ($completedAt): string => $completedAt->toDateString());
        $deadlines = (clone $teamTasks)
            ->with('user:id,name')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today)
            ->where('status', '!=', 'done')
            ->orderBy('due_date')
            ->limit(5)
            ->get(['id', 'user_id', 'title', 'status', 'due_date'])
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'due_date' => $task->due_date?->toDateString(),
                'owner' => $task->user?->name,
            ])
            ->values();

        return [
            'stats' => [
                'members' => $members->count(),
                'pending_reviews' => (int) $pendingReviews->sum('aggregate'),
                'overdue' => (int) $workload->sum('overdue_count'),
                'approved_this_month' => TaskReview::query()
                    ->where('reviewer_id', $user->id)
                    ->where('status', 'approved')
                    ->whereBetween('signed_at', [$today->startOfMonth(), $today->endOfMonth()])
                    ->count(),
            ],
            'status_counts' => [
                'todo' => (int) ($statusCounts['todo'] ?? 0),
                'in_progress' => (int) ($statusCounts['in_progress'] ?? 0),
                'review' => (int) ($statusCounts['review'] ?? 0),
                'done' => (int) ($statusCounts['done'] ?? 0),
            ],
            'weekly_completed' => collect(range(6, 0))
                ->map(fn (int $daysAgo): int => (int) ($completedByDate[$today->subDays($daysAgo)->toDateString()] ?? 0))
                ->values(),
            'members' => $members->map(fn (User $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'position' => $member->position,
                'active' => (int) ($workload[$member->id]->active_count ?? 0),
                'overdue' => (int) ($workload[$member->id]->overdue_count ?? 0),
                'done' => (int) ($workload[$member->id]->done_count ?? 0),
                'pending_reviews' => (int) ($pendingReviews[$member->id]->aggregate ?? 0),
                'oldest_pending_at' => $pendingReviews[$member->id]->oldest_at ?? null,
            ])->values(),
            'deadlines' => $deadlines,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function systemPanel(CarbonImmutable $today): array
    {
        $roleCounts = User::query()
            ->selectRaw('role, count(*) as aggregate')
            ->groupBy('role')
            ->pluck('aggregate', 'role');
        $statusCounts = Task::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'roles' => [
                'admin' => (int) ($roleCounts['admin'] ?? 0),
                'dept_head' => (int) ($roleCounts['atasan'] ?? 0),
                'officer' => (int) ($roleCounts['bawahan'] ?? 0),
            ],
            'tasks' => [
                'total' => (int) $statusCounts->sum(),
                'done' => (int) ($statusCounts['done'] ?? 0),
                'pending' => (int) ($statusCounts['todo'] ?? 0) + (int) ($statusCounts['in_progress'] ?? 0) + (int) ($statusCounts['review'] ?? 0),
            ],
            'status_counts' => [
                'todo' => (int) ($statusCounts['todo'] ?? 0),
                'in_progress' => (int) ($statusCounts['in_progress'] ?? 0),
                'review' => (int) ($statusCounts['review'] ?? 0),
                'done' => (int) ($statusCounts['done'] ?? 0),
            ],
            'attention' => [
                'inactive_users' => User::query()->where('is_active', false)->count(),
                'officers_without_supervisor' => User::query()
                    ->where('role', 'bawahan')
                    ->whereNull('supervisor_id')
                    ->count(),
                'dept_heads_without_officers' => User::query()
                    ->where('role', 'atasan')
                    ->whereDoesntHave('subordinates')
                    ->count(),
                'users_without_birth_date' => User::query()->where('is_active', true)->whereNull('birth_date')->count(),
            ],
            'birthdays' => $this->upcomingBirthdays($today),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function upcomingBirthdays(CarbonImmutable $today, int $withinDays = 30): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->whereNotNull('birth_date')
            ->get(['id', 'name', 'role', 'position', 'birth_date'])
            ->map(function (User $person) use ($today): array {
                $birthDate = CarbonImmutable::parse($person->birth_date);
                $next = $birthDate->setYear($today->year);

                if ($next->lt($today)) {
                    $next = $next->addYear();
                }

                return [
                    'id' => $person->id,
                    'name' => $person->name,
                    'role' => $person->role,
                    'position' => $person->position,
                    'date' => $next->toDateString(),
                    'days_until' => (int) $today->diffInDays($next),
                    'turning' => $next->year - $birthDate->year,
                ];
            })
            ->filter(fn (array $person): bool => $person['days_until'] <= $withinDays)
            ->sortBy([['days_until', 'asc'], ['name', 'asc']])
            ->values();
    }
}
