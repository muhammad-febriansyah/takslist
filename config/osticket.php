<?php

return [
    'enabled' => (bool) env('OSTICKET_ENABLED', false),
    'connection' => 'osticket',
    'table_prefix' => env('OSTICKET_DB_PREFIX', 'ost_'),
    'match_threshold' => (float) env('OSTICKET_MATCH_THRESHOLD', 90),
    'candidate_threshold' => (float) env('OSTICKET_CANDIDATE_THRESHOLD', 75),
];
