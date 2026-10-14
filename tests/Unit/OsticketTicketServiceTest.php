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

it('keeps only the ticket request in natural task description', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_id' => 1047,
        'ticket_number' => '608930',
        'status' => 'closed',
        'status_label' => 'Closed',
        'assigned_to' => 'Muhamad Febriansyah',
        'description' => 'Perbaiki koneksi Gallery SIM.',
    ]);

    expect($description)
        ->toBe("Perbaikan koneksi Gallery SIM.\n\nSumber: osTicket #608930");
});

it('normalizes request and removes links while retaining ticket source', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_number' => '12345',
        'subject' => 'Support / Reporting BPR',
        'description' => 'dear tim, mohon bantu buatkan report dengan nama Fulfillment AKARI: https://metabase.example/report',
    ]);

    expect($description)
        ->toBe("Pembuatan report Fulfillment AKARI.\n\nSumber: osTicket #12345")
        ->not->toContain('dear tim')
        ->not->toContain('https://');
});

it('summarises report requests and removes duplicate report name from menu', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_number' => '294124',
        'description' => 'Tolong buatkan Report Komponen Gaji Kontrak Kerja https://metabase.example/report Menu : Metabase - OSM - Report Komponen Gaji Kontrak Kerja',
    ]);

    expect($description)
        ->toBe("Pembuatan Report Komponen Gaji Kontrak Kerja.\n\nMenu: Metabase – OSM\n\nSumber: osTicket #294124")
        ->not->toContain('https://');
});

it('clarifies requests to raise a report to reporting', function (): void {
    $description = (new OsticketTicketService)->descriptionFor([
        'ticket_number' => '791292',
        'description' => 'Naikin ke reporting ya OSM-Report Beban Pendaftaran BPJS KS.',
    ]);

    expect($description)
        ->toBe("Penambahan report OSM-Report Beban Pendaftaran BPJS KS ke menu Reporting.\n\nSumber: osTicket #791292");
});

it('does not include following ticket items or links in task title', function (): void {
    $title = (new OsticketTicketService)->titleFor([
        'subject' => 'Support / Reporting BPR',
        'description' => 'Buat menu pada aplikasi reporting nya terimakasih ....1. Report Proyeksi Perubahan Entitas TADhttps://metabase.example/report',
    ]);

    expect($title)
        ->toBe('Buat menu pada aplikasi reporting nya terimakasih')
        ->not->toContain('https://')
        ->not->toContain('1. Report');
});
