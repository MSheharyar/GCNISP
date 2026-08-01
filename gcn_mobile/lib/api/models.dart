// Models parsed from the Laravel API (camelCase JSON, mirrors the web types).

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
int? _intN(dynamic v) => v == null ? null : (v is num ? v.toInt() : int.tryParse('$v'));
String _str(dynamic v) => v?.toString() ?? '';

class AuthUser {
  final int id;
  final String name, email, role;
  final bool isActive;
  final List<String> modules; // enabled feature modules for this dealer
  AuthUser({required this.id, required this.name, required this.email, required this.role, required this.isActive, required this.modules});
  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: _int(j['id']),
        name: _str(j['name']),
        email: _str(j['email']),
        role: _str(j['role']),
        isActive: j['isActive'] == true,
        modules: ((j['modules'] as List?) ?? const []).map((e) => e.toString()).toList(),
      );
  bool get isViewer => role == 'viewer';

  /// A module is on if the dealer has it, or if the list is empty (older API).
  bool hasModule(String key) => modules.isEmpty || modules.contains(key);
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
  final String name, loginId, house, sector, status;
  Customer({required this.id, required this.name, required this.loginId, required this.house, required this.sector, required this.balance, required this.monthsOverdue, required this.status});
  factory Customer.fromJson(Map<String, dynamic> j) => Customer(
        id: _int(j['id']),
        name: _str(j['name']),
        loginId: _str(j['loginId']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        balance: _int(j['outstandingBalance']),
        monthsOverdue: _int(j['monthsOverdue']),
        status: _str(j['status']),
      );
}

class Account {
  final int id;
  final String name;
  Account({required this.id, required this.name});
  factory Account.fromJson(Map<String, dynamic> j) => Account(id: _int(j['id']), name: _str(j['name']));
}

class PackageRef {
  final int id;
  final String name;
  final int? speedMbps;
  PackageRef({required this.id, required this.name, required this.speedMbps});
  factory PackageRef.fromJson(Map<String, dynamic> j) => PackageRef(id: _int(j['id']), name: _str(j['name']), speedMbps: _intN(j['speedMbps']));
}

