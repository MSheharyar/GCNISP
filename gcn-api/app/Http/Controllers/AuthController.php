<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'dealerSlug' => ['nullable', 'string'], // the subdomain workspace they're logging into
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }
        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'This account is disabled.']);
        }

        // Hard workspace binding: on a dealer's subdomain, only that dealer's users
        // may sign in (the super-admin may sign in anywhere). This is what makes a
        // personal URL unshareable to another dealer.
        if (! empty($data['dealerSlug']) && ! $user->is_super_admin) {
            $dealer = \App\Models\Dealer::where('slug', $data['dealerSlug'])->first();
            if (! $dealer || $user->dealer_id !== $dealer->id) {
                throw ValidationException::withMessages(['email' => 'This login is for a different workspace.']);
            }
        }

        $user->forceFill(['last_active_at' => now()])->save();
        $token = $user->createToken('web')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $this->userPayload($user)]);
    }

    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }

    private function userPayload(User $u): array
    {
        // The dealer's enabled modules drive the nav/routes the app shows. The
        // super-admin (no dealer) gets every module.
        $dealer = $u->dealer_id ? \App\Models\Dealer::find($u->dealer_id) : null;

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'isActive' => (bool) $u->is_active,
            'isSuperAdmin' => (bool) $u->is_super_admin,
            'modules' => $dealer ? $dealer->modules() : \App\Models\Dealer::MODULES,
        ];
    }
}
