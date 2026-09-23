<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

it('paginates users by ten and filters by name or email', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->count(11)->create();
    $matching = User::factory()->create([
        'name' => 'Pengguna Dicari',
        'email' => 'dicari@example.com',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('users.per_page', 10)
            ->where('users.total', 13)
            ->where('users.current_page', 1)
            ->has('users.data', 10));

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['search' => 'dicari']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->where('search', 'dicari')
            ->where('users.total', 1)
            ->where('users.data.0.id', $matching->id));
});

it('allows admins to toggle another user active state', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->atasan()->create();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'supervisor_id' => '',
            'is_active' => false,
        ])
        ->assertRedirect();

    expect($user->refresh()->is_active)->toBeFalse();
});

it('allows admins to create users with a supervisor', function () {
    $admin = User::factory()->admin()->create();
    $supervisor = User::factory()->atasan()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'bawahan',
            'supervisor_id' => $supervisor->id,
        ])
        ->assertRedirect();

    $user = User::query()->where('email', 'budi@example.com')->firstOrFail();

    expect($user->role)->toBe('bawahan')
        ->and($user->supervisor_id)->toBe($supervisor->id)
        ->and(Hash::check('password123', $user->password))->toBeTrue();
});

it('requires a supervisor for subordinate users', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'bawahan',
        ])
        ->assertSessionHasErrors('supervisor_id');
});

it('keeps existing password when admin updates user without a new password', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create(['password' => 'old-password']);

    $this->actingAs($admin)
        ->put(route('admin.users.update', $user), [
            'name' => 'Nama Baru',
            'email' => $user->email,
            'password' => '',
            'password_confirmation' => '',
            'role' => 'atasan',
            'supervisor_id' => '',
            'is_active' => true,
        ])
        ->assertRedirect();

    expect($user->refresh()->name)->toBe('Nama Baru')
        ->and(Hash::check('old-password', $user->password))->toBeTrue();
});

it('blocks non-admin users from user management', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

it('allows admins to bulk delete selected users', function () {
    $admin = User::factory()->admin()->create();
    $first = User::factory()->create();
    $second = User::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.bulk-destroy'), ['user_ids' => [$first->id, $second->id]])
        ->assertRedirect();

    $this->assertModelMissing($first);
    $this->assertModelMissing($second);
});

it('prevents bulk deletion of the current admin account', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.bulk-destroy'), ['user_ids' => [$admin->id]])
        ->assertSessionHasErrors('user_ids');

    $this->assertModelExists($admin);
});
