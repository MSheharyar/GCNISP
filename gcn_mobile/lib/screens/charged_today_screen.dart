import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../mock_data.dart';

class ChargedTodayScreen extends StatefulWidget {
  const ChargedTodayScreen({super.key});

  @override
  State<ChargedTodayScreen> createState() => _ChargedTodayScreenState();
}

class _ChargedTodayScreenState extends State<ChargedTodayScreen> {
  int _tab = 0; // 0 all, 1 pending, 2 added

  @override
  Widget build(BuildContext context) {
    final pending = recharges.where((r) => r.pending).toList();
    final added = recharges.where((r) => !r.pending).toList();
    final list = _tab == 1 ? pending : _tab == 2 ? added : recharges;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('Charged today', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(children: [
            Expanded(child: _MiniStat('Today', recharges.length.toString(), GcnColors.ink)),
            const SizedBox(width: 10),
            Expanded(child: _MiniStat('To review', pending.length.toString(), GcnColors.amber)),
            const SizedBox(width: 10),
            Expanded(child: _MiniStat('Added', added.length.toString(), GcnColors.emerald)),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            _Tab('All (${recharges.length})', _tab == 0, () => setState(() => _tab = 0)),
            _Tab('To review (${pending.length})', _tab == 1, () => setState(() => _tab = 1)),
            _Tab('Added (${added.length})', _tab == 2, () => setState(() => _tab = 2)),
          ]),
          const SizedBox(height: 14),
          for (final r in list) Padding(padding: const EdgeInsets.only(bottom: 12), child: _RechargeCard(r)),
        ],
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
  const _RechargeCard(this.r);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Avatar(initials(r.name), size: 38),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Flexible(child: Text(r.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink))),
                      const SizedBox(width: 6),
                      const Pill('SYNC', bg: GcnColors.brand50, fg: GcnColors.brand),
                    ]),
                    Text('${r.loginId} · ${r.house}, ${r.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
                  ],
                ),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(r.time, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: GcnColors.inkSoft)),
                Text(r.account, style: const TextStyle(fontSize: 11, color: GcnColors.muted)),
              ]),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: GcnColors.hairline),
          const SizedBox(height: 12),
          Row(
            children: [
              _kv('Package', r.package),
              _kv('Prev. bal', r.previousBalance > 0 ? pkr(r.previousBalance) : '—'),
              _kv('Amount', pkr(r.amount), strong: true),
            ],
          ),
          const SizedBox(height: 12),
          if (r.pending)
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.check_rounded, size: 16),
                  label: const Text('Add to record'),
                  style: OutlinedButton.styleFrom(foregroundColor: GcnColors.brand, side: const BorderSide(color: GcnColors.brand100), padding: const EdgeInsets.symmetric(vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                ),
              ),
            ])
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: GcnColors.emerald50, borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: const [
                Icon(Icons.check_circle_rounded, size: 14, color: GcnColors.emerald),
                SizedBox(width: 5),
                Text('Added to record', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GcnColors.emerald)),
              ]),
            ),
        ],
      ),
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
