import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'models.dart';

/// Base URL of the Laravel API.
/// - Web / iOS sim / desktop: 127.0.0.1
/// - Android emulator can't see the host as 127.0.0.1 → use 10.0.2.2
String _baseUrl() {
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:8000/api';
  }
  return 'http://127.0.0.1:8000/api';
}

class ApiException implements Exception {
  final String message;
  final int? status;
  ApiException(this.message, [this.status]);
  @override
  String toString() => message;
}

class Api {
  Api._();
  static final Api instance = Api._();

  static const _tokenKey = 'gcn_token';
  String? _token;
  AuthUser? user;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  bool get isLoggedIn => _token != null;

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path) => Uri.parse('${_baseUrl()}$path');

  Future<dynamic> _decode(http.Response res) async {
    if (res.statusCode == 401) {
      await logout();
      throw ApiException('Session expired — please sign in again.', 401);
    }
    dynamic body;
    try {
      body = res.body.isEmpty ? null : jsonDecode(res.body);
    } catch (_) {
      body = null;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    final msg = (body is Map && body['message'] is String) ? body['message'] as String : 'Request failed (${res.statusCode})';
    throw ApiException(msg, res.statusCode);
  }

  Future<dynamic> _get(String path) async {
    try {
      final res = await http.get(_uri(path), headers: _headers).timeout(const Duration(seconds: 20));
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Cannot reach the server. Is the API running?');
    }
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    try {
      final res = await http.post(_uri(path), headers: _headers, body: jsonEncode(body)).timeout(const Duration(seconds: 20));
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Cannot reach the server. Is the API running?');
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  Future<AuthUser> login(String email, String password) async {
    final data = await _post('/login', {'email': email, 'password': password});
    _token = data['token'] as String;
    user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    return user!;
  }

  Future<AuthUser?> me() async {
    if (_token == null) return null;
    try {
      user = AuthUser.fromJson(await _get('/me') as Map<String, dynamic>);
      return user;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      if (_token != null) await http.post(_uri('/logout'), headers: _headers);
    } catch (_) {}
    _token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  // ── Reads ─────────────────────────────────────────────────────────────
  Future<DashboardData> dashboard() async => DashboardData.fromJson(await _get('/dashboard') as Map<String, dynamic>);

  Future<List<PortalStat>> portalStats() async =>
      ((await _get('/portal-stats')) as List).map((e) => PortalStat.fromJson(e as Map<String, dynamic>)).toList();

  Future<List<Recharge>> chargedToday() async =>
      ((await _get('/charged-today')) as List).map((e) => Recharge.fromJson(e as Map<String, dynamic>)).toList();

  Future<List<RecoveryCustomer>> recovery() async =>
      ((await _get('/recovery')) as List).map((e) => RecoveryCustomer.fromJson(e as Map<String, dynamic>)).toList();

  Future<List<Customer>> customers() async =>
      ((await _get('/customers')) as List).map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();

  Future<MonthlyData> monthly({String? month}) async =>
      MonthlyData.fromJson(await _get('/monthly${month != null ? '?month=$month' : ''}') as Map<String, dynamic>);

  Future<CashBook> cashbook() async => CashBook.fromJson(await _get('/cashbook') as Map<String, dynamic>);

  Future<List<Expense>> expenses() async =>
      ((await _get('/expenses')) as List).map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList();

  // ── Writes ────────────────────────────────────────────────────────────
  /// Record a payment (collect arrears) — payment-only, no new charge.
  Future<void> recordPayment({required int customerId, required int amount, required String method, String? date}) async {
    await _post('/customers/$customerId/log', {
      'logPayment': true,
      'receivedAmount': amount,
      'receivedDate': date ?? DateTime.now().toIso8601String().substring(0, 10),
      'method': method.toLowerCase() == 'jazzcash' ? 'jazz' : method.toLowerCase(),
    });
  }

  /// Trigger a live portal sync (scrapes Connect + Fiber recharges & dashboard).
  Future<void> runSync() async => _post('/connect-sync/run', {});

  /// Confirm a staged portal recharge into the ledger.
  Future<void> commitCharge({required int chargeId, required int openingBalance, required int amount, int? packageId}) async {
    await _post('/charges/$chargeId/commit', {
      'openingBalance': openingBalance,
      'amount': amount,
      'packageId': packageId,
    });
  }
}

final api = Api.instance;
