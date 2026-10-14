<?php

use App\Models\Task;
use App\Models\User;
use App\Services\OsticketTicketService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

it('loads ticket preview from the osTicket API', function (): void {
    config()->set([
        'osticket.enabled' => true,
        'osticket.source' => 'api',
        'osticket.api_url' => 'https://ticketing.example.com/taskflow-api.php',
        'osticket.api_token' => 'test-api-key',
    ]);

    Http::fake([
        'https://ticketing.example.com/taskflow-api.php*' => Http::response([
            'configured' => true,
            'user_name' => 'Bawahan TaskFlow',
            'matched_staff' => ['staff_id' => 7, 'name' => 'Bawahan TaskFlow', 'score' => 100],
            'candidates' => [],
            'tickets' => [[
                'ticket_id' => 1047,
                'ticket_number' => '608930',
                'status' => 'open',
                'status_label' => 'Open',
                'subject' => 'Gallery SIM',
                'description' => '<p>Perbaiki koneksi.</p>',
                'assigned_to' => 'Bawahan TaskFlow',
                'created_at' => '2026-09-22 10:30:00',
            ]],
        ]),
    ]);

    $preview = (new OsticketTicketService)->previewFor(
        User::factory()->make(['name' => 'Bawahan TaskFlow']),
        '2026-09',
    );

    expect($preview['configured'])->toBeTrue()
        ->and($preview['tickets'])->toHaveCount(1)
        ->and($preview['tickets'][0]['description'])->toBe('Perbaiki koneksi.');

    Http::assertSent(function (Request $request): bool {
        return $request->hasHeader('X-TaskFlow-Token', 'test-api-key')
            && $request['assignee'] === 'Bawahan TaskFlow'
            && $request['period'] === '2026-09';
    });
});

it('marks tickets already imported in the osTicket preview', function (): void {
    config()->set([
        'osticket.enabled' => true,
        'osticket.source' => 'api',
        'osticket.api_url' => 'https://ticketing.example.com/taskflow-api.php',
        'osticket.api_token' => 'test-api-key',
    ]);

    Http::fake([
        'https://ticketing.example.com/taskflow-api.php*' => Http::response([
            'configured' => true,
            'user_name' => 'Bawahan TaskFlow',
            'matched_staff' => ['staff_id' => 7, 'name' => 'Bawahan TaskFlow', 'score' => 100],
            'candidates' => [],
            'tickets' => [
                [
                    'ticket_id' => 1047,
                    'ticket_number' => '608930',
                    'status' => 'open',
                    'status_label' => 'Open',
                    'subject' => 'Sudah masuk',
                    'description' => 'Task lama.',
                    'assigned_to' => 'Bawahan TaskFlow',
                    'created_at' => '2026-09-22 10:30:00',
                ],
                [
                    'ticket_id' => 1048,
                    'ticket_number' => '608931',
                    'status' => 'open',
                    'status_label' => 'Open',
                    'subject' => 'Belum masuk',
                    'description' => 'Task baru.',
                    'assigned_to' => 'Bawahan TaskFlow',
                    'created_at' => '2026-09-23 10:30:00',
                ],
            ],
        ]),
    ]);

    $user = User::factory()->create(['name' => 'Bawahan TaskFlow']);
    Task::factory()->for($user)->create([
        'external_source' => 'osticket',
        'external_ticket_id' => 1047,
    ]);

    $this->actingAs($user)
        ->get(route('tasks.osticket.preview', ['period' => '2026-09']))
        ->assertOk()
        ->assertJsonPath('tickets.0.already_imported', true)
        ->assertJsonPath('tickets.1.already_imported', false);
});
