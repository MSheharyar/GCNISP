<?php

namespace App\Services\Scrapers;

use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use RuntimeException;

/**
 * Logs into the Connect reseller portal. The login form uses a per-session csrf
 * token and hashed field names, so we parse those out of the login page each run.
 */
class ConnectConnector
{
    use ParsesHtmlTable;

    /** Authenticate and return the logged-in HTTP client (shared session). */
    private function login(string $user, string $pass): Client
    {
        $cfg = config('scrapers.connect');
        $client = new Client([
            'cookies' => new CookieJar(),
            'timeout' => 45,
            'headers' => ['User-Agent' => 'Mozilla/5.0 (GCN sync)'],
        ]);

        $loginHtml = (string) $client->get($cfg['login_url'])->getBody();
        preg_match('/name="csrf"\s+value="([^"]+)"/', $loginHtml, $c);
        preg_match('/<input type="text"[^>]*name="([^"]+)"/', $loginHtml, $u);
        preg_match('/<input type="password"[^>]*name="([^"]+)"/', $loginHtml, $p);
        $userField = $u[1] ?? '';
        $passField = $p[1] ?? '';
        if (! $userField || ! $passField) {
            throw new RuntimeException('Connect: could not parse the login form.');
        }

        $client->post($cfg['login_url'], [
            'form_params' => ['csrf' => $c[1] ?? '', $userField => $user, $passField => $pass],
        ]);

        return $client;
    }

    /** @return array<array{userName:string,dateTime:string,packageLabel:string,amount:int,payment:string}> */
    public function fetchRecharges(string $user, string $pass): array
    {
        $cfg = config('scrapers.connect');
        $client = $this->login($user, $pass);

        $reportHtml = (string) $client->get($cfg['report_url'])->getBody();
        if (! str_contains($reportHtml, 'Recharge Report')) {
            throw new RuntimeException('Connect: login failed or report unavailable.');
        }

        $rows = [];
        foreach ($this->tableRows($reportHtml) as $cells) {
            // [S.No, User Name, Franchise, By, Date/Time, Package, Amount, Payment, Action]
            if (count($cells) < 8 || ! is_numeric($cells[0])) {
                continue;
            }
            $rows[] = [
                'userName' => $cells[1],
                'dateTime' => $cells[4],
                'packageLabel' => $cells[5],
                'amount' => (int) preg_replace('/[^0-9]/', '', $cells[6]),
                'payment' => $cells[7],
            ];
        }

        return $rows;
    }

    /**
     * Scrape the account's dashboard KPIs (subscriber counts + wallet balance).
     *
     * @return array<string,int|null>
     */
    public function fetchDashboard(string $user, string $pass): array
    {
        $client = $this->login($user, $pass);
        $html = (string) $client->get('https://www.connect.net.pk/dashboard')->getBody();
        if (! str_contains($html, 'stats-item-body')) {
            throw new RuntimeException('Connect: dashboard unavailable (login failed?).');
        }

        // Each KPI tile is a <div class="stats-item-head">…Label…</div> followed by
        // <div class="stats-item-body">value</div>.
        $labels = [];
        preg_match_all('/>\s*([A-Za-z][A-Za-z0-9\- ]*?)\s*<\/div>\s*<div class="stats-item-body">\s*([\d,]+)/s', $html, $m, PREG_SET_ORDER);
        foreach ($m as $row) {
            $labels[strtolower(trim($row[1]))] = (int) str_replace(',', '', $row[2]);
        }

        preg_match('/credit-info.*?<b>\s*Balance\s*<\/b>.*?<b>\s*([\d,]+)\s*<\/b>/s', $html, $bal);

        return [
            'total' => $labels['total'] ?? null,
            'active' => $labels['active'] ?? null,
            'online' => $labels['online'] ?? null,
            'offline' => $labels['offline'] ?? null,
            'disabled' => $labels['active disabled'] ?? null,
            'inactive' => $labels['in-active'] ?? null,
            'expired' => $labels['expired'] ?? null,
            'expiring' => $labels['expiring in next 3 days'] ?? null,
            'new_users' => null,
            'balance' => isset($bal[1]) ? (int) str_replace(',', '', $bal[1]) : null,
            // Credit the company added to this reseller's wallet this month — the
            // monthly budget available to spend on customers' packages.
            'topup_received' => $this->fetchTopupReceived($client, now()->format('Y-m')),
            'topup_send' => null,
            'packages' => $this->fetchPackageWise($client),
        ];
    }

