<?php

use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    expect($this->app->make('auth')->user()->role)->toBe('bawahan');
});

test('new subordinate users can be assigned to an active supervisor', function () {
    $supervisor = User::factory()->atasan()->create();

    $this->post(route('register.store'), [
        'name' => 'Assigned User',
        'email' => 'assigned@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'supervisor_id' => $supervisor->id,
    ]);

    expect($this->app->make('auth')->user()->supervisor_id)->toBe($supervisor->id);
});
