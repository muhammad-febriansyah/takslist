<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkUpdateTaskStatusRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BulkUpdateTaskStatusController extends Controller
{
    public function __invoke(BulkUpdateTaskStatusRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->isAdmin()) {
            abort(403);
        }

        /** @var array{task_ids: array<int, int>, status: string} $validated */
        $validated = $request->validated();
        $taskIds = collect($validated['task_ids'])
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

        $status = $validated['status'];
        Task::ownedBy($user)
            ->whereIn('id', $taskIds)
            ->update([
                'status' => $status,
                'completed_at' => $status === 'done' ? now() : null,
            ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $taskIds->count().' task berhasil dipindahkan ke status baru.',
        ]);

        return back();
    }
}
