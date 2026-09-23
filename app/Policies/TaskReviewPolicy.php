<?php

namespace App\Policies;

use App\Models\TaskReview;
use App\Models\User;

class TaskReviewPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAtasan();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, TaskReview $taskReview): bool
    {
        return $taskReview->reviewer_id === $user->id
            || $taskReview->submitted_by === $user->id
            || $user->isAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, TaskReview $taskReview): bool
    {
        return $user->isAtasan() && $taskReview->reviewer_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TaskReview $taskReview): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, TaskReview $taskReview): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, TaskReview $taskReview): bool
    {
        return false;
    }
}
