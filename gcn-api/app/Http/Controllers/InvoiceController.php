<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index()
    {
        return Invoice::where('type', 'invoice')->orderByDesc('id')->get()->map(fn ($i) => $this->payload($i));
    }

    public function generate(Request $request)
    {
        $data = $request->validate([
            'customerId' => ['required', 'exists:customers,id'],
            'periodLabel' => ['required', 'string'],
            'lineItems' => ['nullable', 'array'],
            'lineItems.*.description' => ['required_with:lineItems', 'string'],
            'lineItems.*.qty' => ['required_with:lineItems', 'integer', 'min:1'],
            'lineItems.*.unitPrice' => ['required_with:lineItems', 'integer', 'min:0'],
        ]);

        $customer = Customer::with('subscription', 'package')->findOrFail($data['customerId']);

        // Default a single line item from the customer's package + frozen/standard price.
        $lineItems = $data['lineItems'] ?? null;
        if (! $lineItems) {
            $pkg = $customer->package;
            $price = $customer->subscription?->frozen_amount ?? $pkg?->price ?? 0;
            $speed = $pkg ? " ({$pkg->speed_mbps} MB)" : '';
            $lineItems = [[
                'description' => 'Internet Service — '.($pkg?->name ?? 'Subscription').$speed.' · '.$data['periodLabel'],
                'qty' => 1,
                'unitPrice' => (int) $price,
            ]];
        }

        $total = collect($lineItems)->sum(fn ($li) => $li['qty'] * $li['unitPrice']);
        $year = now()->year;
        $seq = Invoice::where('type', 'invoice')->whereYear('created_at', $year)->count() + 1;

        $invoice = Invoice::create([
            'type' => 'invoice',
            'customer_id' => $customer->id,
            'invoice_no' => sprintf('GCN-%d-%04d', $year, $seq),
            'issue_date' => now()->toDateString(),
            'period_label' => $data['periodLabel'],
            'line_items' => $lineItems,
            'total_amount' => $total,
            'generated_by' => $request->user()->name,
        ]);
        AuditLog::record($request, 'generate', 'invoice', $invoice->id, ['invoice_no' => $invoice->invoice_no, 'total' => $total]);

        return response()->json($this->payload($invoice), 201);
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->load('customer');
        $org = Setting::pluck('value', 'key')->all();
        $pdf = Pdf::loadView('invoice', [
            'invoice' => $invoice,
            'customer' => $invoice->customer,
            'org' => $org,
        ])->setPaper('a4');

        return $pdf->stream("{$invoice->invoice_no}.pdf");
    }

    private function payload(Invoice $i): array
    {
        return [
            'id' => $i->id, 'customerId' => $i->customer_id, 'invoiceNo' => $i->invoice_no,
            'issueDate' => $i->issue_date->toDateString(), 'periodLabel' => $i->period_label,
            'lineItems' => $i->line_items, 'totalAmount' => $i->total_amount, 'generatedBy' => $i->generated_by,
        ];
    }
}
