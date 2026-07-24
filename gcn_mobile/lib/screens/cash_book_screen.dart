import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';

const _catMeta = {
  'salary': ('Salary', Color(0xFF2563EB), Color(0xFFEFF4FF)),
  'utility': ('Utility', GcnColors.amber, GcnColors.amber50),
  'supplies': ('Supplies', Color(0xFF0891B2), Color(0xFFECFEFF)),
  'household': ('Household', Color(0xFFDB2777), Color(0xFFFDF2F8)),
  'owner_draw': ('Owner draw', GcnColors.violet, GcnColors.violet50),
  'recovery': ('Recovery', GcnColors.emerald, GcnColors.emerald50),
  'other': ('Other', GcnColors.inkSoft, GcnColors.canvas),
};

class CashBookScreen extends StatefulWidget {
  const CashBookScreen({super.key});

  @override
  State<CashBookScreen> createState() => _CashBookScreenState();
}

class _Data {
  final CashBook book;
  final List<Expense> expenses;
  _Data(this.book, this.expenses);
}

class _CashBookScreenState extends State<CashBookScreen> {
  late Future<_Data> _future;
  String _expMonth = '';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_Data> _load() async {
    final r = await Future.wait([api.cashbook(), api.expenses()]);
    return _Data(r[0] as CashBook, r[1] as List<Expense>);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('Cash Book', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<_Data>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: () => setState(() => _future = _load()));
          final book = snap.data!.book;
          final expenses = snap.data!.expenses;
          final expMonths = (<String>{for (final e in expenses) e.date.substring(0, 7)}.toList()..sort()).reversed.toList();
          if (_expMonth.isEmpty && expMonths.isNotEmpty) _expMonth = expMonths.first;
          final monthExp = expenses.where((e) => e.date.startsWith(_expMonth)).toList()..sort((a, b) => b.date.compareTo(a.date));
          final monthTotal = monthExp.fold<int>(0, (s, e) => s + e.amount);
          final latest = book.perMonth.isNotEmpty ? book.perMonth.last : null;
          final months = book.perMonth.reversed.take(6).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (latest != null) ...[
                Row(children: [
                  Expanded(child: _Money('Income · ${niceDate(latest.month)}', pkr(latest.netIncome + latest.cableIncome), GcnColors.emerald, GcnColors.emerald50, Icons.trending_up_rounded)),
                  const SizedBox(width: 12),
                  Expanded(child: _Money('Profit', pkr(latest.profit), latest.profit >= 0 ? GcnColors.brand : GcnColors.red, latest.profit >= 0 ? GcnColors.brand50 : GcnColors.red50, Icons.savings_rounded)),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _Money('Connect cost', pkr(latest.connectCost), GcnColors.red, GcnColors.red50, Icons.trending_down_rounded)),
                  const SizedBox(width: 12),
                  Expanded(child: _Money('Expenses', pkr(latest.spend), GcnColors.amber, GcnColors.amber50, Icons.payments_rounded)),
                ]),
                const SizedBox(height: 22),
              ],
              const SectionHeader('Monthly cash flow', subtitle: 'Income − cost − expenses'),
              const SizedBox(height: 12),
              GcnCard(
                padding: EdgeInsets.zero,
                child: Column(children: [
                  for (int i = 0; i < months.length; i++) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(children: [
                        Expanded(child: Text(niceDate(months[i].month), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink))),
                        Text(pkr(months[i].profit), style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: months[i].profit >= 0 ? GcnColors.emerald : GcnColors.red)),
                      ]),
                    ),
                    if (i < months.length - 1) const Divider(height: 1, color: GcnColors.hairline),
                  ],
                ]),
              ),
              const SizedBox(height: 22),
              // ── Monthly Kharcha ──
              Row(children: [
                const Expanded(child: SectionHeader('Monthly Kharcha', subtitle: 'Itemised expenses')),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _expMonth.isEmpty ? null : _expMonth,
                    items: expMonths.map((m) => DropdownMenuItem(value: m, child: Text(niceDate(m), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink)))).toList(),
                    onChanged: (m) => setState(() => _expMonth = m ?? ''),
                  ),
                ),
              ]),
              const SizedBox(height: 8),
              GcnCard(
                child: Row(children: [
                  Expanded(child: Text('${monthExp.length} entries', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted))),
                  Text(pkr(monthTotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: GcnColors.amber)),
                ]),
              ),
              const SizedBox(height: 10),
              for (final e in monthExp) Padding(padding: const EdgeInsets.only(bottom: 8), child: _ExpenseRow(e)),
              if (monthExp.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: Text('No expenses this month.', style: TextStyle(color: GcnColors.muted)))),
            ],
          );
        },
      ),
    );
  }
}

class _Money extends StatelessWidget {
  final String label, value;
  final Color tone, bg;
  final IconData icon;
  const _Money(this.label, this.value, this.tone, this.bg, this.icon);
  @override
  Widget build(BuildContext context) => GcnCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(label, style: const TextStyle(fontSize: 11.5, color: GcnColors.muted))),
            Container(width: 30, height: 30, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 16, color: tone)),
          ]),
          const SizedBox(height: 10),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: tone), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      );
}

class _ExpenseRow extends StatelessWidget {
  final Expense e;
  const _ExpenseRow(this.e);
  @override
  Widget build(BuildContext context) {
    final meta = _catMeta[e.category] ?? _catMeta['other']!;
    return GcnCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(e.description, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          const SizedBox(height: 3),
          Row(children: [
            Pill(meta.$1, bg: meta.$3, fg: meta.$2),
            const SizedBox(width: 8),
            Text(niceDate(e.date), style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
            if (e.person != null) ...[const SizedBox(width: 8), Text('· ${e.person}', style: const TextStyle(fontSize: 11.5, color: GcnColors.muted))],
          ]),
        ])),
        Text(pkr(e.amount), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink)),
      ]),
    );
  }
}
