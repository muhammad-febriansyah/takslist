<?php

namespace App\Policies;

use App\Models\TaskAttachment;
use App\Models\User;

class TaskAttachmentPolicy
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
    public function view(User $user, TaskAttachment $taskAttachment): bool
    {
        return $taskAttachment->task?->user_id === $user->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, TaskAttachment $taskAttachment): bool
    {
        return $taskAttachment->task?->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TaskAttachment $taskAttachment): bool
    {
        return $taskAttachment->task?->user_id === $user->id;
    }
}
