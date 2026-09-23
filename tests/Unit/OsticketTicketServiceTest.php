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

it('combines ticket metadata and description into task description', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_id' => 1047,
        'ticket_number' => '608930',
        'status' => 'closed',
        'status_label' => 'Closed',
        'assigned_to' => 'Muhamad Febriansyah',
        'description' => 'Perbaiki koneksi Gallery SIM.',
    ]);

    expect($description)
        ->toContain('[Ticket osTicket #608930]')
        ->toContain('Status: Closed')
        ->toContain('Assign To: Muhamad Febriansyah')
        ->toContain('Perbaiki koneksi Gallery SIM.');
});
