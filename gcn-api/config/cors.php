<?php

return [
    'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // Web app (5173) + Flutter web dev server (5000). The pattern also allows any
    // localhost port during development (native mobile builds aren't subject to CORS).
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000'],
    'allowed_origins_patterns' => ['#^http://(localhost|127\.0\.0\.1):\d+$#'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
