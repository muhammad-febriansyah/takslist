<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set([
        'osticket.enabled' => true,
        'osticket.source' => 'api',
        'osticket.api_url' => 'https://ticketing.example.com/taskflow-api.php',
        'osticket.api_token' => 'test-api-key',
    ]);

    Http::fake([
        'https://ticketing.example.com/taskflow-api.php*' => Http::response([
            'tickets' => [
                ['ticket_id' => 1, 'status' => 'closed', 'closed_at' => '2026-11-03 16:45:00'],
                ['ticket_id' => 2, 'status' => 'open', 'closed_at' => null],
            ],
        ]),
    ]);

    $user = User::factory()->create();
    $this->closedTask = Task::factory()->for($user)->create([
        'status' => 'done',
        'due_date' => '2026-10-28',
        'completed_at' => '2026-11-26 09:01:00',
        'external_source' => 'osticket',
        'external_ticket_id' => 1,
        'external_ticket_number' => '600001',
    ]);
    $this->openTask = Task::factory()->for($user)->create([
        'status' => 'in_progress',
        'due_date' => '2026-10-29',
        'completed_at' => null,
        'external_source' => 'osticket',
        'external_ticket_id' => 2,
        'external_ticket_number' => '600002',
    ]);
});

it('moves imported closed tickets to their close date', function (): void {
    $this->artisan('tasks:sync-osticket-closed-dates')
        ->expectsOutputToContain('1 task diperbarui')
        ->assertSuccessful();

    expect($this->closedTask->refresh()->due_date->toDateString())->toBe('2026-11-03')
        ->and($this->closedTask->completed_at->toDateTimeString())->toBe('2026-11-03 16:45:00')
        ->and($this->openTask->refresh()->due_date->toDateString())->toBe('2026-10-29')
        ->and($this->openTask->completed_at)->toBeNull();

    Http::assertSent(fn (Request $request): bool => $request['ticket_ids'] === '1,2');
});

it('only previews the changes on a dry run', function (): void {
    $this->artisan('tasks:sync-osticket-closed-dates', ['--dry-run' => true])
        ->expectsOutputToContain('1 task akan diperbarui')
        ->assertSuccessful();

    expect($this->closedTask->refresh()->due_date->toDateString())->toBe('2026-10-28')
        ->and($this->closedTask->completed_at->toDateTimeString())->toBe('2026-11-26 09:01:00');
});
