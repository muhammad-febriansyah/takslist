<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class TaskReviewService
{
    /**
     * Submit all completed tasks in a period that have not been reviewed.
     *
     * @return Collection<int, Task>
     */
    public function submitCompletedTasks(User $user, string $period): Collection
    {
        $periodStart = CarbonImmutable::createFromFormat('!Y-m', $period)->startOfMonth();
        $periodEnd = $periodStart->endOfMonth();

        return DB::transaction(function () use ($user, $periodStart, $periodEnd): Collection {
            $tasks = Task::query()
                ->ownedBy($user)
                ->where('status', 'done')
                ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->whereDoesntHave('reviews', fn ($query) => $query->whereIn('status', ['pending', 'approved']))
                ->lockForUpdate()
                ->get();

            foreach ($tasks as $task) {
                $task->reviews()->create([
                    'submitted_by' => $user->id,
                    'reviewer_id' => $user->supervisor_id,
                    'status' => 'pending',
                ]);
                $task->update(['status' => 'review']);
            }

            return $tasks;
        });
    }
}
