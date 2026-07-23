<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    private array $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    public function run(): void
    {
        @ini_set('memory_limit', '1024M');

        $path = base_path('../gcn-web/src/data/seed.json');
        if (! file_exists($path)) {
            $this->command->error("seed.json not found at $path");
            return;
        }
        $seed = json_decode(file_get_contents($path), true);
        $now = Carbon::now();

        DB::disableQueryLog();
        Schema::disableForeignKeyConstraints();
        foreach (['cable_payments', 'cable_customers', 'payments', 'charges', 'subscriptions', 'customers', 'speed_maps', 'packages', 'accounts', 'providers', 'expenses', 'invoices', 'settings', 'audit_logs'] as $t) {
            DB::table($t)->truncate();
        }
        Schema::enableForeignKeyConstraints();

        // ── Reference data ────────────────────────────────────────────────
        DB::table('providers')->insert(array_map(fn ($p) => [
            'id' => $p['id'], 'name' => $p['name'], 'type' => $p['type'], 'created_at' => $now, 'updated_at' => $now,
        ], $seed['providers']));

        DB::table('accounts')->insert(array_map(fn ($a) => [
            'id' => $a['id'], 'provider_id' => $a['providerId'], 'name' => $a['name'], 'notes' => $a['notes'] ?? null, 'created_at' => $now, 'updated_at' => $now,
        ], $seed['accounts']));

        DB::table('packages')->insert(array_map(fn ($p) => [
            'id' => $p['id'], 'name' => $p['name'], 'speed_mbps' => $p['speedMbps'], 'price' => $p['price'], 'is_active' => $p['isActive'], 'created_at' => $now, 'updated_at' => $now,
        ], $seed['packages']));

        // speed → package map (by package name)
        $pkgIdByName = collect($seed['packages'])->pluck('id', 'name');
        $speedMap = ['5Mbps' => 'Yellow', '15Mbps' => 'Orange', '20Mbps' => 'Red', '40Mbps' => 'Brown', '100Mbps' => 'Purple', '30Mbps' => null];
        $smRows = [];
        $sid = 1;
        foreach ($speedMap as $label => $pkg) {
            $smRows[] = ['id' => $sid++, 'speed_label' => $label, 'package_id' => $pkg ? ($pkgIdByName[$pkg] ?? null) : null, 'created_at' => $now, 'updated_at' => $now];
        }
        DB::table('speed_maps')->insert($smRows);

        // ── Org settings ──────────────────────────────────────────────────
        $settings = [
            'business_name' => 'Global Cable Network (GCN)', 'office_contact1' => '0313-1212036', 'office_contact2' => '0333-2290401',
            'jazzcash_title' => 'M. Sheharyar Ghori', 'jazzcash_number' => '0321-2557490', 'connection_tech' => 'GPON (FTTH) Fiber', 'office_address' => 'Korangi, Karachi',
        ];
        $setRows = [];
        $skey = 1;
        foreach ($settings as $k => $v) {
            $setRows[] = ['id' => $skey++, 'key' => $k, 'value' => $v, 'created_at' => $now, 'updated_at' => $now];
        }
        DB::table('settings')->insert($setRows);

        // ── Staff users ───────────────────────────────────────────────────
        $pw = Hash::make('password');
        DB::table('users')->insertOrIgnore([
            ['name' => 'Sheharyar Ghori', 'email' => 'sheharyar@gcn.pk', 'password' => $pw, 'role' => 'admin', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Moin', 'email' => 'moin@gcn.pk', 'password' => $pw, 'role' => 'operator', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Irshad', 'email' => 'irshad@gcn.pk', 'password' => $pw, 'role' => 'operator', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Umair', 'email' => 'umair@gcn.pk', 'password' => $pw, 'role' => 'operator', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Nadeem', 'email' => 'nadeem@gcn.pk', 'password' => $pw, 'role' => 'viewer', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // ── Customers + subscriptions ─────────────────────────────────────
        $custRows = [];
        $subRows = [];
        $subId = 1;
        foreach ($seed['customers'] as $c) {
            $custRows[] = [
                'id' => $c['id'], 'name' => $c['name'], 'login_id' => $c['loginId'], 'type' => $c['type'],
                'company_name' => $c['companyName'] ?? null, 'house_no' => $c['houseNo'] ?? null, 'sector' => $c['sector'] ?? null,
                'billing_address' => $c['billingAddress'] ?? null, 'current_account_id' => $c['currentAccountId'],
                'current_package_id' => $c['currentPackageId'], 'status' => $c['status'], 'phone' => $c['phone'] ?? null,
                'collection_model' => $c['collectionModel'], 'outstanding_balance' => $c['outstandingBalance'],
                'months_overdue' => $c['monthsOverdue'] ?? 0,
                'created_at' => $c['createdAt'] ?? $now, 'updated_at' => $now,
            ];
            $s = $c['subscription'];
            $subRows[] = [
                'id' => $subId++, 'customer_id' => $c['id'], 'package_id' => $s['packageId'], 'frozen_amount' => $s['frozenAmount'],
                'typical_charge_day' => $s['typicalChargeDay'], 'is_active' => $s['isActive'], 'created_at' => $now, 'updated_at' => $now,
            ];
        }
        foreach (array_chunk($custRows, 1000) as $chunk) {
            DB::table('customers')->insert($chunk);
        }
        foreach (array_chunk($subRows, 1000) as $chunk) {
            DB::table('subscriptions')->insert($chunk);
        }
        $this->command->info('customers: '.count($custRows));

        // ── Charges (compact → hydrated) ──────────────────────────────────
        $chargeRows = [];
        foreach ($seed['charges'] as $c) {
            $chargeRows[] = [
                'id' => $c['id'], 'customer_id' => $c['customerId'], 'account_id' => $c['accountId'], 'package_id' => $c['packageId'] ?? null,
                'amount_charged' => $c['amountCharged'], 'cost_amount' => $c['costAmount'] ?? null, 'charge_date' => $c['chargeDate'],
                'billing_period_label' => $c['label'] ?? $this->periodLabel($c['chargeDate']),
                'source' => $c['source'] ?? 'manual', 'recorded_by' => 'Excel import',
                'created_at' => $now, 'updated_at' => $now,
            ];
        }
        foreach (array_chunk($chargeRows, 2000) as $chunk) {
            DB::table('charges')->insert($chunk);
        }
        $this->command->info('charges: '.count($chargeRows));

        // ── Payments ──────────────────────────────────────────────────────
        $payRows = [];
        foreach ($seed['payments'] as $p) {
            $payRows[] = [
                'id' => $p['id'], 'customer_id' => $p['customerId'], 'charge_id' => $p['chargeId'] ?? null,
                'amount_received' => $p['amountReceived'], 'received_date' => $p['receivedDate'], 'method' => $p['method'],
                'is_arrears' => $p['isArrears'], 'recorded_by' => 'Excel import', 'created_at' => $now, 'updated_at' => $now,
            ];
        }
        foreach (array_chunk($payRows, 2000) as $chunk) {
            DB::table('payments')->insert($chunk);
        }
        $this->command->info('payments: '.count($payRows));

        // ── Cable ─────────────────────────────────────────────────────────
        DB::table('cable_customers')->insert(array_map(fn ($c) => [
            'id' => $c['id'], 'name' => $c['name'] ?? null, 'house_no' => $c['houseNo'], 'sector' => $c['sector'],
            'monthly_fee' => $c['monthlyFee'], 'balance' => $c['balance'], 'status' => $c['status'],
            'last_paid_date' => $c['lastPaidDate'] ?? null, 'created_at' => $now, 'updated_at' => $now,
        ], $seed['cableCustomers']));

        $cablePayRows = array_map(fn ($p) => [
            'id' => $p['id'], 'cable_customer_id' => $p['cableCustomerId'], 'date' => $p['date'], 'amount' => $p['amount'],
            'label' => $p['label'] ?? null, 'created_at' => $now, 'updated_at' => $now,
        ], $seed['cablePayments']);
        foreach (array_chunk($cablePayRows, 2000) as $chunk) {
            DB::table('cable_payments')->insert($chunk);
        }

        // ── Expenses ──────────────────────────────────────────────────────
        $expRows = array_map(fn ($e) => [
            'id' => $e['id'], 'date' => $e['date'], 'amount' => $e['amount'], 'category' => $e['category'],
            'description' => $e['description'], 'paid_from' => $e['paidFrom'], 'person' => $e['person'] ?? null,
            'period_label' => $e['periodLabel'], 'created_at' => $now, 'updated_at' => $now,
        ], $seed['expenses']);
        foreach (array_chunk($expRows, 2000) as $chunk) {
            DB::table('expenses')->insert($chunk);
        }
        $this->command->info('cable: '.count($seed['cableCustomers']).' | expenses: '.count($expRows));

        // ── Reset sequences (explicit ids were inserted) ──────────────────
        foreach (['providers', 'accounts', 'packages', 'speed_maps', 'settings', 'customers', 'subscriptions', 'charges', 'payments', 'cable_customers', 'cable_payments', 'expenses', 'users'] as $t) {
            DB::statement("SELECT setval(pg_get_serial_sequence('$t','id'), COALESCE((SELECT MAX(id) FROM $t), 1))");
        }

        $this->command->info('✅ Seed complete.');
    }

    private function periodLabel(string $iso): string
    {
        $m = (int) substr($iso, 5, 2);
        return $this->months[$m - 1].' '.substr($iso, 0, 4);
    }
}
