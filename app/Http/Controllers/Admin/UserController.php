<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Notifications\TaskFlowNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        $search = trim($request->string('search')->toString());

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'position', 'supervisor_id', 'is_active', 'created_at'])
            ->with('supervisor:id,name')
            ->withCount('tasks')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'search' => $search,
            'supervisors' => User::query()
                ->where('role', 'atasan')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['supervisor_id'] = $validated['role'] === 'bawahan'
            ? $validated['supervisor_id']
            : null;
        $user = User::create($validated);

        User::query()
            ->where('role', 'admin')
            ->whereKeyNot($request->user()->id)
            ->get()
            ->each(function (User $admin) use ($user): void {
                $admin->notify(new TaskFlowNotification(
                    'success',
                    'Pengguna baru ditambahkan',
                    $user->name.' sudah terdaftar di sistem.',
                    route('admin.users.index'),
                ));
            });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengguna berhasil dibuat.']);

        return back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        if (blank($validated['password'] ?? null)) {
            unset($validated['password']);
        }

        if ($user->is($request->user()) && ! $validated['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => 'Akun admin yang sedang digunakan tidak dapat dinonaktifkan.',
            ]);
        }

        $validated['supervisor_id'] = $validated['role'] === 'bawahan'
            ? $validated['supervisor_id']
            : null;
        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengguna berhasil diperbarui.']);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorizeAdmin($request);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => 'Akun yang sedang digunakan tidak dapat dihapus.']);
        }

        if ($user->subordinates()->exists()) {
            throw ValidationException::withMessages(['user' => 'Atasan yang masih memiliki bawahan tidak dapat dihapus.']);
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengguna berhasil dihapus.']);

        return back();
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403);
    }
}
