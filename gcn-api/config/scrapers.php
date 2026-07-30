<?php

// Portal scraper configuration. Credentials come from .env (gitignored).
// For the SaaS build these move to a per-dealer, encrypted store — the
// connectors already take credentials as parameters, so only the source changes.
return [
    'connect' => [
        'login_url' => env('CONNECT_LOGIN_URL', 'https://www.connect.net.pk/login'),
        'report_url' => env('CONNECT_REPORT_URL', 'https://www.connect.net.pk/customers/report/recharge-logs'),
        // Credit the company added to the reseller wallet (monthly top-up budget).
        'balance_logs_url' => env('CONNECT_BALANCE_LOGS_URL', 'https://www.connect.net.pk/dealers/report/balance-logs'),
        // account name (matches accounts table) => portal credentials
        'accounts' => [
            'GCNDIGITAL' => ['user' => env('CONNECT_GCNDIGITAL_USER'), 'pass' => env('CONNECT_GCNDIGITAL_PASS')],
            'MRGNET' => ['user' => env('CONNECT_MRGNET_USER'), 'pass' => env('CONNECT_MRGNET_PASS')],
        ],
    ],

    'fiberbeam' => [
        'login_url' => env('FIBERBEAM_LOGIN_URL', 'https://billing.fiber-beam.net/login.php'),
        'report_ajax' => env('FIBERBEAM_REPORT_AJAX', 'https://billing.fiber-beam.net/function/dealer_ajax/dealer_user_recharge_report.php'),
        'dealer' => env('FIBERBEAM_DEALER', 'gcndigital'),
        'user' => env('FIBERBEAM_USER'),
        'pass' => env('FIBERBEAM_PASS'),
        'account' => 'Fiber ISP', // maps to accounts table
    ],
];
