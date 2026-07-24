<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index()
    {
        return User::where('dealer_id', Tenant::id())->orderBy('id')->get()->map(fn ($u) => $this->payload($u));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', 'in:admin,operator,viewer'],
            'password' => ['required', 'string', 'min:6'],
        ]);
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
            'is_active' => true,
            'dealer_id' => Tenant::id(),
        ]);
        AuditLog::record($request, 'invite', 'user', $user->id, ['email' => $user->email, 'role' => $user->role]);

        return response()->json($this->payload($user), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->dealer_id !== Tenant::id(), 404);
        $data = $request->validate([
            'role' => ['sometimes', 'in:admin,operator,viewer'],
            'isActive' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:6'],
        ]);

        // Guard: don't let the last active admin lock the org out.
        $demotingSelf = $user->id === $request->user()->id;
        $losingAdmin = ($user->role === 'admin')
            && ((array_key_exists('role', $data) && $data['role'] !== 'admin')
                || (array_key_exists('isActive', $data) && $data['isActive'] === false));
        if ($losingAdmin) {
            $otherAdmins = User::where('dealer_id', Tenant::id())->where('role', 'admin')->where('is_active', true)->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                return response()->json(['message' => 'You cannot remove the last active admin.'], 422);
            }
        }
        if ($demotingSelf && array_key_exists('role', $data) && $data['role'] !== 'admin') {
            return response()->json(['message' => 'You cannot change your own role.'], 422);
        }

        if (array_key_exists('role', $data)) {
            $user->role = $data['role'];
        }
        if (array_key_exists('isActive', $data)) {
            $user->is_active = $data['isActive'];
        }
        if (! empty($data['name'])) {
            $user->name = $data['name'];
        }
        if (! empty($data['email'])) {
            $user->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();
        AuditLog::record($request, 'update', 'user', $user->id, $data);

        return $this->payload($user);
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($user->dealer_id !== Tenant::id(), 404);
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }
        // Never leave the org with no way in.
        if ($user->role === 'admin') {
            $otherAdmins = User::where('dealer_id', Tenant::id())->where('role', 'admin')->where('is_active', true)->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                return response()->json(['message' => 'You cannot delete the last active admin.'], 422);
            }
        }

        $user->tokens()->delete(); // revoke any active sessions
        AuditLog::record($request, 'delete', 'user', $user->id, ['email' => $user->email, 'name' => $user->name, 'role' => $user->role]);
        $user->delete(); // past ledger entries keep their recorded_by name; audit logs null out

        return response()->json(['deleted' => true]);
    }

    private function payload(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role,
            'isActive' => (bool) $u->is_active, 'lastActive' => optional($u->last_active_at)->toDateString(),
        ];
    }
}
