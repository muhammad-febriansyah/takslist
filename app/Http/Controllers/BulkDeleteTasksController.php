<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkDeleteTasksRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BulkDeleteTasksController extends Controller
{
    public function __invoke(BulkDeleteTasksRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->isAdmin()) {
            abort(403);
        }
        $taskIds = collect($request->validated('task_ids'))
            ->map(fn (int|string $id): int => (int) $id)
            ->unique()
            ->values();
        $ownedTaskIds = Task::ownedBy($user)
            ->whereIn('id', $taskIds)
            ->pluck('id')
            ->map(fn (int|string $id): int => (int) $id)
            ->sort()
            ->values();

        if ($ownedTaskIds->all() !== $taskIds->sort()->all()) {
            throw ValidationException::withMessages([
                'task_ids' => 'Sebagian task tidak ditemukan untuk akun ini.',
            ]);
        }

        Task::ownedBy($user)->whereIn('id', $taskIds)->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $taskIds->count().' task berhasil dihapus.',
        ]);

        return back();
    }
}
