<?php

use App\Models\User;

it('rejects inactive users from password login', function () {
    $user = User::factory()->create([
        'is_active' => false,
        'password' => 'password',
    ]);

    $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertSessionHasErrors('email');

    expect(auth()->check())->toBeFalse();
});

it('prevents an admin from deactivating own account', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'admin',
            'supervisor_id' => '',
            'is_active' => false,
            'password' => '',
            'password_confirmation' => '',
        ])
        ->assertSessionHasErrors('is_active');

    expect($admin->refresh()->is_active)->toBeTrue();
});

test('redirects the root page to login', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
