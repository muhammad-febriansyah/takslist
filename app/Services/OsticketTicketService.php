<?php

namespace App\Services;

use App\Models\User;
use DateTimeImmutable;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class OsticketTicketService
{
    /**
     * @return array{configured: bool, user_name: string, matched_staff: array<string, mixed>|null, candidates: list<array<string, mixed>>, tickets: list<array<string, mixed>>}
     */
    public function previewFor(User $user, ?string $period = null): array
    {
        $period = $this->normalisePeriod($period);
        $userName = $user->name;

        if (! config('osticket.enabled')) {
            return $this->emptyPreview($userName);
        }

        return match ((string) config('osticket.source', 'database')) {
            'database' => $this->previewFromDatabase($userName, $period),
            'api' => $this->previewFromApi($userName, $period),
            default => throw new RuntimeException('Unsupported osTicket source.'),
        };
    }

    /**
     * @param  array<string, mixed>  $ticket
     */
    public function taskStatusFor(array $ticket): string
    {
        return match (Str::lower((string) ($ticket['status'] ?? ''))) {
            'open' => 'in_progress',
            'closed' => 'done',
            default => 'review',
        };
    }

    /**
     * @param  array<string, mixed>  $ticket
     */
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

    /**
     * @return array{configured: bool, user_name: string, matched_staff: array<string, mixed>|null, candidates: list<array<string, mixed>>, tickets: list<array<string, mixed>>}
     */
    private function previewFromDatabase(string $userName, string $period): array
    {
        $connection = DB::connection((string) config('osticket.database_connection', 'osticket'));
        $staff = $this->findStaff($connection, $userName);
        $matchThreshold = (float) config('osticket.match_threshold', 90);
        $candidateThreshold = (float) config('osticket.candidate_threshold', 75);
        $matchedStaff = null;

        foreach ($staff as $candidate) {
            if ($candidate['score'] >= $matchThreshold) {
                $matchedStaff = $candidate;
                break;
            }
        }

        $candidates = array_slice(array_filter(
            $staff,
            static fn (array $candidate): bool => $candidate['score'] >= $candidateThreshold,
        ), 0, 5);

        return [
            'configured' => true,
            'user_name' => $userName,
            'matched_staff' => $matchedStaff,
            'candidates' => $candidates,
            'tickets' => $matchedStaff === null
                ? []
                : $this->findTickets($connection, (int) $matchedStaff['staff_id'], $period),
        ];
    }

    /**
     * @return list<array{staff_id: int, name: string, score: float}>
     */
    private function findStaff(Connection $connection, string $userName): array
    {
        $staff = [];

        foreach ($connection->table($this->tableName('staff'))
            ->select(['staff_id', 'firstname', 'lastname'])
            ->where('isactive', 1)
            ->get() as $row) {
            $name = trim(implode(' ', array_filter([
                (string) ($row->firstname ?? ''),
                (string) ($row->lastname ?? ''),
            ])));

            $staff[] = [
                'staff_id' => (int) $row->staff_id,
                'name' => $name,
                'score' => $this->matchScore($name, $userName),
            ];
        }

        usort($staff, static fn (array $left, array $right): int => $right['score'] <=> $left['score']);

        return $staff;
    }

    /**
     * @return list<array{ticket_id: int, ticket_number: string, created_at: string, status: string, status_label: string, subject: string, description: string, assigned_to: string}>
     */
    private function findTickets(Connection $connection, int $staffId, string $period): array
    {
        $periodDate = DateTimeImmutable::createFromFormat('!Y-m', $period);

        if ($periodDate === false) {
            throw new RuntimeException('Invalid osTicket period.');
        }

        $firstDay = $periodDate->modify('first day of this month')->format('Y-m-d 00:00:00');
        $lastDay = $periodDate->modify('last day of this month')->format('Y-m-d 23:59:59');
        $firstEntries = $connection->table($this->tableName('thread_entry'))
            ->select('thread_id')
            ->selectRaw('MIN(id) AS first_entry_id')
            ->where('type', 'M')
            ->groupBy('thread_id');

        $rows = $connection->table($this->tableName('ticket').' as ticket')
            ->leftJoin($this->tableName('ticket_status').' as ticket_status', 'ticket_status.id', '=', 'ticket.status_id')
            ->leftJoin($this->tableName('ticket__cdata').' as cdata', 'cdata.ticket_id', '=', 'ticket.ticket_id')
            ->leftJoin($this->tableName('thread').' as ticket_thread', function ($join): void {
                $join->on('ticket_thread.object_id', '=', 'ticket.ticket_id')
                    ->where('ticket_thread.object_type', '=', 'T');
            })
            ->leftJoinSub($firstEntries, 'first_entry', function ($join): void {
                $join->on('first_entry.thread_id', '=', 'ticket_thread.id');
            })
            ->leftJoin($this->tableName('thread_entry').' as entry', 'entry.id', '=', 'first_entry.first_entry_id')
            ->leftJoin($this->tableName('staff').' as staff', 'staff.staff_id', '=', 'ticket.staff_id')
            ->leftJoin($this->tableName('team').' as team', 'team.team_id', '=', 'ticket.team_id')
            ->where('ticket.staff_id', $staffId)
            ->whereBetween('ticket.created', [$firstDay, $lastDay])
            ->orderByDesc('ticket.updated')
            ->orderByDesc('ticket.ticket_id')
            ->limit(100)
            ->select([
                'ticket.ticket_id',
                'ticket.number as ticket_number',
                'ticket.created as created_at',
                'ticket_status.state as status',
                'ticket_status.name as status_label',
                'cdata.subject',
                'entry.body as description',
            ])
            ->selectSub(
                $connection->table($this->tableName('form_entry_values').' as answer')
                    ->join($this->tableName('form_entry').' as form_entry', 'form_entry.id', '=', 'answer.entry_id')
                    ->join($this->tableName('form_field').' as form_field', 'form_field.id', '=', 'answer.field_id')
                    ->whereColumn('form_entry.object_id', 'ticket.ticket_id')
                    ->where('form_entry.object_type', 'T')
                    ->where(function ($query): void {
                        $query
                            ->whereRaw("LOWER(REPLACE(REPLACE(COALESCE(form_field.name, ''), '_', ''), ' ', '')) LIKE '%deskripsi%'")
                            ->orWhereRaw("LOWER(REPLACE(REPLACE(COALESCE(form_field.name, ''), '_', ''), ' ', '')) LIKE '%description%'")
                            ->orWhereRaw("LOWER(REPLACE(REPLACE(COALESCE(form_field.label, ''), '_', ''), ' ', '')) LIKE '%deskripsi%'")
                            ->orWhereRaw("LOWER(REPLACE(REPLACE(COALESCE(form_field.label, ''), '_', ''), ' ', '')) LIKE '%description%'");
                    })
                    ->selectRaw("COALESCE(NULLIF(TRIM(answer.value), ''), NULLIF(TRIM(answer.value_id), ''))")
                    ->orderBy('form_field.id')
                    ->limit(1),
                'custom_description',
            )
            ->selectRaw("COALESCE(NULLIF(TRIM(CONCAT_WS(' ', staff.firstname, staff.lastname)), ''), team.name) AS assigned_to")
            ->get();

        $tickets = [];

        foreach ($rows as $ticket) {
            $tickets[] = [
                'ticket_id' => (int) $ticket->ticket_id,
                'ticket_number' => (string) $ticket->ticket_number,
                'created_at' => (string) $ticket->created_at,
                'status' => Str::lower((string) $ticket->status),
                'status_label' => (string) ($ticket->status_label ?: $ticket->status),
                'subject' => (string) ($ticket->subject ?: ''),
                'description' => $this->cleanDescription($ticket->custom_description ?: ($ticket->description ?? null)),
                'assigned_to' => (string) ($ticket->assigned_to ?: ''),
            ];
        }

        return $tickets;
    }

    /**
     * @return array{configured: bool, user_name: string, matched_staff: array<string, mixed>|null, candidates: list<array<string, mixed>>, tickets: list<array<string, mixed>>}
     */
    private function previewFromApi(string $userName, string $period): array
    {
        $apiUrl = (string) config('osticket.api_url', '');
        $apiToken = (string) config('osticket.api_token', '');

        if ($apiUrl === '' || $apiToken === '') {
            return $this->emptyPreview($userName);
        }

        $payload = Http::acceptJson()
            ->withHeaders(['X-TaskFlow-Token' => $apiToken])
            ->connectTimeout(3)
            ->timeout((int) config('osticket.timeout', 10))
            ->get($apiUrl, [
                'assignee' => $userName,
                'period' => $period,
            ])
            ->throw()
            ->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Invalid osTicket API response.');
        }

        $tickets = [];
        $payloadTickets = $payload['tickets'] ?? [];

        if (is_array($payloadTickets)) {
            foreach ($payloadTickets as $ticket) {
                if (! is_array($ticket)) {
                    continue;
                }

                $normalisedTicket = $this->stringKeyedArray($ticket);
                $normalisedTicket['status'] = Str::lower((string) ($normalisedTicket['status'] ?? ''));
                $normalisedTicket['description'] = $this->cleanDescription($normalisedTicket['description'] ?? null);
                $tickets[] = $normalisedTicket;
            }
        }

        $matchedStaff = is_array($payload['matched_staff'] ?? null)
            ? $this->stringKeyedArray($payload['matched_staff'])
            : null;
        $candidates = [];
        $payloadCandidates = $payload['candidates'] ?? [];

        if (is_array($payloadCandidates)) {
            foreach ($payloadCandidates as $candidate) {
                if (is_array($candidate)) {
                    $candidates[] = $this->stringKeyedArray($candidate);
                }
            }
        }

        return [
            'configured' => true,
            'user_name' => (string) ($payload['user_name'] ?? $userName),
            'matched_staff' => $matchedStaff,
            'candidates' => $candidates,
            'tickets' => $tickets,
        ];
    }

    /**
     * @param  array<mixed, mixed>  $value
     * @return array<string, mixed>
     */
    private function stringKeyedArray(array $value): array
    {
        $result = [];

        foreach ($value as $key => $item) {
            if (is_string($key)) {
                $result[$key] = $item;
            }
        }

        return $result;
    }

    private function tableName(string $table): string
    {
        return (string) config('osticket.table_prefix', 'ost_').$table;
    }

    private function matchScore(string $left, string $right): float
    {
        $left = $this->normaliseName($left);
        $right = $this->normaliseName($right);

        if ($left === '' || $right === '') {
            return 0;
        }

        similar_text($left, $right, $directScore);

        $leftTokens = explode(' ', $left);
        $rightTokens = explode(' ', $right);
        sort($leftTokens);
        sort($rightTokens);
        similar_text(implode(' ', $leftTokens), implode(' ', $rightTokens), $tokenScore);

        return round(max($directScore, $tokenScore), 2);
    }

    private function normaliseName(string $value): string
    {
        return Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->trim()
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

    /**
     * @return array{configured: bool, user_name: string, matched_staff: null, candidates: list<never>, tickets: list<never>}
     */
    private function emptyPreview(string $userName): array
    {
        return [
            'configured' => false,
            'user_name' => $userName,
            'matched_staff' => null,
            'candidates' => [],
            'tickets' => [],
        ];
    }
}
