<?php

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
