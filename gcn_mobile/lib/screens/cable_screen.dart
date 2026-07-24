import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';

class CableScreen extends StatefulWidget {
  const CableScreen({super.key});

  @override
  State<CableScreen> createState() => _CableScreenState();
}

class _CableScreenState extends State<CableScreen> {
  late Future<List<CableCustomer>> _future;
  String _q = '';
  String _status = 'active';

  @override
  void initState() {
    super.initState();
    _future = api.cableCustomers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        foregroundColor: GcnColors.ink,
        title: const Text('TV Cable', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<List<CableCustomer>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: () => setState(() => _future = api.cableCustomers()));
          final all = snap.data!;
          final activeCount = all.where((c) => c.status == 'active').length;
          final monthly = all.where((c) => c.status == 'active').fold<int>(0, (s, c) => s + c.monthlyFee);
          final rows = all.where((c) {
            if (_status == 'active' && c.status != 'active') return false;
            if (_q.isNotEmpty && !'${c.name ?? ''} ${c.house} ${c.sector}'.toLowerCase().contains(_q.toLowerCase())) return false;
            return true;
          }).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              GcnCard(
                child: Row(children: [
                  Container(width: 42, height: 42, decoration: BoxDecoration(color: GcnColors.violet50, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.tv_rounded, color: GcnColors.violet, size: 21)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Expected monthly (active)', style: TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                    Text(pkr(monthly), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: GcnColors.ink)),
                  ])),
                  Text('$activeCount active', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                ]),
              ),
              const SizedBox(height: 14),
              TextField(
                onChanged: (v) => setState(() => _q = v),
                decoration: const InputDecoration(hintText: 'Search name, house #, sector…', prefixIcon: Icon(Icons.search, size: 20, color: GcnColors.muted)),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Container(
                  decoration: BoxDecoration(color: GcnColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: GcnColors.hairline)),
                  padding: const EdgeInsets.all(2),
                  child: Row(children: [
                    for (final s in const ['active', 'all'])
                      GestureDetector(
                        onTap: () => setState(() => _status = s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(color: _status == s ? GcnColors.brand50 : Colors.transparent, borderRadius: BorderRadius.circular(8)),
                          child: Text(s == 'active' ? 'Active' : 'All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _status == s ? GcnColors.brand : GcnColors.inkSoft)),
                        ),
                      ),
                  ]),
                ),
                const Spacer(),
                Text('${rows.length} of ${all.length}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
              ]),
              const SizedBox(height: 14),
              for (final c in rows) Padding(padding: const EdgeInsets.only(bottom: 10), child: _Row(c)),
              if (rows.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: Text('No cable customers match.', style: TextStyle(color: GcnColors.muted)))),
            ],
          );
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final CableCustomer c;
  const _Row(this.c);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Row(children: [
        Avatar(c.name != null && c.name!.isNotEmpty ? initials(c.name!) : c.house, bg: GcnColors.violet50, fg: GcnColors.violet, size: 40),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(c.name?.isNotEmpty == true ? c.name! : 'House ${c.house}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          Text('House ${c.house} · Sector ${c.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(pkr(c.monthlyFee), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: GcnColors.ink)),
          const SizedBox(height: 2),
          Text(c.balance > 0 ? 'owes ${pkr(c.balance)}' : 'clear', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: c.balance > 0 ? GcnColors.red : GcnColors.emerald)),
        ]),
      ]),
    );
  }
}
