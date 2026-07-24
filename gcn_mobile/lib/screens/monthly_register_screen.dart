import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';

class MonthlyRegisterScreen extends StatefulWidget {
  const MonthlyRegisterScreen({super.key});

  @override
  State<MonthlyRegisterScreen> createState() => _MonthlyRegisterScreenState();
}

class _MonthlyRegisterScreenState extends State<MonthlyRegisterScreen> {
  late Future<MonthlyData> _future;
  String? _month;
  String _account = 'all';
  String _q = '';

  @override
  void initState() {
    super.initState();
    _future = api.monthly();
  }

  void _load(String? month) {
    setState(() {
      _month = month;
      _future = api.monthly(month: month);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('Monthly register', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<MonthlyData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: () => _load(_month));
          final d = snap.data!;
          final accounts = <String>{for (final r in d.rows) r.account}.toList()..sort();
          final byAccount = _account == 'all' ? d.rows : d.rows.where((r) => r.account == _account).toList();
          final rows = _q.isEmpty
              ? byAccount
              : byAccount.where((r) => '${r.name} ${r.loginId} ${r.house} ${r.sector}'.toLowerCase().contains(_q.toLowerCase())).toList();
          final charged = byAccount.fold<int>(0, (s, r) => s + r.amount);
          final collected = byAccount.where((r) => r.paid).fold<int>(0, (s, r) => s + r.amount);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Month selector
              GcnCard(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                child: Row(children: [
                  const Icon(Icons.calendar_month_rounded, size: 18, color: GcnColors.brand),
                  const SizedBox(width: 10),
                  const Text('Month', style: TextStyle(fontSize: 13, color: GcnColors.inkSoft)),
                  const Spacer(),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: d.month.isEmpty ? null : d.month,
                      items: d.months.map((m) => DropdownMenuItem(value: m, child: Text(niceDate(m), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)))).toList(),
                      onChanged: (m) => _load(m),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _MiniStat('Users billed', byAccount.length.toString(), GcnColors.ink)),
                const SizedBox(width: 10),
                Expanded(child: _MiniStat('Charged', pkr(charged), GcnColors.ink)),
                const SizedBox(width: 10),
                Expanded(child: _MiniStat('Collected', pkr(collected), GcnColors.emerald)),
              ]),
              const SizedBox(height: 14),
              SizedBox(
                height: 34,
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  _pill('All accounts', _account == 'all', () => setState(() => _account = 'all')),
                  for (final a in accounts) _pill(a, _account == a, () => setState(() => _account = a)),
                ]),
              ),
              const SizedBox(height: 12),
              TextField(
                onChanged: (v) => setState(() => _q = v),
                decoration: const InputDecoration(hintText: 'Search name, login ID…', prefixIcon: Icon(Icons.search, size: 20, color: GcnColors.muted)),
              ),
              const SizedBox(height: 14),
              for (final r in rows) Padding(padding: const EdgeInsets.only(bottom: 10), child: _Row(r)),
              if (rows.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: Text('No records for this month.', style: TextStyle(color: GcnColors.muted)))),
            ],
          );
        },
      ),
    );
  }

  Widget _pill(String text, bool active, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: active ? GcnColors.brand50 : GcnColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: active ? GcnColors.brand100 : GcnColors.hairline)),
            child: Text(text, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: active ? GcnColors.brand : GcnColors.inkSoft)),
          ),
        ),
      );
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color tone;
  const _MiniStat(this.label, this.value, this.tone);
  @override
  Widget build(BuildContext context) => GcnCard(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: tone), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      );
}

class _Row extends StatelessWidget {
  final MonthlyRow r;
  const _Row(this.r);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Avatar(initials(r.name), size: 36),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
            Text('${r.loginId} · ${r.house}, ${r.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
          ])),
          if (r.paid)
            const Icon(Icons.check_circle_rounded, size: 18, color: GcnColors.emerald)
          else
            const Pill('Unpaid', bg: GcnColors.amber50, fg: GcnColors.amber),
        ]),
        const SizedBox(height: 10),
        const Divider(height: 1, color: GcnColors.hairline),
        const SizedBox(height: 10),
        Row(children: [
          _kv('Package', r.package ?? '—'),
          _kv('Amount', pkr(r.amount), strong: true),
          _kv('Balance', pkr(r.balance), tone: r.balance > 0 ? GcnColors.red : GcnColors.muted),
        ]),
      ]),
    );
  }

  Widget _kv(String k, String v, {bool strong = false, Color? tone}) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(k, style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
          const SizedBox(height: 2),
          Text(v, style: TextStyle(fontSize: 13, fontWeight: strong ? FontWeight.w700 : FontWeight.w500, color: tone ?? GcnColors.ink)),
        ]),
      );
}
