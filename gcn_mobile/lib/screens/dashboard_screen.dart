import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';

class DashboardScreen extends StatefulWidget {
  final VoidCallback onOpenRecharges;
  const DashboardScreen({super.key, required this.onOpenRecharges});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashData {
  final DashboardData dash;
  final List<PortalStat> portals;
  final List<Recharge> today;
  _DashData(this.dash, this.portals, this.today);
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashData> _load() async {
    final r = await Future.wait([api.dashboard(), api.portalStats(), api.chargedToday()]);
    return _DashData(r[0] as DashboardData, r[1] as List<PortalStat>, r[2] as List<Recharge>);
  }

  Future<void> _refresh() async {
    final f = _load();
    setState(() => _future = f);
    await f;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: FutureBuilder<_DashData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErrorRetry(message: snap.error.toString(), onRetry: _refresh);
          }
          final d = snap.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _Header(name: api.user?.name ?? '', month: d.dash.latestMonth),
                Transform.translate(
                  offset: const Offset(0, -24),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(child: _KpiCard('Active subscribers', d.dash.activeSubscribers.toString(), 'of ${d.dash.subscriberBase} on portals', Icons.people_alt_rounded, GcnColors.brand, GcnColors.brand50)),
                          const SizedBox(width: 12),
                          Expanded(child: _KpiCard('Overdue 2+ months', d.dash.overdueCount.toString(), 'carrying arrears', Icons.warning_amber_rounded, GcnColors.red, GcnColors.red50)),
                        ]),
                        const SizedBox(height: 16),
                        _ChargedTodayBanner(today: d.today, onTap: widget.onOpenRecharges),
                        const SizedBox(height: 22),
                        const SectionHeader('Live portal snapshot', subtitle: 'Connect & Fiber Beam'),
                        const SizedBox(height: 12),
                        if (d.portals.isEmpty)
                          GcnCard(child: const Text('No portal snapshot yet — run a sync from the web app.', style: TextStyle(color: GcnColors.muted, fontSize: 13)))
                        else
                          for (int i = 0; i < d.portals.length; i++) ...[
                            _PortalCard(d.portals[i]),
                            if (i < d.portals.length - 1) const SizedBox(height: 12),
                          ],
                        const SizedBox(height: 22),
                        const SectionHeader('Recovery snapshot', subtitle: 'Most recent dues first'),
                        const SizedBox(height: 12),
                        if (d.dash.recovery.isEmpty)
                          GcnCard(child: const Text('Nothing outstanding — all caught up 🎉', style: TextStyle(color: GcnColors.muted, fontSize: 13)))
                        else
                          GcnCard(
                            padding: EdgeInsets.zero,
                            child: Column(children: [
                              for (int i = 0; i < d.dash.recovery.length && i < 5; i++) ...[
                                _RecoveryRow(d.dash.recovery[i]),
                                if (i < d.dash.recovery.length - 1 && i < 4) const Divider(height: 1, color: GcnColors.hairline),
                              ],
                            ]),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String name, month;
  const _Header({required this.name, required this.month});
  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    final first = name.split(' ').first;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
      decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [GcnColors.brand, GcnColors.brandDark])),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$greeting, $first 👋', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Collection picture · ${niceDate(month)}', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
          ]),
        ),
        Container(
          width: 42, height: 42, clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white24)),
          child: Image.asset('assets/gcn_logo.png', fit: BoxFit.cover),
        ),
      ]),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label, value, sub;
  final IconData icon;
  final Color tone, bg;
  const _KpiCard(this.label, this.value, this.sub, this.icon, this.tone, this.bg);
  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12.5, color: GcnColors.inkSoft, fontWeight: FontWeight.w500))),
          Container(width: 34, height: 34, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(9)), child: Icon(icon, size: 18, color: tone)),
        ]),
        const SizedBox(height: 12),
        Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: GcnColors.ink)),
        const SizedBox(height: 2),
        Text(sub, style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
      ]),
    );
  }
}

class _ChargedTodayBanner extends StatelessWidget {
  final List<Recharge> today;
  final VoidCallback onTap;
  const _ChargedTodayBanner({required this.today, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final pending = today.where((r) => r.pending).length;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GcnCard(
          child: Row(children: [
            Container(width: 42, height: 42, decoration: BoxDecoration(color: GcnColors.brand50, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.schedule_rounded, color: GcnColors.brand, size: 21)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${today.length} recharge${today.length == 1 ? '' : 's'} today', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
              const SizedBox(height: 2),
              Text(pending > 0 ? '$pending to review & add to record' : 'All added to record', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
            ])),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: GcnColors.brand),
          ]),
        ),
      ),
    );
  }
}

class _PortalCard extends StatelessWidget {
  final PortalStat s;
  const _PortalCard(this.s);
  @override
  Widget build(BuildContext context) {
    final stats = <(String, int?, Color)>[
      ('Total', s.total, GcnColors.ink),
      ('Active', s.active, GcnColors.brand),
      ('Online', s.online, GcnColors.emerald),
      ('Offline', s.offline, GcnColors.inkSoft),
      ('Expired', s.expired, GcnColors.red),
    ];
    return GcnCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.account, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: GcnColors.ink)),
            Text(s.source.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: GcnColors.muted, letterSpacing: 0.5)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Row(children: [const Icon(Icons.account_balance_wallet_outlined, size: 14, color: GcnColors.brand), const SizedBox(width: 4), Text(s.balance != null ? pkr(s.balance!) : '—', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: GcnColors.ink))]),
            const Text('wallet', style: TextStyle(fontSize: 10.5, color: GcnColors.muted)),
          ]),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          for (final (label, value, tone) in stats)
            Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 2.5), child: _tile(label, value?.toString() ?? '—', tone))),
        ]),
      ]),
    );
  }

  Widget _tile(String label, String value, Color tone) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(10)),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: tone)),
        const SizedBox(height: 1),
        Text(label, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w500, color: GcnColors.muted)),
      ]),
    );
  }
}

class _RecoveryRow extends StatelessWidget {
  final RecoveryCustomer c;
  const _RecoveryRow(this.c);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        Avatar(initials(c.name), bg: GcnColors.red50, fg: GcnColors.red, size: 36),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(c.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          Text('${c.loginId} · ${c.house}, ${c.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted), overflow: TextOverflow.ellipsis),
        ])),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(pkr(c.outstanding), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.red)),
          const SizedBox(height: 2),
          OverdueBadge(c.monthsOverdue),
        ]),
      ]),
    );
  }
}

