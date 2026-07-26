<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CableController;
use App\Http\Controllers\ChargeController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealerController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\MonthlyController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\SyncController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
// Landing-page "Request access" lead form (rate-limited).
Route::post('/public/leads', [LeadController::class, 'store'])->middleware('throttle:10,1');

// ── SaaS owner console (super-admin only, NOT dealer-scoped) ────────────────
Route::middleware(['auth:sanctum', 'superadmin'])->prefix('admin')->group(function () {
    Route::get('/dealers', [DealerController::class, 'index']);
    Route::post('/dealers', [DealerController::class, 'store']);
    Route::put('/dealers/{dealer}', [DealerController::class, 'update']);
    Route::get('/leads', [LeadController::class, 'index']);
    Route::put('/leads/{lead}', [LeadController::class, 'update']);
});

// ── Protected (Sanctum token) — every request is scoped to the user's dealer ─
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Reference data
    Route::get('/providers', [ReferenceController::class, 'providers']);
    Route::get('/accounts', [ReferenceController::class, 'accounts']);
    Route::get('/packages', [ReferenceController::class, 'packages']);
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/speed-map', [ReferenceController::class, 'speedMap']);
    Route::get('/org-settings', [ReferenceController::class, 'orgSettings']);
    Route::get('/branding', [ReferenceController::class, 'branding']);
    Route::get('/connect-sync', [SyncController::class, 'index']);
    Route::get('/portal-stats', [SyncController::class, 'stats']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/charged-today', [ChargeController::class, 'today']);
    Route::get('/monthly', [MonthlyController::class, 'index']);

    // Customers (internet)
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/recovery', [CustomerController::class, 'recovery']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    Route::get('/customers/{customer}/ledger', [CustomerController::class, 'ledger']);

    // ── Financial reads (admin + operator only — hidden from viewers) ───────
    Route::middleware('role:admin,operator')->group(function () {
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
        Route::get('/quotations', [QuotationController::class, 'index']);
        Route::get('/quotations/{quotation}/pdf', [QuotationController::class, 'pdf']);
        Route::get('/expenses', [FinanceController::class, 'expenses']);
        Route::get('/cashbook', [FinanceController::class, 'cashbook']);
        Route::get('/cable-customers', [CableController::class, 'index']);
        Route::get('/cable-customers/{cable}', [CableController::class, 'show']);
        Route::get('/cable-customers/{cable}/ledger', [CableController::class, 'ledger']);
    });

    // ── Writes (admin + operator only) ─────────────────────────────────────
    Route::middleware('role:admin,operator')->group(function () {
        Route::post('/customers', [CustomerController::class, 'store']);
        Route::put('/customers/{customer}', [CustomerController::class, 'update']);
        Route::post('/customers/{customer}/log', [CustomerController::class, 'logChargePayment']);
        Route::post('/charges/{charge}/pay', [ChargeController::class, 'markPaid']);
        Route::post('/charges/{charge}/commit', [ChargeController::class, 'commit']);
        Route::put('/charges/{charge}', [ChargeController::class, 'update']);
        Route::delete('/charges/{charge}', [ChargeController::class, 'destroy']);
        Route::post('/customers/{customer}/switch-account', [CustomerController::class, 'switchAccount']);

        Route::post('/cable-customers', [CableController::class, 'store']);
        Route::post('/cable-customers/{cable}/payment', [CableController::class, 'storePayment']);

        Route::post('/expenses', [FinanceController::class, 'storeExpense']);
        Route::post('/invoices', [InvoiceController::class, 'generate']);
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);
        Route::post('/quotations', [QuotationController::class, 'generate']);
        Route::delete('/quotations/{quotation}', [QuotationController::class, 'destroy']);
        Route::post('/connect-sync/run', [SyncController::class, 'run']);
        Route::post('/portal-stats/refresh', [SyncController::class, 'refreshStats']);
    });

    // ── Admin-only: staff management + portal credentials ──────────────────
    Route::middleware('role:admin')->group(function () {
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{user}', [StaffController::class, 'update']);
        Route::delete('/staff/{user}', [StaffController::class, 'destroy']);

        Route::get('/portal-accounts', [SyncController::class, 'portalAccounts']);
        Route::put('/portal-accounts/{account}', [SyncController::class, 'updatePortalAccount']);

        Route::post('/packages', [PackageController::class, 'store']);
        Route::put('/packages/{package}', [PackageController::class, 'update']);
    });
});
