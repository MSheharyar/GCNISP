import 'package:intl/intl.dart';

String pkr(num v) => 'Rs ${NumberFormat.decimalPattern('en_PK').format(v.round())}';

class Kpi {
  final String label;
  final String value;
  final String sub;
  const Kpi(this.label, this.value, this.sub);
}

class PortalStat {
  final String account;
  final String source; // 'Connect' | 'Fiber Beam'
  final int total, active, online, offline, expired;
  final int balance;
  const PortalStat({
    required this.account,
    required this.source,
    required this.total,
    required this.active,
    required this.online,
    required this.offline,
    required this.expired,
    required this.balance,
  });
}

class Recharge {
  final String name, loginId, house, sector, account, package, time;
  final int amount, previousBalance;
  final bool pending;
  const Recharge({
    required this.name,
    required this.loginId,
    required this.house,
    required this.sector,
    required this.account,
    required this.package,
    required this.time,
    required this.amount,
    required this.previousBalance,
    required this.pending,
  });
}

class RecoveryCustomer {
  final String name, loginId, house, sector;
  final int outstanding, monthsOverdue;
  const RecoveryCustomer(this.name, this.loginId, this.house, this.sector, this.outstanding, this.monthsOverdue);
}

// ── Mock data (UI phase — replaced by the API later) ──────────────────────
const kpis = [
  Kpi('Active subscribers', '349', 'of 823 on portals'),
  Kpi('Overdue 2+ months', '17', 'carrying arrears'),
];

const portalStats = [
  PortalStat(account: 'GCNDIGITAL', source: 'Connect', total: 295, active: 105, online: 90, offline: 15, expired: 190, balance: 2526),
  PortalStat(account: 'MRGNET', source: 'Connect', total: 253, active: 91, online: 71, offline: 20, expired: 162, balance: 4403),
  PortalStat(account: 'Fiber ISP', source: 'Fiber Beam', total: 275, active: 160, online: 126, offline: 36, expired: 115, balance: 3055),
];

const recharges = [
  Recharge(name: 'Zahid', loginId: '380cmrg', house: '380', sector: 'C', account: 'Fiber ISP', package: '15 MB', time: '18:12', amount: 1300, previousBalance: 100, pending: true),
  Recharge(name: 'M. Shoaib', loginId: 'l21fgcn', house: 'L-21', sector: 'F', account: 'Fiber ISP', package: '20 MB', time: '17:40', amount: 1500, previousBalance: 0, pending: true),
  Recharge(name: 'Farhan', loginId: '848disp', house: '848', sector: 'D', account: 'GCNDIGITAL', package: '20 MB', time: '16:55', amount: 1500, previousBalance: 200, pending: false),
  Recharge(name: 'Naveed', loginId: 'n11cgcn', house: 'N-11', sector: 'St-19', account: 'GCNDIGITAL', package: '20 MB', time: '15:20', amount: 1500, previousBalance: 4000, pending: false),
  Recharge(name: 'Usama', loginId: '778dmrg', house: '778', sector: 'D', account: 'MRGNET', package: '20 MB', time: '14:02', amount: 1500, previousBalance: 0, pending: false),
];

const recovery = [
  RecoveryCustomer('M. Zeeshan', 'zeeshanfgcn', '3 Jhuggi', 'F', 300, 0),
  RecoveryCustomer('Naveed', 'n11cgcn', 'N-11', 'St-19', 4000, 3),
  RecoveryCustomer('Faizan', '121fgcn2', '120', 'F', 3900, 1),
  RecoveryCustomer('M.Saeed', '296cmrg', '296', 'C', 3900, 3),
  RecoveryCustomer('Waseem Akram', '246fgcn2', '246', 'F', 1300, 0),
  RecoveryCustomer('Athar Khan', '391cmrg', '391', 'C', 600, 0),
];
