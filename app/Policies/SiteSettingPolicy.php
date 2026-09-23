<?php

namespace App\Policies;

use App\Models\SiteSetting;
use App\Models\User;

class SiteSettingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function view(User $user, SiteSetting $siteSetting): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SiteSetting $siteSetting): bool
    {
        return $user->isAdmin();
    }
}
