<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        return $task->user_id === $user->id
            || $user->isAdmin()
            || ($user->isAtasan() && $task->user()->where('supervisor_id', $user->id)->exists());
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return ! $user->isAdmin();
    }

    public function submitReview(User $user, Task $task): bool
    {
        return $user->isBawahan()
            && $task->user_id === $user->id
            && $user->supervisor_id !== null
            && $task->status === 'done';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        return $task->user_id === $user->id && ! $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        return $task->user_id === $user->id && ! $user->isAdmin();
    }
}
