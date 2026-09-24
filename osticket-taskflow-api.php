<?php

declare(strict_types=1);

/**
 * Read-only TaskFlow bridge for osTicket.
 *
 * Copy this file to the osTicket web root. Configure TASKFLOW_API_TOKEN in
 * the server environment, then call this file with the X-TaskFlow-Token header.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** @param array<string, mixed> $payload */
function taskflowApiResponse(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function taskflowApiCleanText(?string $value): string
{
    return trim((string) preg_replace(
        '/\\s+/u',
        ' ',
        html_entity_decode(strip_tags($value ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
    ));
}

function taskflowApiNormaliseName(string $value): string
{
    $value = function_exists('iconv')
        ? (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value)
        : $value;
    $value = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);

    return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $value));
}

function taskflowApiMatchScore(string $left, string $right): float
{
    $left = taskflowApiNormaliseName($left);
    $right = taskflowApiNormaliseName($right);

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

function taskflowApiReadTickets(int $staffId, string $period): array
{
    $periodDate = DateTimeImmutable::createFromFormat('!Y-m', $period);
    $firstDay = $periodDate->modify('first day of this month')->format('Y-m-d 00:00:00');
    $lastDay = $periodDate->modify('last day of this month')->format('Y-m-d 23:59:59');
    $firstEntry = '(SELECT thread_id, MIN(id) AS first_entry_id FROM '.THREAD_ENTRY_TABLE." WHERE type='M' GROUP BY thread_id) AS first_entry";

    $sql = 'SELECT ticket.ticket_id, ticket.number AS ticket_number, ticket.created AS created_at, '
        .'ticket_status.state AS status, ticket_status.name AS status_label, '
        .'cdata.subject, entry.body AS description, '
        ."(SELECT COALESCE(NULLIF(TRIM(answer.value), ''), NULLIF(TRIM(answer.value_id), '')) "
        .'FROM '.FORM_ANSWER_TABLE.' AS answer '
        .'JOIN '.FORM_ENTRY_TABLE.' AS form_entry ON form_entry.id = answer.entry_id '
        .'JOIN '.FORM_FIELD_TABLE.' AS form_field ON form_field.id = answer.field_id '
        ."WHERE form_entry.object_id = ticket.ticket_id AND form_entry.object_type = 'T' "
        ."AND (LOWER(REPLACE(REPLACE(COALESCE(form_field.name, ''), '_', ''), ' ', '')) LIKE '%deskripsi%' "
        ."OR LOWER(REPLACE(REPLACE(COALESCE(form_field.name, ''), '_', ''), ' ', '')) LIKE '%description%' "
        ."OR LOWER(REPLACE(REPLACE(COALESCE(form_field.label, ''), '_', ''), ' ', '')) LIKE '%deskripsi%' "
        ."OR LOWER(REPLACE(REPLACE(COALESCE(form_field.label, ''), '_', ''), ' ', '')) LIKE '%description%') "
        .'ORDER BY form_field.id ASC LIMIT 1) AS custom_description, '
        ."COALESCE(NULLIF(TRIM(CONCAT_WS(' ', staff.firstname, staff.lastname)), ''), team.name) AS assigned_to "
        .'FROM '.TICKET_TABLE.' AS ticket '
        .'LEFT JOIN '.TICKET_STATUS_TABLE.' AS ticket_status ON ticket_status.id = ticket.status_id '
        .'LEFT JOIN '.TICKET_CDATA_TABLE.' AS cdata ON cdata.ticket_id = ticket.ticket_id '
        .'LEFT JOIN '.THREAD_TABLE." AS ticket_thread ON ticket_thread.object_id = ticket.ticket_id AND ticket_thread.object_type = 'T' "
        .'LEFT JOIN '.$firstEntry.' ON first_entry.thread_id = ticket_thread.id '
        .'LEFT JOIN '.THREAD_ENTRY_TABLE.' AS entry ON entry.id = first_entry.first_entry_id '
        .'LEFT JOIN '.STAFF_TABLE.' AS staff ON staff.staff_id = ticket.staff_id '
        .'LEFT JOIN '.TEAM_TABLE.' AS team ON team.team_id = ticket.team_id '
        .'WHERE ticket.staff_id = '.db_input($staffId).' '
        .'AND ticket.created BETWEEN '.db_input($firstDay).' AND '.db_input($lastDay).' '
        .'ORDER BY ticket.updated DESC, ticket.ticket_id DESC LIMIT 100';

    $result = db_query($sql);
    if (! $result) {
        throw new RuntimeException('Unable to read osTicket tickets.');
    }

    $tickets = [];
    while ($ticket = db_fetch_array($result)) {
        $tickets[] = [
            'ticket_id' => (int) $ticket['ticket_id'],
            'ticket_number' => (string) $ticket['ticket_number'],
            'created_at' => (string) $ticket['created_at'],
            'status' => strtolower((string) $ticket['status']),
            'status_label' => (string) ($ticket['status_label'] ?: $ticket['status']),
            'subject' => (string) ($ticket['subject'] ?: ''),
            'description' => taskflowApiCleanText($ticket['custom_description'] ?: ($ticket['description'] ?? null)),
            'assigned_to' => (string) ($ticket['assigned_to'] ?: ''),
        ];
    }

    return $tickets;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    taskflowApiResponse(405, ['message' => 'Only GET requests are supported.']);
}

require_once __DIR__.'/main.inc.php';

$providedToken = trim((string) ($_SERVER['HTTP_X_TASKFLOW_TOKEN'] ?? ''));
$expectedToken = trim((string) (getenv('TASKFLOW_API_TOKEN')
    ?: ($_ENV['TASKFLOW_API_TOKEN'] ?? $_SERVER['TASKFLOW_API_TOKEN'] ?? '')));

if ($providedToken === '' || $expectedToken === '' || ! hash_equals($expectedToken, $providedToken)) {
    taskflowApiResponse(401, ['message' => 'Invalid or unauthorized token.']);
}

$period = trim((string) ($_GET['period'] ?? date('Y-m')));
$assignee = trim((string) ($_GET['assignee'] ?? ''));

if (preg_match('/^\\d{4}-(0[1-9]|1[0-2])$/', $period) !== 1) {
    taskflowApiResponse(422, ['message' => 'Period must use YYYY-MM format.']);
}

if ($assignee === '' || strlen($assignee) > 160) {
    taskflowApiResponse(422, ['message' => 'Assignee is required.']);
}

try {
    $staff = [];
    $result = db_query('SELECT staff_id, firstname, lastname FROM '.STAFF_TABLE.' WHERE isactive = 1');

    if (! $result) {
        throw new RuntimeException('Unable to read osTicket staff.');
    }

    while ($row = db_fetch_array($result)) {
        $name = trim(implode(' ', array_filter([$row['firstname'], $row['lastname']])));
        $staff[] = [
            'staff_id' => (int) $row['staff_id'],
            'name' => $name,
            'score' => taskflowApiMatchScore($name, $assignee),
        ];
    }

    usort($staff, static fn (array $left, array $right): int => $right['score'] <=> $left['score']);
    $matchedStaff = null;

    foreach ($staff as $candidate) {
        if ($candidate['score'] >= 90) {
            $matchedStaff = $candidate;
            break;
        }
    }

    $candidates = array_values(array_slice(array_filter(
        $staff,
        static fn (array $candidate): bool => $candidate['score'] >= 75,
    ), 0, 5));

    taskflowApiResponse(200, [
        'configured' => true,
        'user_name' => $assignee,
        'matched_staff' => $matchedStaff,
        'candidates' => $candidates,
        'tickets' => $matchedStaff
            ? taskflowApiReadTickets((int) $matchedStaff['staff_id'], $period)
            : [],
    ]);
} catch (Throwable $exception) {
    error_log('TaskFlow osTicket API error: '.$exception->getMessage());
    taskflowApiResponse(500, ['message' => 'Unable to read osTicket data.']);
}
