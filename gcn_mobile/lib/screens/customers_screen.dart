import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';
import 'customer_detail_screen.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  late Future<List<Customer>> _future;
  String _q = '';
  String _status = 'active';

  @override
  void initState() {
    super.initState();
    _future = api.customers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        foregroundColor: GcnColors.ink,
        title: const Text('Customers', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<List<Customer>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: () => setState(() => _future = api.customers()));
          final all = snap.data!;
          final activeCount = all.where((c) => c.status == 'active').length;
          final rows = all.where((c) {
            if (_status == 'active' && c.status != 'active') return false;
            if (_q.isNotEmpty && !'${c.name} ${c.loginId} ${c.house} ${c.sector}'.toLowerCase().contains(_q.toLowerCase())) return false;
            return true;
          }).toList();

          return Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Column(children: [
                TextField(
                  onChanged: (v) => setState(() => _q = v),
                  decoration: const InputDecoration(hintText: 'Search name, login ID, sector…', prefixIcon: Icon(Icons.search, size: 20, color: GcnColors.muted)),
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
                  Text('${rows.length} shown · $activeCount active', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
                ]),
              ]),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                itemCount: rows.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _Row(rows[i]),
              ),
            ),
          ]);
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final Customer c;
  const _Row(this.c);
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CustomerDetailScreen(customerId: c.id, name: c.name))),
        child: GcnCard(
          child: Row(children: [
            Avatar(initials(c.name), size: 40),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
              Text('${c.loginId} · ${c.house}, ${c.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(c.balance > 0 ? pkr(c.balance) : '—', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: c.balance > 0 ? GcnColors.red : GcnColors.muted)),
              const SizedBox(height: 3),
              OverdueBadge(c.monthsOverdue),
            ]),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded, size: 18, color: GcnColors.muted),
          ]),
        ),
      ),
    );
  }
}
