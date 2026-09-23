<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserPreference;

class UserPreferencePolicy
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
    public function view(User $user, UserPreference $userPreference): bool
    {
        return $userPreference->user_id === $user->id;
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
    public function update(User $user, UserPreference $userPreference): bool
    {
        return $userPreference->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, UserPreference $userPreference): bool
    {
        return $userPreference->user_id === $user->id;
    }
}
