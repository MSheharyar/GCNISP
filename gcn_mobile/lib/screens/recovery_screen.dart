import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../mock_data.dart';

class RecoveryScreen extends StatefulWidget {
  const RecoveryScreen({super.key});

  @override
  State<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends State<RecoveryScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final rows = (recovery.toList()..sort((a, b) => b.outstanding - a.outstanding))
        .where((c) => _q.isEmpty || '${c.name} ${c.loginId} ${c.house} ${c.sector}'.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    final total = recovery.fold<int>(0, (s, c) => s + c.outstanding);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('Recovery list', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GcnCard(
            child: Row(children: [
              Container(width: 42, height: 42, decoration: BoxDecoration(color: GcnColors.red50, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.savings_rounded, color: GcnColors.red, size: 21)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Outstanding to recover', style: TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                Text(pkr(total), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: GcnColors.red)),
              ])),
              Text('${recovery.length} customers', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
            ]),
          ),
          const SizedBox(height: 14),
          TextField(
            onChanged: (v) => setState(() => _q = v),
            decoration: const InputDecoration(hintText: 'Search name, login ID, house, sector…', prefixIcon: Icon(Icons.search, size: 20, color: GcnColors.muted)),
          ),
          const SizedBox(height: 14),
          for (final c in rows) Padding(padding: const EdgeInsets.only(bottom: 12), child: _Card(c)),
          if (rows.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: Text('No matches.', style: TextStyle(color: GcnColors.muted)))),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final RecoveryCustomer c;
  const _Card(this.c);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Row(
        children: [
          Avatar(initials(c.name), bg: GcnColors.red50, fg: GcnColors.red),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
                const SizedBox(height: 2),
                Text('${c.loginId} · ${c.house}, ${c.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(pkr(c.outstanding), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: GcnColors.red)),
              const SizedBox(height: 3),
              OverdueBadge(c.monthsOverdue),
            ],
          ),
        ],
      ),
    );
  }
}
