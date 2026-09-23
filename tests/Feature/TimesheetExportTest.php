<?php

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\User;
use App\TimesheetExportService;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

$signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

it('exports private task descriptions into the timesheet template', function () use ($signatureData) {
    $owner = User::factory()->create(['name' => 'Budi TaskFlow']);
    $otherUser = User::factory()->create();
    Task::factory()->for($owner)->create([
        'title' => 'Review laporan mingguan',
        'due_date' => '2026-09-03',
    ]);
    Task::factory()->for($otherUser)->create([
        'title' => 'Data milik user lain',
        'due_date' => '2026-09-03',
    ]);

    $path = app(TimesheetExportService::class)->generate($owner, [
        'department' => 'Web Development',
        'client' => 'SIM',
        'approved_by' => 'Agus Ardianto',
        'approved_role' => 'Dept Head IT Apps',
        'period' => '2026-09',
        'signature_data' => $signatureData,
    ]);

    $zip = new ZipArchive;
    expect($zip->open($path))->toBeTrue();

    $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
    $workbook = $zip->getFromName('xl/workbook.xml');
    $signature = $zip->getFromName('xl/media/signature.png');
    $drawing = $zip->getFromName('xl/drawings/drawing1.xml');
    $zip->close();
    unlink($path);

    expect($sheet)
        ->toContain('Budi TaskFlow')
        ->toContain('Web Development')
        ->toContain('Agus Ardianto')
        ->toContain('Dept Head IT Apps')
        ->toContain('Review laporan mingguan')
        ->not->toContain('Data milik user lain')
        ->and($workbook)->toContain('September 2026')
        ->and($signature)->not->toBeFalse()
        ->and($drawing)
        ->toContain('Digital Signature')
        ->toContain('<xdr:col>3</xdr:col>')
        ->toContain('<xdr:col>6</xdr:col>');
});

it('downloads a timesheet export for the authenticated user', function () use ($signatureData) {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('tasks.export.timesheet'), [
            'department' => 'Product',
            'client' => 'SIM',
            'approved_by' => 'Agus Ardianto',
            'approved_role' => 'Dept Head IT Apps',
            'period' => '2026-09',
            'signature_data' => $signatureData,
        ])
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->assertHeader('content-disposition');
});

it('blocks subordinate timesheet download until period tasks are approved', function () use ($signatureData) {
    $supervisor = User::factory()->atasan()->create();
    $subordinate = User::factory()->state([
        'supervisor_id' => $supervisor->id,
    ])->create();
    Task::factory()->for($subordinate)->create(['due_date' => '2026-09-03']);

    $this->actingAs($subordinate)
        ->post(route('tasks.export.timesheet'), [
            'department' => 'Product',
            'client' => $supervisor->name,
            'approved_by' => $supervisor->name,
            'approved_role' => 'Atasan',
            'period' => '2026-09',
            'signature_data' => $signatureData,
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Timesheet belum bisa diunduh. Semua task pada periode ini harus disetujui atasan.');
});

it('uses the supervisor approval signature when a subordinate downloads a timesheet', function () use ($signatureData) {
    Storage::fake('public');
    $supervisor = User::factory()->atasan()->create(['position' => 'Head of IT']);
    $subordinate = User::factory()->state([
        'role' => 'bawahan',
        'supervisor_id' => $supervisor->id,
    ])->create();
    $task = Task::factory()->for($subordinate)->create(['due_date' => '2026-09-03', 'status' => 'done']);
    $review = TaskReview::factory()->create([
        'task_id' => $task->id,
        'submitted_by' => $subordinate->id,
        'reviewer_id' => $supervisor->id,
        'status' => 'approved',
        'signature_path' => 'signatures/supervisor.png',
        'signed_at' => now(),
    ]);
    Storage::disk('public')->put($review->signature_path, base64_decode(substr($signatureData, strlen('data:image/png;base64,'))));

    $this->actingAs($subordinate)
        ->post(route('tasks.export.timesheet'), [
            'department' => 'Product',
            'client' => 'SIM',
            'approved_by' => 'Nilai dari browser',
            'approved_role' => 'Bawahan',
            'period' => '2026-09',
            'signature_data' => '',
        ])
        ->assertOk();
});

it('marks weekend dates as red dates in the generated timesheet', function () use ($signatureData) {
    $owner = User::factory()->create();

    $path = app(TimesheetExportService::class)->generate($owner, [
        'department' => 'Product',
        'client' => 'SIM',
        'approved_by' => 'Atasan TaskFlow',
        'approved_role' => 'Atasan',
        'period' => '2026-09',
        'signature_data' => $signatureData,
    ]);

    $zip = new ZipArchive;
    expect($zip->open($path))->toBeTrue();

    $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();
    unlink($path);

    expect($sheet)->toContain('TANGGAL MERAH');
});

it('requires a department and period for export', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('tasks.export.timesheet'), [
            'period' => 'invalid',
        ])
        ->assertSessionHasErrors(['department', 'period']);
});

it('persists drag and drop ordering privately and tracks completion', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $firstTask = Task::factory()->for($owner)->create(['status' => 'todo', 'sort_order' => 1000]);
    $secondTask = Task::factory()->for($owner)->create(['status' => 'todo', 'sort_order' => 2000]);
    $otherTask = Task::factory()->for($otherUser)->create(['status' => 'todo', 'sort_order' => 1000]);

    $this->actingAs($owner)
        ->patch(route('tasks.reorder'), [
            'task_id' => $secondTask->id,
            'from_status' => 'todo',
            'to_status' => 'done',
            'ordered_task_ids' => [
                'todo' => [$firstTask->id],
                'in_progress' => [],
                'review' => [],
                'done' => [$secondTask->id],
            ],
        ])
        ->assertRedirect();

    expect($firstTask->refresh()->status)->toBe('todo')
        ->and($secondTask->refresh()->status)->toBe('done')
        ->and($secondTask->completed_at)->not->toBeNull()
        ->and($otherTask->refresh()->status)->toBe('todo');
});
