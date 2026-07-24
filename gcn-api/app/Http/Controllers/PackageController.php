<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\Request;

/**
 * Per-dealer package price list. Each dealer sets their own name / speed / the
 * customer price and (optionally) their cost — the amount their upstream company
 * cuts — so the margin is theirs. Tenant-scoped via the Package global scope.
 */
class PackageController extends Controller
{
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $package = Package::create([
            'name' => $data['name'],
            'speed_mbps' => $data['speedMbps'] ?? 0,
            'price' => $data['price'] ?? 0,
            'cost' => $data['cost'] ?? null,
            'is_active' => $data['isActive'] ?? true,
        ]);

        return $this->payload($package);
    }

    public function update(Request $request, Package $package)
    {
        $data = $this->validated($request);
        $package->fill([
            'name' => $data['name'],
            'speed_mbps' => $data['speedMbps'] ?? 0,
            'price' => $data['price'] ?? 0,
            'cost' => $data['cost'] ?? null,
            'is_active' => $data['isActive'] ?? $package->is_active,
        ])->save();

        return $this->payload($package->fresh());
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'speedMbps' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'price' => ['nullable', 'integer', 'min:0'],
            'cost' => ['nullable', 'integer', 'min:0'],
            'isActive' => ['boolean'],
        ]);
    }

    private function payload(Package $p): array
    {
        return [
            'id' => $p->id, 'name' => $p->name, 'speedMbps' => $p->speed_mbps,
            'price' => $p->price, 'cost' => $p->cost, 'isActive' => (bool) $p->is_active,
        ];
    }
}
