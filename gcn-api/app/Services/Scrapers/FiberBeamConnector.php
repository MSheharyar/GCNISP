<?php

namespace App\Services\Scrapers;

use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use RuntimeException;

/**
 * Logs into the Fiber Beam billing panel. The recharge report is served by an
 * AJAX endpoint (needs the X-Requested-With + Referer headers).
 */
class FiberBeamConnector
{
    use ParsesHtmlTable;

    /**
     * Authenticate and return the logged-in HTTP client (shared session).
     * Credentials default to the shared .env config (GCN) but a SaaS dealer
     * passes their own.
     */
    private function login(?string $user = null, ?string $pass = null): Client
    {
        $cfg = config('scrapers.fiberbeam');
        $client = new Client([
            'cookies' => new CookieJar(),
            'timeout' => 45,
            // Fiber Beam ships an incomplete cert chain (missing intermediate), so
            // strict verification fails for this known host.
            'verify' => false,
            'headers' => ['User-Agent' => 'Mozilla/5.0 (GCN sync)'],
        ]);

        $client->get($cfg['login_url']); // establish session
        $client->post($cfg['login_url'], [
            'form_params' => ['username' => $user ?? $cfg['user'], 'password' => $pass ?? $cfg['pass'], 'login_user' => 'Log IN'],
        ]);

        return $client;
    }

    /**
     * Wallet top-up ("FRANCHISE TOPUP RECEVIED") grouped by month across a range,
     * from the dealer ledger. One login + one fetch for the whole window.
     *
     * @return array<string,int> ['YYYY-MM' => amount]
     */
    public function fetchTopupByMonth(string $from, string $to, ?string $dealer = null, ?string $user = null, ?string $pass = null): array
    {
        $cfg = config('scrapers.fiberbeam');
        $client = $this->login($user, $pass);
        $dealer = $dealer ?? $cfg['dealer'];

        // The ledger caps rows, so a wide range drops the sparse top-up entries.
        // Fetch it one month at a time within the single logged-in session.
        $byMonth = [];
        $cur = \Illuminate\Support\Carbon::parse($from)->startOfMonth();
        $end = \Illuminate\Support\Carbon::parse($to)->startOfMonth();
        while ($cur <= $end) {
            $ym = $cur->format('Y-m');
            $html = (string) $client->post('https://billing.fiber-beam.net/function/dealer_ajax/ledger.php', [
                'form_params' => ['sd' => $cur->format('Y-m-01'), 'ed' => $cur->copy()->endOfMonth()->format('Y-m-d'), 'dealer' => $dealer],
                'headers' => ['X-Requested-With' => 'XMLHttpRequest', 'Referer' => 'https://billing.fiber-beam.net/en/ledger.php'],
            ])->getBody();

            if (str_contains($html, 'Access Denied')) {
                throw new RuntimeException('Fiber Beam: ledger access denied.');
            }

            // Ledger cols: [INV#, TYPE, USER/DEALER, DATE, AMOUNT, …]. Top-ups are
            // the wallet-credit rows; the amount is the cell right after the (ISO)
            // date, robust to trailing columns shifting.
            $sum = 0;
            foreach ($this->tableRows($html) as $cells) {
                $type = strtoupper($cells[1] ?? '');
                if (! str_contains($type, 'TOPUP') && ! str_contains($type, 'TOP UP')) {
                    continue;
                }
                $dateIdx = null;
                foreach ($cells as $i => $v) {
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($v))) {
                        $dateIdx = $i;
                        break;
                    }
                }
                if ($dateIdx !== null && isset($cells[$dateIdx + 1])) {
                    $sum += (int) preg_replace('/[^0-9]/', '', $cells[$dateIdx + 1]);
                }
            }
            $byMonth[$ym] = $sum;
            $cur->addMonth();
        }

        return $byMonth;
    }

    /** @return array<array{userId:string,name:string,packageLabel:string,loadDate:string,price:int}> */
    public function fetchRecharges(string $startDate, string $endDate, ?string $dealer = null, ?string $user = null, ?string $pass = null): array
    {
        $cfg = config('scrapers.fiberbeam');
        $client = $this->login($user, $pass);

        $html = (string) $client->post($cfg['report_ajax'], [
            'form_params' => ['sd' => $startDate, 'ed' => $endDate, 'dealer' => $dealer ?? $cfg['dealer']],
            'headers' => [
                'X-Requested-With' => 'XMLHttpRequest',
                'Referer' => 'https://billing.fiber-beam.net/en/user_report.php',
            ],
        ])->getBody();

        if (str_contains($html, 'Access Denied')) {
            throw new RuntimeException('Fiber Beam: access denied (login or headers).');
        }

        $rows = [];
        foreach ($this->tableRows($html) as $cells) {
            // [#, INV#, USERNAME, USER ID, PACKAGE, LOAD DATE, EXP, DAYS, PRICE, TAX, TOTAL, WALLET, ...]
            if (count($cells) < 9 || ! is_numeric($cells[0])) {
                continue;
            }
            $rows[] = [
                'userId' => $cells[3],
                'name' => $cells[2],
                'packageLabel' => $cells[4],
                'loadDate' => $cells[5],
                'price' => (int) preg_replace('/[^0-9]/', '', $cells[8]),
            ];
        }

        return $rows;
    }

    /**
     * Scrape the dashboard KPIs (subscriber counts, wallet, month's topups).
     *
     * @return array<string,int|null>
     */
    public function fetchDashboard(?string $user = null, ?string $pass = null): array
    {
        $client = $this->login($user, $pass);
        $html = (string) $client->get('https://billing.fiber-beam.net/en/index.php')->getBody();
        if (! str_contains($html, 'card-title')) {
            throw new RuntimeException('Fiber Beam: dashboard unavailable (login failed?).');
        }

        // KPI cards: <p class="card-category" …>Label</p><p class="card-title">value<p>
        // (the card-category tag can carry extra attributes, e.g. an inline style).
        $labels = [];
        preg_match_all('/card-category"[^>]*>\s*([^<]+?)\s*<\/p>\s*<p class="card-title">\s*([\d,]+)/s', $html, $m, PREG_SET_ORDER);
        foreach ($m as $row) {
            $key = strtolower(trim(str_replace("'", '', $row[1]))); // "Total User's" -> "total users"
            $labels[$key] = (int) str_replace(',', '', $row[2]);
        }

        // Offline isn't a card — it sits as plain text in the Online card's footer.
        preg_match('/Offline\s+([\d,]+)/s', $html, $off);
        preg_match('/Wallet\s*<span[^>]*>\s*([\d,]+)\s*PKR/s', $html, $w);

        // Two "N Pkr" figures in the footer cards: received first, then send.
        preg_match_all('/numbers pull-left">\s*([\d,]+)\s*Pkr/is', $html, $t);
        $topups = array_map(fn ($v) => (int) str_replace(',', '', $v), $t[1] ?? []);

        return [
            'total' => $labels['total users'] ?? null,
            'active' => $labels['active'] ?? null,
            'online' => $labels['online users'] ?? null,
            'offline' => isset($off[1]) ? (int) str_replace(',', '', $off[1]) : null,
            'disabled' => $labels['disable'] ?? null,
            'inactive' => null,
            'expired' => $labels['expire'] ?? null,
            'expiring' => null,
            'new_users' => $labels['new'] ?? null,
            'balance' => isset($w[1]) ? (int) str_replace(',', '', $w[1]) : null,
            'topup_received' => $topups[0] ?? null,
            'topup_send' => $topups[1] ?? null,
            'packages' => null, // Fiber Beam has no package-wise online table
        ];
    }
}
