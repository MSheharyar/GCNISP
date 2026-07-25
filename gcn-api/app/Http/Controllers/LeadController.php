<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;

/**
 * SaaS lead capture. `store` is public (the landing page's "Request access"
 * form, rate-limited); `index`/`update` are owner-only (super-admin console).
 */
class LeadController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'businessName' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'city' => ['nullable', 'string', 'max:120'],
            'subscribers' => ['nullable', 'string', 'max:60'],
            'portals' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        Lead::create([
            'name' => $data['name'],
            'business_name' => $data['businessName'] ?? null,
            'phone' => $data['phone'],
            'city' => $data['city'] ?? null,
            'subscribers' => $data['subscribers'] ?? null,
            'portals' => $data['portals'] ?? null,
            'message' => $data['message'] ?? null,
        ]);

        // Never leak how many leads exist — just acknowledge.
        return response()->json(['ok' => true], 201);
    }

    public function index()
    {
        return Lead::orderByDesc('id')->get()->map(fn ($l) => $this->payload($l));
    }

    public function update(Request $request, Lead $lead)
    {
        $data = $request->validate([
            'status' => ['required', 'in:new,contacted,converted,dropped'],
        ]);
        $lead->update(['status' => $data['status']]);

        return $this->payload($lead->fresh());
    }

    private function payload(Lead $l): array
    {
        return [
            'id' => $l->id,
            'name' => $l->name,
            'businessName' => $l->business_name,
            'phone' => $l->phone,
            'city' => $l->city,
            'subscribers' => $l->subscribers,
            'portals' => $l->portals,
            'message' => $l->message,
            'status' => $l->status,
            'createdAt' => optional($l->created_at)->toDateTimeString(),
        ];
    }
}
