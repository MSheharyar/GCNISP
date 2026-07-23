<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    private array $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    public function storeExpense(Request $request)
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'amount' => ['required', 'integer', 'min:1'],
            'category' => ['required', 'in:salary,utility,supplies,household,owner_draw,recovery,other'],
            'description' => ['required', 'string'],
            'paidFrom' => ['required', 'in:net,cable,other'],
            'person' => ['nullable', 'string'],
        ]);
        $m = (int) substr($data['date'], 5, 2);
        $e = Expense::create([
            'date' => $data['date'], 'amount' => $data['amount'], 'category' => $data['category'],
            'description' => $data['description'], 'paid_from' => $data['paidFrom'], 'person' => $data['person'] ?? null,
            'period_label' => $this->months[$m - 1].' '.substr($data['date'], 0, 4),
        ]);
        AuditLog::record($request, 'create', 'expense', $e->id, $data);

        return response()->json([
            'id' => $e->id, 'date' => $e->date->toDateString(), 'amount' => $e->amount, 'category' => $e->category,
            'description' => $e->description, 'paidFrom' => $e->paid_from, 'person' => $e->person, 'periodLabel' => $e->period_label,
        ], 201);
    }

    public function expenses()
    {
        return Expense::orderByDesc('date')->get()->map(fn ($e) => [
            'id' => $e->id, 'date' => $e->date->toDateString(), 'amount' => $e->amount, 'category' => $e->category,
            'description' => $e->description, 'paidFrom' => $e->paid_from, 'person' => $e->person, 'periodLabel' => $e->period_label,
        ]);
    }

    public function cashbook()
    {
        $mk = "to_char(%s,'YYYY-MM')";

        $netByMonth = DB::table('payments')->select(DB::raw(sprintf($mk, 'received_date').' as m'), DB::raw('sum(amount_received) as v'))->groupBy('m')->pluck('v', 'm');
        $cableByMonth = DB::table('cable_payments')->select(DB::raw(sprintf($mk, 'date').' as m'), DB::raw('sum(amount) as v'))->groupBy('m')->pluck('v', 'm');
        $costByMonth = DB::table('charges')->select(DB::raw(sprintf($mk, 'charge_date').' as m'), DB::raw('sum(coalesce(cost_amount,0)) as v'))->groupBy('m')->pluck('v', 'm');
        $spendByMonth = DB::table('expenses')->select(DB::raw(sprintf($mk, 'date').' as m'), DB::raw('sum(amount) as v'))->groupBy('m')->pluck('v', 'm');

        $months = collect([$netByMonth, $cableByMonth, $costByMonth, $spendByMonth])
            ->flatMap(fn ($c) => $c->keys())->unique()->sort()->values();

        $perMonth = $months->map(function ($m) use ($netByMonth, $cableByMonth, $costByMonth, $spendByMonth) {
            $net = (int) ($netByMonth[$m] ?? 0);
            $cable = (int) ($cableByMonth[$m] ?? 0);
            $cost = (int) ($costByMonth[$m] ?? 0);
            $spend = (int) ($spendByMonth[$m] ?? 0);

            return ['month' => $m, 'netIncome' => $net, 'cableIncome' => $cable, 'connectCost' => $cost, 'spend' => $spend, 'profit' => $net + $cable - $cost - $spend];
        });

        $byCategory = DB::table('expenses')->select('category', DB::raw('sum(amount) as v'))->groupBy('category')->pluck('v', 'category')->map(fn ($v) => (int) $v);
        $byPerson = DB::table('expenses')->whereNotNull('person')->select('person', DB::raw('sum(amount) as v'))->groupBy('person')->pluck('v', 'person')->map(fn ($v) => (int) $v);
        $totalSpend = (int) DB::table('expenses')->sum('amount');

        return [
            'perMonth' => $perMonth,
            'byCategory' => $byCategory,
            'byPerson' => $byPerson,
            'totalSpend' => $totalSpend,
            'latestMonth' => $months->last(),
        ];
    }
}
