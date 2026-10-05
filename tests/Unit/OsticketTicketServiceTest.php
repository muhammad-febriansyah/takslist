<?php

use App\Services\OsticketTicketService;

it('maps osTicket status to task status', function (string $ticketStatus, string $taskStatus): void {
    expect((new OsticketTicketService)->taskStatusFor(['status' => $ticketStatus]))
        ->toBe($taskStatus);
})->with([
    ['open', 'in_progress'],
    ['closed', 'done'],
    ['pending', 'review'],
]);

it('creates a natural task title from ticket instructions', function (): void {
    $service = new OsticketTicketService;

    expect($service->titleFor([
        'ticket_number' => '608930',
        'subject' => 'Support / Reporting BPR',
        'description' => 'dear tim, mohon bantu buatkan report dengan nama Fulfillment AKARI: https://metabase.example/report',
    ]))->toBe('Buat report dengan nama Fulfillment AKARI');
});

it('keeps ticket metadata and description in natural task description', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_id' => 1047,
        'ticket_number' => '608930',
        'status' => 'closed',
        'status_label' => 'Closed',
        'assigned_to' => 'Muhamad Febriansyah',
        'description' => 'Perbaiki koneksi Gallery SIM.',
    ]);

    expect($description)
        ->toContain('Perbaiki koneksi Gallery SIM.')
        ->toContain('Sumber: osTicket #608930');
});

it('formats ticket links as natural task details', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_number' => '12345',
        'subject' => 'Support / Reporting BPR',
        'description' => 'dear tim, mohon bantu buatkan report dengan nama Fulfillment AKARI: https://metabase.example/report',
    ]);

    expect($description)
        ->toContain('Buat report dengan nama Fulfillment AKARI.')
        ->toContain("Link Metabase:\nhttps://metabase.example/report")
        ->toContain('Sumber: osTicket #12345')
        ->not->toContain('dear tim');
});
