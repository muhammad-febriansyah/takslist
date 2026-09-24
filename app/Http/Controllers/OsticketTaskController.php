<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportOsticketTasksRequest;
use App\Models\Task;
use App\Models\User;
use App\Services\OsticketTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

class OsticketTaskController extends Controller
{
    public function __construct(private readonly OsticketTicketService $tickets) {}

    public function preview(Request $request): JsonResponse
    {
        Gate::authorize('create', Task::class);

        try {
            /** @var User $user */
            $user = $request->user();
            $period = $request->string('period')->toString();

            return response()->json($this->tickets->previewFor($user, $period));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Koneksi API osTicket gagal. Periksa URL dan API key osTicket.',
            ], 503);
        }
    }

    public function import(ImportOsticketTasksRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $ticketIds = array_map('intval', $request->validated('ticket_ids'));
        $period = (string) $request->validated('period');

        try {
            $preview = $this->tickets->previewFor($user, $period);
            $tickets = collect($preview['tickets'])
                ->whereIn('ticket_id', $ticketIds)
                ->values();
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'ticket_ids' => 'Data osTicket tidak dapat dibaca. Periksa URL dan API key.',
            ]);
        }

        if ($tickets->count() !== count($ticketIds)) {
            throw ValidationException::withMessages([
                'ticket_ids' => 'Sebagian ticket tidak lagi ditugaskan ke akun ini.',
            ]);
        }

        $existingTicketIds = Task::query()
            ->where('external_source', 'osticket')
            ->whereIn('external_ticket_id', $ticketIds)
            ->pluck('external_ticket_id')
            ->map(fn (int|string $id): int => (int) $id)
            ->all();

        if ($existingTicketIds !== []) {
            throw ValidationException::withMessages([
                'ticket_ids' => 'Sebagian ticket sudah pernah diambil ke TaskList.',
            ]);
        }

        DB::transaction(function () use ($tickets, $user): void {
            foreach ($tickets as $ticket) {
                Task::query()->create([
                    'user_id' => $user->id,
                    'title' => $ticket['subject'] ?: 'Ticket #'.$ticket['ticket_number'],
                    'description' => $this->tickets->descriptionFor($ticket),
                    'status' => $this->tickets->taskStatusFor($ticket),
                    'priority' => 'medium',
                    'due_date' => substr((string) $ticket['created_at'], 0, 10),
                    'external_source' => 'osticket',
                    'external_ticket_id' => $ticket['ticket_id'],
                    'external_ticket_number' => $ticket['ticket_number'],
                    'external_status' => $ticket['status'],
                    'external_assignee_name' => $ticket['assigned_to'],
                    'completed_at' => $ticket['status'] === 'closed' ? now() : null,
                ]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $tickets->count().' ticket berhasil diambil menjadi task.',
        ]);

        return to_route('tasks.index');
    }
}