class CustomerDetail {
  final int id, balance, monthsOverdue;
  final String name, loginId, house, sector, status, type;
  final String? phone, companyName, createdAt;
  final int? currentAccountId, currentPackageId;
  final bool subscriptionActive;
  CustomerDetail({
    required this.id,
    required this.name,
    required this.loginId,
    required this.house,
    required this.sector,
    required this.status,
    required this.type,
    required this.balance,
    required this.monthsOverdue,
    required this.phone,
    required this.companyName,
    required this.createdAt,
    required this.currentAccountId,
    required this.currentPackageId,
    required this.subscriptionActive,
  });
  factory CustomerDetail.fromJson(Map<String, dynamic> j) => CustomerDetail(
        id: _int(j['id']),
        name: _str(j['name']),
        loginId: _str(j['loginId']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        status: _str(j['status']),
        type: _str(j['type']),
        balance: _int(j['outstandingBalance']),
        monthsOverdue: _int(j['monthsOverdue']),
        phone: j['phone']?.toString(),
        companyName: j['companyName']?.toString(),
        createdAt: j['createdAt']?.toString(),
        currentAccountId: _intN(j['currentAccountId']),
        currentPackageId: _intN(j['currentPackageId']),
        subscriptionActive: (j['subscription'] is Map) && (j['subscription']['isActive'] == true),
      );
}

class LedgerEntry {
  final String id, date, kind, label;
  final int debit, credit, balance;
  final String? method;
  LedgerEntry({required this.id, required this.date, required this.kind, required this.label, required this.debit, required this.credit, required this.balance, required this.method});
  factory LedgerEntry.fromJson(Map<String, dynamic> j) => LedgerEntry(
        id: _str(j['id']),
        date: _str(j['date']),
        kind: _str(j['kind']),
        label: _str(j['label']),
        debit: _int(j['debit']),
        credit: _int(j['credit']),
        balance: _int(j['balance']),
        method: j['method']?.toString(),
      );
}

class CableCustomer {
  final int id, monthlyFee, balance;
  final String house, sector, status;
  final String? name, lastPaidDate;
  CableCustomer({required this.id, required this.house, required this.sector, required this.status, required this.monthlyFee, required this.balance, required this.name, required this.lastPaidDate});
  factory CableCustomer.fromJson(Map<String, dynamic> j) => CableCustomer(
        id: _int(j['id']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        status: _str(j['status']),
        monthlyFee: _int(j['monthlyFee']),
        balance: _int(j['balance']),
        name: j['name']?.toString(),
        lastPaidDate: j['lastPaidDate']?.toString(),
      );
}

class MonthlyRow {
  final int chargeId, customerId, amount, balance;
  final String loginId, name, house, sector, account, chargeDate;
  final String? package, paidDate, method;
  final int? speedMbps;
  final bool paid;
  MonthlyRow({required this.chargeId, required this.customerId, required this.amount, required this.balance, required this.loginId, required this.name, required this.house, required this.sector, required this.account, required this.chargeDate, required this.package, required this.paidDate, required this.method, required this.speedMbps, required this.paid});
  factory MonthlyRow.fromJson(Map<String, dynamic> j) => MonthlyRow(
        chargeId: _int(j['chargeId']),
        customerId: _int(j['customerId']),
        amount: _int(j['amount']),
        balance: _int(j['balance']),
        loginId: _str(j['loginId']),
        name: _str(j['name']),
        house: _str(j['houseNo']),
        sector: _str(j['sector']),
        account: _str(j['account']),
        chargeDate: _str(j['chargeDate']),
        package: j['package']?.toString(),
        paidDate: j['paidDate']?.toString(),
        method: j['method']?.toString(),
        speedMbps: _intN(j['speedMbps']),
        paid: j['paid'] == true,
      );
}

class MonthlyData {
  final List<String> months;
  final String month;
  final List<MonthlyRow> rows;
  final int count, charged, collected, paidCount;
  MonthlyData({required this.months, required this.month, required this.rows, required this.count, required this.charged, required this.collected, required this.paidCount});
  factory MonthlyData.fromJson(Map<String, dynamic> j) {
    final s = (j['summary'] as Map<String, dynamic>?) ?? {};
    return MonthlyData(
      months: ((j['months'] as List?) ?? []).map((e) => e.toString()).toList(),
      month: _str(j['month']),
      rows: ((j['rows'] as List?) ?? []).map((e) => MonthlyRow.fromJson(e as Map<String, dynamic>)).toList(),
      count: _int(s['count']),
      charged: _int(s['charged']),
      collected: _int(s['collected']),
      paidCount: _int(s['paidCount']),
    );
  }
}

class CashMonth {
  final String month;
  final int netIncome, cableIncome, connectCost, spend, profit;
  CashMonth({required this.month, required this.netIncome, required this.cableIncome, required this.connectCost, required this.spend, required this.profit});
  factory CashMonth.fromJson(Map<String, dynamic> j) => CashMonth(
        month: _str(j['month']),
        netIncome: _int(j['netIncome']),
        cableIncome: _int(j['cableIncome']),
        connectCost: _int(j['connectCost']),
        spend: _int(j['spend']),
        profit: _int(j['profit']),
      );
}

class CashBook {
  final List<CashMonth> perMonth;
  final Map<String, int> byCategory;
  final int totalSpend;
  final String latestMonth;
  CashBook({required this.perMonth, required this.byCategory, required this.totalSpend, required this.latestMonth});
  factory CashBook.fromJson(Map<String, dynamic> j) => CashBook(
        perMonth: ((j['perMonth'] as List?) ?? []).map((e) => CashMonth.fromJson(e as Map<String, dynamic>)).toList(),
        byCategory: ((j['byCategory'] as Map?) ?? {}).map((k, v) => MapEntry(k.toString(), _int(v))),
        totalSpend: _int(j['totalSpend']),
        latestMonth: _str(j['latestMonth']),
      );
}

class Expense {
  final int id, amount;
  final String date, category, description, paidFrom;
  final String? person;
  Expense({required this.id, required this.amount, required this.date, required this.category, required this.description, required this.paidFrom, required this.person});
  factory Expense.fromJson(Map<String, dynamic> j) => Expense(
        id: _int(j['id']),
        amount: _int(j['amount']),
        date: _str(j['date']),
        category: _str(j['category']),
        description: _str(j['description']),
        paidFrom: _str(j['paidFrom']),
        person: j['person']?.toString(),
      );
}
