<?php

use App\Models\User;
use App\Services\OsticketTicketService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

it('loads assigned tickets directly from the osTicket database', function (): void {
    config()->set([
        'osticket.enabled' => true,
        'osticket.source' => 'database',
        'osticket.database_connection' => 'osticket',
        'osticket.table_prefix' => 'ost_',
        'osticket.match_threshold' => 90,
        'osticket.candidate_threshold' => 75,
        'database.connections.osticket' => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => false,
        ],
    ]);

    DB::purge('osticket');
    $connection = DB::connection('osticket');
    $schema = $connection->getSchemaBuilder();

    $schema->create('ost_staff', function (Blueprint $table): void {
        $table->unsignedInteger('staff_id')->primary();
        $table->string('firstname');
        $table->string('lastname');
        $table->boolean('isactive');
    });
    $schema->create('ost_ticket_status', function (Blueprint $table): void {
        $table->unsignedInteger('id')->primary();
        $table->string('state');
        $table->string('name');
    });
    $schema->create('ost_ticket__cdata', function (Blueprint $table): void {
        $table->unsignedInteger('ticket_id')->primary();
        $table->string('subject');
    });
    $schema->create('ost_form_entry', function (Blueprint $table): void {
        $table->unsignedInteger('id')->primary();
        $table->unsignedInteger('object_id');
        $table->string('object_type');
    });
    $schema->create('ost_form_field', function (Blueprint $table): void {
        $table->unsignedInteger('id')->primary();
        $table->string('name')->nullable();
        $table->string('label')->nullable();
    });
    $schema->create('ost_form_entry_values', function (Blueprint $table): void {
        $table->unsignedInteger('entry_id');
        $table->unsignedInteger('field_id');
        $table->text('value')->nullable();
        $table->string('value_id')->nullable();
    });
    $schema->create('ost_thread', function (Blueprint $table): void {
        $table->unsignedInteger('id')->primary();
        $table->unsignedInteger('object_id');
        $table->string('object_type');
    });
    $schema->create('ost_thread_entry', function (Blueprint $table): void {
        $table->unsignedInteger('id')->primary();
        $table->unsignedInteger('thread_id');
        $table->string('type');
        $table->text('body');
    });
    $schema->create('ost_team', function (Blueprint $table): void {
        $table->unsignedInteger('team_id')->primary();
        $table->string('name');
    });
    $schema->create('ost_ticket', function (Blueprint $table): void {
        $table->unsignedInteger('ticket_id')->primary();
        $table->string('number');
        $table->dateTime('created');
        $table->dateTime('updated');
        $table->unsignedInteger('status_id');
        $table->unsignedInteger('staff_id');
        $table->unsignedInteger('team_id');
    });

    $connection->table('ost_staff')->insert([
        'staff_id' => 7,
        'firstname' => 'Muhammad',
        'lastname' => 'Febriansyah',
        'isactive' => true,
    ]);
    $connection->table('ost_ticket_status')->insert([
        'id' => 1,
        'state' => 'open',
        'name' => 'Open',
    ]);
    $connection->table('ost_team')->insert([
        'team_id' => 3,
        'name' => 'Support',
    ]);
    $connection->table('ost_ticket')->insert([
        'ticket_id' => 1047,
        'number' => '608930',
        'created' => '2026-09-22 10:30:00',
        'updated' => '2026-09-22 10:30:00',
        'status_id' => 1,
        'staff_id' => 7,
        'team_id' => 3,
    ]);
    $connection->table('ost_ticket__cdata')->insert([
        'ticket_id' => 1047,
        'subject' => 'Gallery SIM',
    ]);
    $connection->table('ost_form_entry')->insert([
        'id' => 7001,
        'object_id' => 1047,
        'object_type' => 'T',
    ]);
    $connection->table('ost_form_field')->insert([
        'id' => 21,
        'name' => 'deskripsi',
        'label' => 'Deskripsi',
    ]);
    $connection->table('ost_form_entry_values')->insert([
        'entry_id' => 7001,
        'field_id' => 21,
        'value' => 'Pembuatan 5 website entitas SIMGROUP',
        'value_id' => null,
    ]);
    $connection->table('ost_thread')->insert([
        'id' => 501,
        'object_id' => 1047,
        'object_type' => 'T',
    ]);
    $connection->table('ost_thread_entry')->insert([
        'id' => 9001,
        'thread_id' => 501,
        'type' => 'M',
        'body' => '<p>Perbaiki koneksi.</p>',
    ]);

    $preview = (new OsticketTicketService)->previewFor(
        User::factory()->make(['name' => 'Muhammad Febriansyah']),
        '2026-09',
    );

    expect($preview['configured'])->toBeTrue()
        ->and($preview['matched_staff']['name'])->toBe('Muhammad Febriansyah')
        ->and($preview['tickets'])->toHaveCount(1)
        ->and($preview['tickets'][0]['subject'])->toBe('Gallery SIM')
        ->and($preview['tickets'][0]['description'])->toBe('Pembuatan 5 website entitas SIMGROUP');
});
