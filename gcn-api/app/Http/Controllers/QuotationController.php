<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

/**
 * Quotations (estimates) — for a new prospect or an existing customer. Free-form
 * line items (router, wire per metre, labour, …). Stored in the invoices table
 * with type=quotation so it reuses the same PDF + numbering infrastructure.
 */
class QuotationController extends Controller
{
    public function index()
    {
        return Invoice::where('type', 'quotation')->orderByDesc('id')->get()->map(fn ($q) => $this->payload($q));
    }

    public function generate(Request $request)
    {
        $data = $request->validate([
            'customerId' => ['nullable', 'exists:customers,id'],
            'recipientName' => ['nullable', 'string', 'max:255'],
            'recipientPhone' => ['nullable', 'string', 'max:40'],
            'recipientAddress' => ['nullable', 'string', 'max:500'],
            'validUntil' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lineItems' => ['required', 'array', 'min:1'],
            'lineItems.*.description' => ['required', 'string', 'max:255'],
            'lineItems.*.qty' => ['required', 'numeric', 'min:0'],
            'lineItems.*.unit' => ['nullable', 'string', 'max:20'],
            'lineItems.*.unitPrice' => ['required', 'numeric', 'min:0'],
        ]);

        // Must address SOMEONE — an existing customer or a named recipient.
        if (empty($data['customerId']) && blank($data['recipientName'] ?? null)) {
            return response()->json(['message' => 'Provide a customer or a recipient name.'], 422);
        }

        $customer = ! empty($data['customerId']) ? Customer::find($data['customerId']) : null;

        $lineItems = collect($data['lineItems'])->map(fn ($li) => [
            'description' => $li['description'],
            'qty' => (float) $li['qty'],
            'unit' => $li['unit'] ?? null,
            'unitPrice' => (int) round($li['unitPrice']),
        ])->all();
        $total = collect($lineItems)->sum(fn ($li) => (int) round($li['qty'] * $li['unitPrice']));

        $year = now()->year;
        $seq = Invoice::where('type', 'quotation')->whereYear('created_at', $year)->count() + 1;

        $quotation = Invoice::create([
            'type' => 'quotation',
            'customer_id' => $customer?->id,
            'recipient_name' => $customer ? null : ($data['recipientName'] ?? null),
            'recipient_phone' => $customer ? null : ($data['recipientPhone'] ?? null),
            'recipient_address' => $customer ? null : ($data['recipientAddress'] ?? null),
            'invoice_no' => sprintf('QUO-%d-%04d', $year, $seq),
            'issue_date' => now()->toDateString(),
            'valid_until' => $data['validUntil'] ?? null,
            'notes' => $data['notes'] ?? null,
            'line_items' => $lineItems,
            'total_amount' => $total,
            'generated_by' => $request->user()->name,
        ]);
        AuditLog::record($request, 'generate', 'quotation', $quotation->id, ['no' => $quotation->invoice_no, 'total' => $total]);

        return response()->json($this->payload($quotation), 201);
    }

    public function destroy(Request $request, Invoice $quotation)
    {
        abort_unless($quotation->type === 'quotation', 404);
        $no = $quotation->invoice_no;
        $id = $quotation->id;
        $quotation->delete();
        AuditLog::record($request, 'delete', 'quotation', $id, ['no' => $no]);

        return response()->json(['deleted' => true]);
    }

    public function pdf(Invoice $quotation)
    {
        abort_unless($quotation->type === 'quotation', 404);
        $quotation->load('customer');
        $org = Setting::pluck('value', 'key')->all();
        $pdf = Pdf::loadView('quotation', [
            'quotation' => $quotation,
            'customer' => $quotation->customer,
            'org' => $org,
            'brand' => \App\Support\PdfBranding::resolve($org),
        ])->setPaper('a4');

        return $pdf->stream("{$quotation->invoice_no}.pdf");
    }

    private function payload(Invoice $q): array
    {
        return [
            'id' => $q->id,
            'type' => 'quotation',
            'customerId' => $q->customer_id,
            'recipientName' => $q->recipient_name,
            'recipientPhone' => $q->recipient_phone,
            'recipientAddress' => $q->recipient_address,
            'quotationNo' => $q->invoice_no,
            'issueDate' => $q->issue_date->toDateString(),
            'validUntil' => optional($q->valid_until)->toDateString(),
            'notes' => $q->notes,
            'lineItems' => $q->line_items,
            'totalAmount' => $q->total_amount,
            'generatedBy' => $q->generated_by,
        ];
    }
}
