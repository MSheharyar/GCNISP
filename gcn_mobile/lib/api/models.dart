// Models parsed from the Laravel API (camelCase JSON, mirrors the web types).

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
int? _intN(dynamic v) => v == null ? null : (v is num ? v.toInt() : int.tryParse('$v'));
String _str(dynamic v) => v?.toString() ?? '';

class AuthUser {
  final int id;
  final String name, email, role;
  final bool isActive;
  AuthUser({required this.id, required this.name, required this.email, required this.role, required this.isActive});
  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: _int(j['id']),
        name: _str(j['name']),
        email: _str(j['email']),
        role: _str(j['role']),
        isActive: j['isActive'] == true,
      );
  bool get isViewer => role == 'viewer';
}

class RecoveryCustomer {
  final int id, outstanding, monthsOverdue;
  final String name, loginId, house, sector;
  RecoveryCustomer({required this.id, required this.name, required this.loginId, required this.house, required this.sector, required this.outstanding, required this.monthsOverdue});
  factory RecoveryCustomer.fromJson(Map<String, dynamic> j) => RecoveryCustomer(
        id: _int(j['id']),
        name: _str(j['name']),
        loginId: _str(j['loginId']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        outstanding: _int(j['outstandingBalance']),
        monthsOverdue: _int(j['monthsOverdue']),
      );
}

class DashboardData {
  final int activeSubscribers, subscriberBase, overdueCount, collectedThisMonth, totalOutstanding;
  final String latestMonth;
  final List<RecoveryCustomer> recovery;
  DashboardData({
    required this.activeSubscribers,
    required this.subscriberBase,
    required this.overdueCount,
    required this.collectedThisMonth,
    required this.totalOutstanding,
    required this.latestMonth,
    required this.recovery,
  });
  factory DashboardData.fromJson(Map<String, dynamic> j) => DashboardData(
        activeSubscribers: _int(j['activeSubscribers']),
        subscriberBase: _int(j['subscriberBase']),
        overdueCount: _int(j['overdueCount']),
        collectedThisMonth: _int(j['collectedThisMonth']),
        totalOutstanding: _int(j['totalOutstanding']),
        latestMonth: _str(j['latestMonth']),
        recovery: ((j['recovery'] as List?) ?? []).map((e) => RecoveryCustomer.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class PortalStat {
  final String account, source;
  final int? total, active, online, offline, expired, balance;
  PortalStat({required this.account, required this.source, this.total, this.active, this.online, this.offline, this.expired, this.balance});
  factory PortalStat.fromJson(Map<String, dynamic> j) => PortalStat(
        account: _str(j['account']),
        source: _str(j['source']) == 'fiberbeam' ? 'Fiber Beam' : 'Connect',
        total: _intN(j['total']),
        active: _intN(j['active']),
        online: _intN(j['online']),
        offline: _intN(j['offline']),
        expired: _intN(j['expired']),
        balance: _intN(j['balance']),
      );
}

class Recharge {
  final int id, customerId, amount;
  final int? previousBalance, packageId, speedMbps;
  final String name, loginId, house, sector, account, time, chargeDate;
  final String? package, portalSpeed;
  final bool pending;
  Recharge({
    required this.id,
    required this.customerId,
    required this.name,
    required this.loginId,
    required this.house,
    required this.sector,
    required this.account,
    required this.time,
    required this.chargeDate,
    required this.amount,
    required this.previousBalance,
    required this.package,
    required this.packageId,
    required this.speedMbps,
    required this.portalSpeed,
    required this.pending,
  });
  factory Recharge.fromJson(Map<String, dynamic> j) => Recharge(
        id: _int(j['id']),
        customerId: _int(j['customerId']),
        name: _str(j['name']),
        loginId: _str(j['loginId']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        account: _str(j['account']),
        time: _str(j['time']),
        chargeDate: _str(j['chargeDate']),
        amount: _int(j['amount']),
        previousBalance: _intN(j['previousBalance']),
        package: j['package']?.toString(),
        packageId: _intN(j['packageId']),
        speedMbps: _intN(j['speedMbps']),
        portalSpeed: j['portalSpeed']?.toString(),
        pending: j['pending'] == true,
      );
}

class Customer {
  final int id, balance, monthsOverdue;
  final String name, loginId, house, sector;
  Customer({required this.id, required this.name, required this.loginId, required this.house, required this.sector, required this.balance, required this.monthsOverdue});
  factory Customer.fromJson(Map<String, dynamic> j) => Customer(
        id: _int(j['id']),
        name: _str(j['name']),
        loginId: _str(j['loginId']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        balance: _int(j['outstandingBalance']),
        monthsOverdue: _int(j['monthsOverdue']),
      );
}
