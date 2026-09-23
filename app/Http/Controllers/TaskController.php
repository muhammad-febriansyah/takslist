<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('supervisor:id,name,role,position');
        $search = trim($request->string('search')->toString());
        $userId = $request->integer('user_id') ?: null;
        $period = $request->string('period')->toString();

        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period)) {
            $period = now()->format('Y-m');
        }

        $periodStart = CarbonImmutable::createFromFormat('!Y-m', $period)->startOfMonth();
        $periodEnd = $periodStart->endOfMonth();
        $taskQuery = $user->isAdmin() ? Task::query() : Task::visibleTo($user);

        $taskQuery->where(function (Builder $query) use ($periodStart, $periodEnd): void {
            $query->whereNull('due_date')
                ->orWhereBetween('due_date', [
                    $periodStart->toDateString(),
                    $periodEnd->toDateString(),
                ]);
        });

        if ($user->isAdmin() && $userId !== null) {
            $taskQuery->where('user_id', $userId);
        }

        if ($search !== '') {
            $taskQuery->where(function (Builder $query) use ($search): void {
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $tasks = $taskQuery
            ->with([
                'user:id,name,supervisor_id',
                'user.supervisor:id,name',
                'latestReview',
                'latestReview.reviewer:id,name',
                'project:id,name,color',
                'tags:id,name,color',
                'subtasks:id,task_id,is_completed',
            ])
            ->orderBy('sort_order')
            ->orderBy('due_date')
            ->get()
            ->map(fn (Task $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'owner' => $task->user?->only(['id', 'name']),
                'supervisor' => $task->user?->supervisor?->only(['id', 'name']),
                'review' => $task->latestReview ? [
                    'id' => $task->latestReview->id,
                    'status' => $task->latestReview->status,
                    'submitted_at' => $task->latestReview->created_at?->toIso8601String(),
                    'signed_at' => $task->latestReview->signed_at?->toIso8601String(),
                    'reviewer' => $task->latestReview->reviewer?->only(['id', 'name']),
                    'signature_url' => $task->latestReview->signature_path
                        ? route('reviews.signature', $task->latestReview)
                        : null,
                ] : null,
                'can_edit' => $task->user_id === $user->id && ! $user->isAdmin(),
                'can_submit_review' => $task->user_id === $user->id
                    && $user->isBawahan()
                    && $user->supervisor_id !== null
                    && $task->status === 'done'
                    && ($task->latestReview === null || $task->latestReview->status === 'rejected'),
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'start_date' => $task->start_date?->toDateString(),
                'due_date' => $task->due_date?->toDateString(),
                'project' => $task->project?->only(['name', 'color']),
                'tags' => $task->tags->map(fn ($tag): array => $tag->only(['name', 'color']))->values(),
                'subtasks' => [
                    'total' => $task->subtasks->count(),
                    'completed' => $task->subtasks->where('is_completed', true)->count(),
                ],
            ])
            ->values();

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'search' => $search,
            'user_id' => $userId,
            'period' => $period,
            'export_approver' => $user->isBawahan()
                ? $user->supervisor?->only(['id', 'name', 'role', 'position'])
                : null,
            'users' => $user->isAdmin()
                ? User::query()->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    public function store(StoreTaskRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        Gate::authorize('create', Task::class);

        $task = new Task($request->validated());
        $task->user()->associate($user);
        $task->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task berhasil dibuat.']);

        return to_route('tasks.index');
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $validated = $request->validated();

        if (array_key_exists('status', $validated)) {
            $validated['completed_at'] = $validated['status'] === 'done' ? now() : null;
        }

        $task->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task berhasil diperbarui.']);

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        Gate::authorize('delete', $task);
        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task berhasil dihapus.']);

        return back();
    }
}
