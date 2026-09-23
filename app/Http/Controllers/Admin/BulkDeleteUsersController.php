<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteUsersRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BulkDeleteUsersController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(BulkDeleteUsersRequest $request): RedirectResponse
    {
        $ids = $request->validated('user_ids');
        $users = User::query()->whereKey($ids)->get();

        if ($users->contains(fn (User $user): bool => $user->is($request->user()))) {
            throw ValidationException::withMessages(['user_ids' => 'Akun yang sedang digunakan tidak dapat dihapus.']);
        }

        if ($users->contains(fn (User $user): bool => $user->subordinates()->exists())) {
            throw ValidationException::withMessages(['user_ids' => 'Atasan yang masih memiliki bawahan tidak dapat dihapus.']);
        }

        User::query()->whereKey($ids)->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => $users->count().' pengguna berhasil dihapus.']);

        return back();
    }
}
