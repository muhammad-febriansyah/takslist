<?php

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('allows admin to update website identity and upload a png logo', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->patch(route('site-settings.update'), [
            'site_name' => 'Ruang Kerja',
            'keyword' => 'kolaborasi tim',
            'tagline' => 'Kerja lebih rapi setiap hari.',
            'logo' => UploadedFile::fake()->create('ruang-kerja.png', 20, 'image/png'),
        ])
        ->assertRedirect();

    $settings = SiteSetting::current();

    expect($settings->site_name)->toBe('Ruang Kerja')
        ->and($settings->keyword)->toBe('kolaborasi tim')
        ->and($settings->updated_by)->toBe($admin->id);

    Storage::disk('public')->assertExists($settings->logo_path);
});

it('returns relative URLs for uploaded site assets', function () {
    $settings = SiteSetting::factory()->create([
        'logo_path' => 'site/logo.png',
        'favicon_path' => 'site/favicon.png',
    ]);

    $publicSettings = $settings->toPublicArray();

    expect($publicSettings['logo_url'])->toStartWith('/storage/site/logo.png?v=')
        ->and($publicSettings['favicon_url'])->toStartWith('/storage/site/favicon.png?v=');
});

it('forbids non-admin users from changing website identity', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('site-settings.update'), [
            'site_name' => 'Tidak boleh',
            'keyword' => 'uji',
        ])
        ->assertForbidden();
});

test('redirects the root page to login', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
