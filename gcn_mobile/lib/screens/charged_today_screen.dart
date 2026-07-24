import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';
import 'customer_detail_screen.dart';

class ChargedTodayScreen extends StatefulWidget {
  const ChargedTodayScreen({super.key});

  @override
  State<ChargedTodayScreen> createState() => _ChargedTodayScreenState();
}

class _ChargedTodayScreenState extends State<ChargedTodayScreen> {
  late Future<List<Recharge>> _future;
  int _tab = 0; // 0 all, 1 pending, 2 added
  int? _committing;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _future = api.chargedToday();
  }

  Future<void> _refresh() async {
    final f = api.chargedToday();
    setState(() => _future = f);
    await f;
  }

  Future<void> _sync() async {
    setState(() => _syncing = true);
    try {
      await api.runSync();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: GcnColors.emerald, content: Text('Synced — pulled the latest recharges from the portals')));
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: GcnColors.red, content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  Future<void> _addToRecord(Recharge r) async {
    setState(() => _committing = r.id);
    try {
      await api.commitCharge(chargeId: r.id, openingBalance: r.previousBalance ?? 0, amount: r.amount, packageId: r.packageId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: GcnColors.emerald, content: Text('Added ${r.name} to the record')));
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: GcnColors.red, content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _committing = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = !(api.user?.isViewer ?? false);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('Charged today', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        actions: [
          if (canEdit)
            _syncing
                ? const Padding(padding: EdgeInsets.only(right: 18), child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: GcnColors.brand))))
                : Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: TextButton.icon(
                      onPressed: _sync,
                      icon: const Icon(Icons.sync_rounded, size: 18, color: GcnColors.brand),
                      label: const Text('Sync', style: TextStyle(color: GcnColors.brand, fontWeight: FontWeight.w600)),
                    ),
                  ),
        ],
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: FutureBuilder<List<Recharge>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: _refresh);
          final all = snap.data!;
          final pending = all.where((r) => r.pending).toList();
          final added = all.where((r) => !r.pending).toList();
          final list = _tab == 1 ? pending : _tab == 2 ? added : all;

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  Expanded(child: _MiniStat('Today', all.length.toString(), GcnColors.ink)),
                  const SizedBox(width: 10),
                  Expanded(child: _MiniStat('To review', pending.length.toString(), GcnColors.amber)),
                  const SizedBox(width: 10),
                  Expanded(child: _MiniStat('Added', added.length.toString(), GcnColors.emerald)),
                ]),
                const SizedBox(height: 16),
                Row(children: [
                  _Tab('All (${all.length})', _tab == 0, () => setState(() => _tab = 0)),
                  _Tab('To review (${pending.length})', _tab == 1, () => setState(() => _tab = 1)),
                  _Tab('Added (${added.length})', _tab == 2, () => setState(() => _tab = 2)),
                ]),
                const SizedBox(height: 14),
                if (list.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: Text('Nothing here yet today.', style: TextStyle(color: GcnColors.muted)))),
                for (final r in list) Padding(padding: const EdgeInsets.only(bottom: 12), child: _RechargeCard(r, canEdit: canEdit, committing: _committing == r.id, onAdd: () => _addToRecord(r))),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color tone;
  const _MiniStat(this.label, this.value, this.tone);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: tone)),
      ]),
    );
  }
}

class _Tab extends StatelessWidget {
  final String text;
  final bool active;
  final VoidCallback onTap;
  const _Tab(this.text, this.active, this.onTap);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(color: active ? GcnColors.brand50 : GcnColors.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: active ? GcnColors.brand100 : GcnColors.hairline)),
          child: Text(text, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: active ? GcnColors.brand : GcnColors.inkSoft)),
        ),
      ),
    );
  }
}

class _RechargeCard extends StatelessWidget {
  final Recharge r;
  final bool canEdit, committing;
  final VoidCallback onAdd;
  const _RechargeCard(this.r, {required this.canEdit, required this.committing, required this.onAdd});
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CustomerDetailScreen(customerId: r.customerId, name: r.name))),
              child: Row(children: [
                Avatar(initials(r.name), size: 38),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Flexible(child: Text(r.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink))),
                    const SizedBox(width: 6),
                    const Pill('SYNC', bg: GcnColors.brand50, fg: GcnColors.brand),
                  ]),
                  Text('${r.loginId} · ${r.house}, ${r.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
                ])),
              ]),
            ),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(r.time.isEmpty ? '—' : r.time, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: GcnColors.inkSoft)),
            Text(r.account, style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
          ]),
        ]),
        const SizedBox(height: 12),
        const Divider(height: 1, color: GcnColors.hairline),
        const SizedBox(height: 12),
        Row(children: [
          _kv('Package', r.package ?? r.portalSpeed ?? '—'),
          _kv('Prev. bal', (r.previousBalance ?? 0) > 0 ? pkr(r.previousBalance!) : '—'),
          _kv('Amount', pkr(r.amount), strong: true),
        ]),
        const SizedBox(height: 12),
        if (!r.pending)
          _statusPill('Added to record', GcnColors.emerald, GcnColors.emerald50, Icons.check_circle_rounded)
        else if (!canEdit)
          _statusPill('Awaiting review', GcnColors.amber, GcnColors.amber50, Icons.schedule_rounded)
        else
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: committing ? null : onAdd,
              icon: committing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: GcnColors.brand)) : const Icon(Icons.check_rounded, size: 16),
              label: const Text('Add to record'),
              style: OutlinedButton.styleFrom(foregroundColor: GcnColors.brand, side: const BorderSide(color: GcnColors.brand100), padding: const EdgeInsets.symmetric(vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            ),
          ),
      ]),
    );
  }

  Widget _statusPill(String text, Color fg, Color bg, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: fg),
        const SizedBox(width: 5),
        Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
      ]),
    );
  }

  Widget _kv(String k, String v, {bool strong = false}) {
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
        const SizedBox(height: 2),
        Text(v, style: TextStyle(fontSize: 13, fontWeight: strong ? FontWeight.w700 : FontWeight.w500, color: GcnColors.ink)),
      ]),
    );
  }
}
