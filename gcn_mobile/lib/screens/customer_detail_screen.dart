import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';
import 'record_payment_sheet.dart';

class CustomerDetailScreen extends StatefulWidget {
  final int customerId;
  final String name;
  const CustomerDetailScreen({super.key, required this.customerId, required this.name});

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _Data {
  final CustomerDetail c;
  final List<LedgerEntry> ledger;
  final List<Account> accounts;
  final List<PackageRef> packages;
  _Data(this.c, this.ledger, this.accounts, this.packages);
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  late Future<_Data> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_Data> _load() async {
    final r = await Future.wait([api.customer(widget.customerId), api.customerLedger(widget.customerId), api.accounts(), api.packages()]);
    return _Data(r[0] as CustomerDetail, r[1] as List<LedgerEntry>, r[2] as List<Account>, r[3] as List<PackageRef>);
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = !(api.user?.isViewer ?? false);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        foregroundColor: GcnColors.ink,
        title: Text(widget.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<_Data>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: () => setState(() => _future = _load()));
          final d = snap.data!;
          final c = d.c;
          final account = d.accounts.firstWhere((a) => a.id == c.currentAccountId, orElse: () => Account(id: 0, name: '—')).name;
          final pkg = d.packages.firstWhere((p) => p.id == c.currentPackageId, orElse: () => PackageRef(id: 0, name: '—', speedMbps: null)).name;
          final ledger = d.ledger.reversed.toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Profile header
              GcnCard(
                child: Column(children: [
                  Row(children: [
                    Avatar(initials(c.name), size: 52),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                      const SizedBox(height: 2),
                      Text('${c.loginId} · ${c.house}, ${c.sector}', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                    ])),
                    _StatusPill(c.status),
                  ]),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: GcnColors.hairline),
                  const SizedBox(height: 12),
                  Row(children: [
                    _fact('Account', account),
                    _fact('Package', pkg),
                    _fact('Type', c.type),
                  ]),
                  if (c.phone != null && c.phone!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(children: [const Icon(Icons.phone_outlined, size: 15, color: GcnColors.muted), const SizedBox(width: 6), Text(c.phone!, style: const TextStyle(fontSize: 13, color: GcnColors.inkSoft))]),
                  ],
                ]),
              ),
              const SizedBox(height: 14),
              // Balance
              GcnCard(
                child: Row(children: [
                  Container(width: 44, height: 44, decoration: BoxDecoration(color: c.balance > 0 ? GcnColors.red50 : GcnColors.emerald50, borderRadius: BorderRadius.circular(12)), child: Icon(c.balance > 0 ? Icons.account_balance_wallet_rounded : Icons.check_circle_rounded, color: c.balance > 0 ? GcnColors.red : GcnColors.emerald, size: 22)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Outstanding balance', style: TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                    Text(c.balance > 0 ? pkr(c.balance) : 'Clear', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: c.balance > 0 ? GcnColors.red : GcnColors.emerald)),
                  ])),
                  OverdueBadge(c.monthsOverdue),
                ]),
              ),
              if (canEdit && c.balance > 0) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => showRecordPaymentSheet(context, preselect: Customer(id: c.id, name: c.name, loginId: c.loginId, house: c.house, sector: c.sector, balance: c.balance, monthsOverdue: c.monthsOverdue, status: c.status)),
                    style: FilledButton.styleFrom(backgroundColor: GcnColors.emerald),
                    icon: const Icon(Icons.payments_rounded, size: 18),
                    label: const Text('Collect payment'),
                  ),
                ),
              ],
              const SizedBox(height: 22),
              const SectionHeader('Ledger', subtitle: 'Charges and payments'),
              const SizedBox(height: 12),
              GcnCard(
                padding: EdgeInsets.zero,
                child: ledger.isEmpty
                    ? const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No ledger entries.', style: TextStyle(color: GcnColors.muted))))
                    : Column(children: [
                        for (int i = 0; i < ledger.length && i < 40; i++) ...[
                          _LedgerRow(ledger[i]),
                          if (i < ledger.length - 1 && i < 39) const Divider(height: 1, color: GcnColors.hairline),
                        ],
                      ]),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _fact(String k, String v) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
          const SizedBox(height: 2),
          Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GcnColors.ink)),
        ]),
      );
}

class _StatusPill extends StatelessWidget {
  final String status;
  const _StatusPill(this.status);
  @override
  Widget build(BuildContext context) {
    final active = status == 'active';
    return Pill(status.isEmpty ? '—' : status[0].toUpperCase() + status.substring(1), bg: active ? GcnColors.emerald50 : GcnColors.canvas, fg: active ? GcnColors.emerald : GcnColors.muted);
  }
}

class _LedgerRow extends StatelessWidget {
  final LedgerEntry e;
  const _LedgerRow(this.e);
  @override
  Widget build(BuildContext context) {
    final isCharge = e.kind == 'charge';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(children: [
        Container(width: 32, height: 32, decoration: BoxDecoration(color: isCharge ? GcnColors.red50 : GcnColors.emerald50, borderRadius: BorderRadius.circular(8)), child: Icon(isCharge ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded, size: 16, color: isCharge ? GcnColors.red : GcnColors.emerald)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(e.label.isEmpty ? (isCharge ? 'Charge' : 'Payment') : e.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          Text(niceDate(e.date), style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${isCharge ? '+' : '−'}${pkr(isCharge ? e.debit : e.credit)}', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: isCharge ? GcnColors.red : GcnColors.emerald)),
          Text('bal ${pkr(e.balance)}', style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
        ]),
      ]),
    );
  }
}
