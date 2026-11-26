<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Services\OsticketTicketService;
use App\TimesheetExportService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

#[Signature('tasks:sync-osticket-closed-dates {--dry-run : Show the changes without saving them}')]
#[Description('Date tasks imported from closed osTicket tickets on the day each ticket was closed')]
class SyncOsticketClosedDates extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(OsticketTicketService $tickets, TimesheetExportService $timesheets): int
    {
        if (! config('osticket.enabled')) {
            $this->error('osTicket belum diaktifkan (OSTICKET_ENABLED=false).');

            return self::FAILURE;
        }

        $isDryRun = (bool) $this->option('dry-run');
        $changes = [];

        Task::query()
            ->where('external_source', 'osticket')
            ->whereNotNull('external_ticket_id')
            ->orderBy('id')
            ->chunkById(200, function (Collection $tasks) use ($tickets, $timesheets, $isDryRun, &$changes): void {
                $closures = $tickets->closuresFor(
                    $tasks->pluck('external_ticket_id')->map(fn (int|string $id): int => (int) $id)->unique()->values()->all(),
                );

                foreach ($tasks as $task) {
                    $closure = $closures[(int) $task->external_ticket_id] ?? null;
                    $closedAt = $closure === null ? null : $tickets->closedAtFor($closure);

                    if ($closedAt === null) {
                        continue;
                    }

                    $previousDueDate = $task->due_date;
                    $task->due_date = $closedAt->toDateString();
                    $task->external_status = $closure['status'];

                    if ($task->status === 'done') {
                        $task->completed_at = $closedAt;
                    }

                    if (! $task->isDirty(['due_date', 'completed_at'])) {
                        continue;
                    }

                    $changes[] = [
                        '#'.$task->external_ticket_number,
                        $task->title,
                        $previousDueDate?->toDateString() ?? '-',
                        $closedAt->format('Y-m-d H:i'),
                    ];

                    if ($isDryRun) {
                        continue;
                    }

                    $task->save();

                    if ($previousDueDate !== null && $previousDueDate->format('Y-m') !== $closedAt->format('Y-m')) {
                        $timesheets->syncSubmissionForTask($task->replicate()->forceFill(['due_date' => $previousDueDate]));
                    }

                    $timesheets->syncSubmissionForTask($task);
                }
            });

        if ($changes === []) {
            $this->info('Tidak ada task yang perlu diperbarui.');

            return self::SUCCESS;
        }

        $this->table(['Ticket', 'Task', 'Tanggal lama', 'Ditutup'], $changes);
        $this->info($isDryRun
            ? count($changes).' task akan diperbarui. Jalankan tanpa --dry-run untuk menyimpan.'
            : count($changes).' task diperbarui ke tanggal penutupan ticket.');

        return self::SUCCESS;
    }
}
