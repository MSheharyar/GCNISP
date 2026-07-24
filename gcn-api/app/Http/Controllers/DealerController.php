<?php

namespace App\Http\Controllers;

use App\Models\Dealer;
use App\Models\User;
use App\Support\DealerProvisioner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The SaaS owner's console. Only a super-admin can create dealers, approve their
 * main admin, and suspend/activate accounts (the billing gate).
 */
class DealerController extends Controller
{
    public function index()
    {
        return Dealer::orderBy('id')->get()->map(fn ($d) => $this->payload($d));
    }

    public function store(Request $request, DealerProvisioner $provisioner)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'alpha_dash', 'max:60', 'unique:dealers,slug'],
            'contactName' => ['nullable', 'string', 'max:255'],
            'contactPhone' => ['nullable', 'string', 'max:40'],
            'adminName' => ['required', 'string', 'max:255'],
            'adminEmail' => ['required', 'email', 'unique:users,email'],
            'adminPassword' => ['required', 'string', 'min:6'],
        ]);

        return DB::transaction(function () use ($data, $provisioner, $request) {
            $dealer = Dealer::create([
                'name' => $data['name'],
                'slug' => $data['slug'] ?? Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
                'status' => 'active',
                'contact_name' => $data['contactName'] ?? null,
                'contact_phone' => $data['contactPhone'] ?? null,
            ]);

            // The dealer's one approved main admin (only the owner can create it).
            $admin = User::create([
                'name' => $data['adminName'],
                'email' => $data['adminEmail'],
                'password' => Hash::make($data['adminPassword']),
                'role' => 'admin',
                'is_active' => true,
                'dealer_id' => $dealer->id,
            ]);

            $provisioner->seedDefaults($dealer->id, $dealer->name);

            return response()->json(array_merge($this->payload($dealer->fresh()), [
                'admin' => ['id' => $admin->id, 'name' => $admin->name, 'email' => $admin->email],
            ]), 201);
        });
    }

    public function update(Request $request, Dealer $dealer)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,suspended,trial'],
            'contactName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contactPhone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'slug' => ['sometimes', 'string', 'alpha_dash', 'max:60', Rule::unique('dealers', 'slug')->ignore($dealer->id)],
        ]);

        $dealer->fill([
            'name' => $data['name'] ?? $dealer->name,
            'status' => $data['status'] ?? $dealer->status,
            'contact_name' => array_key_exists('contactName', $data) ? $data['contactName'] : $dealer->contact_name,
            'contact_phone' => array_key_exists('contactPhone', $data) ? $data['contactPhone'] : $dealer->contact_phone,
            'slug' => $data['slug'] ?? $dealer->slug,
        ])->save();

        return $this->payload($dealer->fresh());
    }

    private function payload(Dealer $d): array
    {
        return [
            'id' => $d->id,
            'name' => $d->name,
            'slug' => $d->slug,
            'status' => $d->status,
            'contactName' => $d->contact_name,
            'contactPhone' => $d->contact_phone,
            'users' => DB::table('users')->where('dealer_id', $d->id)->count(),
            'customers' => DB::table('customers')->where('dealer_id', $d->id)->count(),
            'createdAt' => optional($d->created_at)->toDateString(),
        ];
    }
}
