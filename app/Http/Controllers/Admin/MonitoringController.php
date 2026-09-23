<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($user->isAdmin(), 403);

        $statusCounts = Task::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $users = User::query()
            ->withCount('tasks')
            ->with('supervisor:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'supervisor_id']);

        $recentTasks = Task::query()
            ->with('user:id,name')
            ->latest()
            ->limit(12)
            ->get(['id', 'user_id', 'title', 'status', 'priority', 'due_date', 'created_at']);

        return Inertia::render('admin/index', [
            'metrics' => [
                'users' => $users->count(),
                'tasks' => (int) Task::count(),
                'pending' => (int) Task::whereIn('status', ['todo', 'in_progress', 'review'])->count(),
                'done' => (int) ($statusCounts['done'] ?? 0),
            ],
            'statusCounts' => $statusCounts,
            'users' => $users,
            'recentTasks' => $recentTasks,
        ]);
    }
}
