<?php

namespace App\Services;

use App\Models\User;
use DateTimeImmutable;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OsticketTicketService
{
    /**
     * @return array{configured: bool, user_name: string, matched_staff: array<string, mixed>|null, candidates: list<array<string, mixed>>, tickets: list<array<string, mixed>>}
     */
    public function previewFor(User $user, ?string $period = null): array
    {
        $userName = $user->name;
        $period = $this->normalisePeriod($period);

        if (! config('osticket.enabled')) {
            return [
                'configured' => false,
                'user_name' => $userName,
                'matched_staff' => null,
                'candidates' => [],
                'tickets' => [],
            ];
        }

        $staff = $this->connection()
            ->table($this->table('staff'))
            ->select(['staff_id', 'firstname', 'lastname'])
            ->where('isactive', 1)
            ->get()
            ->map(function (object $staff) use ($userName): array {
                $name = trim(implode(' ', array_filter([$staff->firstname, $staff->lastname])));

                return [
                    'staff_id' => (int) $staff->staff_id,
                    'name' => $name,
                    'score' => round($this->matchScore($name, $userName), 2),
                ];
            })
            ->sortByDesc('score')
            ->values();

        $bestMatch = $staff->first(
            fn (array $candidate): bool => $candidate['score'] >= (float) config('osticket.match_threshold', 90),
        );
        $candidates = $staff
            ->filter(fn (array $candidate): bool => $candidate['score'] >= (float) config('osticket.candidate_threshold', 75))
            ->take(5)
            ->values();

        return [
            'configured' => true,
            'user_name' => $userName,
            'matched_staff' => $bestMatch,
            'candidates' => array_values($candidates->all()),
            'tickets' => $bestMatch ? $this->ticketsForStaff((int) $bestMatch['staff_id'], $period) : [],
        ];
    }

    /** @param array<string, mixed> $ticket */
    public function taskStatusFor(array $ticket): string
    {
        return match (Str::lower((string) ($ticket['status'] ?? ''))) {
            'open' => 'in_progress',
            'closed' => 'done',
            default => 'review',
        };
    }

    /** @param array<string, mixed> $ticket */
    public function descriptionFor(array $ticket): string
    {
        $description = trim((string) ($ticket['description'] ?? ''));
        $description = $description !== '' ? $description : 'Tidak ada deskripsi ticket.';

        return implode("\n", [
            '[Ticket osTicket #'.($ticket['ticket_number'] ?? $ticket['ticket_id']).']',
            '',
            'Status: '.($ticket['status_label'] ?? $ticket['status'] ?? 'Tidak diketahui'),
            'Assign To: '.($ticket['assigned_to'] ?: 'Belum ditugaskan'),
            '',
            'Deskripsi:',
            $description,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function ticketsForStaff(int $staffId, string $period): array
    {
        $connection = $this->connection();
        $threadTable = $this->table('thread');
        $entryTable = $this->table('thread_entry');
        $periodDate = DateTimeImmutable::createFromFormat('!Y-m', $period);
        $firstDay = $periodDate->modify('first day of this month')->format('Y-m-d 00:00:00');
        $lastDay = $periodDate->modify('last day of this month')->format('Y-m-d 23:59:59');

        $firstEntry = $connection
            ->table($entryTable)
            ->select('thread_id')
            ->selectRaw('MIN(id) as first_entry_id')
            ->where('type', 'M')
            ->groupBy('thread_id');

        $tickets = $connection
            ->table($this->table('ticket').' as ticket')
            ->leftJoin($this->table('ticket_status').' as ticket_status', 'ticket_status.id', '=', 'ticket.status_id')
            ->leftJoin($this->table('ticket__cdata').' as cdata', 'cdata.ticket_id', '=', 'ticket.ticket_id')
            ->leftJoin($threadTable.' as ticket_thread', function ($join): void {
                $join->on('ticket_thread.object_id', '=', 'ticket.ticket_id')
                    ->where('ticket_thread.object_type', '=', 'T');
            })
            ->leftJoinSub($firstEntry, 'first_entry', function ($join): void {
                $join->on('first_entry.thread_id', '=', 'ticket_thread.id');
            })
            ->leftJoin($entryTable.' as entry', 'entry.id', '=', 'first_entry.first_entry_id')
            ->leftJoin($this->table('staff').' as staff', 'staff.staff_id', '=', 'ticket.staff_id')
            ->leftJoin($this->table('team').' as team', 'team.team_id', '=', 'ticket.team_id')
            ->where('ticket.staff_id', $staffId)
            ->whereBetween('ticket.created', [$firstDay, $lastDay])
            ->orderByDesc('ticket.updated')
            ->limit(100)
            ->get([
                'ticket.ticket_id',
                'ticket.number as ticket_number',
                'ticket.created as created_at',
                'ticket_status.state as status',
                'ticket_status.name as status_label',
                'cdata.subject',
                'entry.body as description',
                DB::raw("COALESCE(NULLIF(TRIM(CONCAT_WS(' ', staff.firstname, staff.lastname)), ''), team.name) as assigned_to"),
            ])
            ->map(function (object $ticket): array {
                return [
                    'ticket_id' => (int) $ticket->ticket_id,
                    'ticket_number' => (string) $ticket->ticket_number,
                    'created_at' => (string) $ticket->created_at,
                    'status' => Str::lower((string) $ticket->status),
                    'status_label' => (string) ($ticket->status_label ?: $ticket->status),
                    'subject' => (string) ($ticket->subject ?: ''),
                    'description' => $this->cleanDescription($ticket->description),
                    'assigned_to' => (string) ($ticket->assigned_to ?: ''),
                ];
            })
            ->all();

        return array_values($tickets);
    }

    private function connection(): Connection
    {
        return DB::connection((string) config('osticket.connection', 'osticket'));
    }

    private function table(string $name): string
    {
        return (string) config('osticket.table_prefix', 'ost_').$name;
    }

    private function matchScore(string $left, string $right): float
    {
        $left = $this->normaliseName($left);
        $right = $this->normaliseName($right);

        if ($left === '' || $right === '') {
            return 0;
        }

        similar_text($left, $right, $directScore);

        $leftTokens = collect(explode(' ', $left))->sort()->implode(' ');
        $rightTokens = collect(explode(' ', $right))->sort()->implode(' ');
        similar_text($leftTokens, $rightTokens, $tokenScore);

        return max($directScore, $tokenScore);
    }

    private function normaliseName(string $name): string
    {
        return Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->toString();
    }

    private function cleanDescription(?string $description): string
    {
        return Str::of(html_entity_decode(strip_tags($description ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8'))
            ->squish()
            ->toString();
    }

    private function normalisePeriod(?string $period): string
    {
        if ($period !== null && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period) === 1) {
            return $period;
        }

        return now()->format('Y-m');
    }
}