    /**
     * Wallet top-up (company credit) grouped by month across a date range.
     * One login + one report fetch for the whole window.
     *
     * @return array<string,int> ['YYYY-MM' => credit]
     */
    public function fetchTopupByMonth(string $user, string $pass, string $from, string $to): array
    {
        $client = $this->login($user, $pass);
        $html = (string) $client->get(config('scrapers.connect.balance_logs_url'), [
            'query' => [
                'SortBy' => '%', 'SortOrder' => '', 'PageNumber' => '1',
                'DealerID' => '', 'Type' => '', 'AssignBy' => '', 'DateRange' => $from.' - '.$to,
            ],
        ])->getBody();

        $byMonth = [];
        foreach ($this->tableRows($html) as $cells) {
            // [#, Timestamp, Dealer, Credit, Payment, Description, By]
            if (count($cells) < 5 || ! is_numeric(trim($cells[0]))) {
                continue; // skip header + Total footer
            }
            $ym = substr(trim($cells[1]), 0, 7);
            $byMonth[$ym] = ($byMonth[$ym] ?? 0) + (int) preg_replace('/[^0-9]/', '', $cells[3]);
        }

        return $byMonth;
    }

    /**
     * Sum the credit the company added to this reseller's wallet for the given
     * month (YYYY-MM), from the Balance Logs report. Non-fatal on failure.
     */
    private function fetchTopupReceived(Client $client, string $ym): ?int
    {
        try {
            // The report is server-filtered by a "YYYY-MM-01 - YYYY-MM-last" range;
            // the named form params are accepted directly (no hashed key needed).
            $range = $ym.'-01 - '.date('Y-m-t', strtotime($ym.'-01'));
            $html = (string) $client->get(config('scrapers.connect.balance_logs_url'), [
                'query' => [
                    'SortBy' => '%', 'SortOrder' => '', 'PageNumber' => '1',
                    'DealerID' => '', 'Type' => '', 'AssignBy' => '', 'DateRange' => $range,
                ],
            ])->getBody();

            $total = 0;
            foreach ($this->tableRows($html) as $cells) {
                // [#, Timestamp, Dealer, Credit, Payment, Description, By] — the
                // numeric-# guard skips the header and the "Total" footer row.
                if (count($cells) < 5 || ! is_numeric(trim($cells[0]))) {
                    continue;
                }
                $total += (int) preg_replace('/[^0-9]/', '', $cells[3]); // Credit column
            }

            return $total;
        } catch (\Throwable $e) {
            return null; // non-fatal — the rest of the dashboard still returns
        }
    }

    /**
     * The "Online Customers Package wise" table is lazy-loaded by the dashboard
     * from a separate AJAX component. Returns online/active counts per speed.
     *
     * @return array<array{speed:string,online:int,active:int}>|null
     */
    private function fetchPackageWise(Client $client): ?array
    {
        try {
            $html = (string) $client->get('https://www.connect.net.pk/customers/component/online-customer?AJAXRequest=true&group_by=Dealer', [
                'headers' => ['X-Requested-With' => 'XMLHttpRequest', 'Referer' => 'https://www.connect.net.pk/dashboard'],
            ])->getBody();

            preg_match_all('/colspan="2"[^>]*>\s*(\d+Mbps)/', $html, $sm);
            $speeds = $sm[1] ?? [];
            if (! $speeds) {
                return null;
            }

            // The tfoot "Total" row carries the clean per-speed O/A figures.
            $tfoot = preg_match('/<tfoot>(.*?)<\/tfoot>/s', $html, $tf) ? $tf[1] : '';
            preg_match_all('/text-center">\s*(\d+)\s*<\/th>/', $tfoot, $vm);
            $vals = array_map('intval', $vm[1] ?? []);

            $packages = [];
            foreach ($speeds as $i => $speed) {
                $packages[] = [
                    'speed' => $speed,
                    'online' => $vals[$i * 2] ?? 0,
                    'active' => $vals[$i * 2 + 1] ?? 0,
                ];
            }

            return $packages;
        } catch (\Throwable $e) {
            return null; // non-fatal — the KPI numbers still return
        }
    }
}
