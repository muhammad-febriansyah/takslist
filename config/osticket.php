<?php

return [
    'enabled' => (bool) env('OSTICKET_ENABLED', false),
    'source' => env('OSTICKET_SOURCE', 'database'),
    'database_connection' => env('OSTICKET_DB_CONNECTION', 'osticket'),
    'table_prefix' => env('OSTICKET_DB_PREFIX', 'ost_'),
    'api_url' => env('OSTICKET_API_URL'),
    'api_token' => env('OSTICKET_API_TOKEN'),
    'timeout' => (int) env('OSTICKET_API_TIMEOUT', 10),
    'match_threshold' => (float) env('OSTICKET_MATCH_THRESHOLD', 90),
    'candidate_threshold' => (float) env('OSTICKET_CANDIDATE_THRESHOLD', 75),
];
