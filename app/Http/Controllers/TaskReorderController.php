<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReorderTaskRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TaskReorderController extends Controller
{
    public function __invoke(ReorderTaskRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->isAdmin()) {
            abort(403);
        }
        $validated = $request->validated();
        $draggedTask = Task::ownedBy($user)->find($validated['task_id']);

        if ($draggedTask === null) {
            throw ValidationException::withMessages([
                'task_id' => 'Task tidak ditemukan untuk akun ini.',
            ]);
        }

        $orderedTaskIds = collect($validated['ordered_task_ids'])
            ->flatten()
            ->map(fn (int|string $id): int => (int) $id)
            ->values();
        $ownedTaskIds = Task::ownedBy($user)
            ->whereIn('id', $orderedTaskIds)
            ->pluck('id')
            ->map(fn (int|string $id): int => (int) $id)
            ->sort()
            ->values();

        if ($orderedTaskIds->unique()->sort()->values()->all() !== $ownedTaskIds->all()) {
            throw ValidationException::withMessages([
                'ordered_task_ids' => 'Urutan task tidak valid untuk akun ini.',
            ]);
        }

        DB::transaction(function () use ($user, $validated): void {
            foreach ($validated['ordered_task_ids'] as $status => $taskIds) {
                foreach ($taskIds as $index => $taskId) {
                    $task = Task::ownedBy($user)->find($taskId);

                    if ($task === null) {
                        throw ValidationException::withMessages([
                            'ordered_task_ids' => 'Task tidak ditemukan untuk akun ini.',
                        ]);
                    }

                    $task->update([
                        'status' => $status,
                        'sort_order' => ($index + 1) * 1000,
                        'completed_at' => $status === 'done' ? now() : null,
                    ]);
                }
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Urutan task berhasil diperbarui.']);

        return back();
    }
}
