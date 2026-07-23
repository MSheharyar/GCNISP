import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../mock_data.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const _Header(),
          Transform.translate(
            offset: const Offset(0, -24),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(child: _KpiCard(kpis[0], icon: Icons.people_alt_rounded, tone: GcnColors.brand, bg: GcnColors.brand50)),
                    const SizedBox(width: 12),
                    Expanded(child: _KpiCard(kpis[1], icon: Icons.warning_amber_rounded, tone: GcnColors.red, bg: GcnColors.red50)),
                  ]),
                  const SizedBox(height: 16),
                  const _ChargedTodayBanner(),
                  const SizedBox(height: 22),
                  const SectionHeader('Live portal snapshot', subtitle: 'Connect & Fiber Beam · as of 22:19'),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 208,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: portalStats.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (_, i) => _PortalCard(portalStats[i]),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Row(children: [
                    const Expanded(child: SectionHeader('Recovery snapshot', subtitle: 'Most recent dues first')),
                    Text('View all', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GcnColors.brand)),
                  ]),
                  const SizedBox(height: 12),
                  GcnCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        for (int i = 0; i < 4; i++) ...[
                          _RecoveryRow(recovery[i]),
                          if (i < 3) const Divider(height: 1, color: GcnColors.hairline),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
      decoration: const BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [GcnColors.brand, GcnColors.brandDark]),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Good afternoon, Sheharyar 👋', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Collection picture · Jul 2026', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
              ],
            ),
          ),
          Container(
            width: 42,
            height: 42,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white24)),
            child: Image.asset('assets/gcn_logo.png', fit: BoxFit.cover),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final Kpi kpi;
  final IconData icon;
  final Color tone;
  final Color bg;
  const _KpiCard(this.kpi, {required this.icon, required this.tone, required this.bg});

  @override
  Widget build(BuildContext context) {
    return GcnCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(kpi.label, style: const TextStyle(fontSize: 12.5, color: GcnColors.inkSoft, fontWeight: FontWeight.w500))),
            Container(width: 34, height: 34, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(9)), child: Icon(icon, size: 18, color: tone)),
          ]),
          const SizedBox(height: 12),
          Text(kpi.value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: GcnColors.ink)),
          const SizedBox(height: 2),
          Text(kpi.sub, style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
        ],
      ),
    );
  }
}

class _ChargedTodayBanner extends StatelessWidget {
  const _ChargedTodayBanner();
  @override
  Widget build(BuildContext context) {
    final pending = recharges.where((r) => r.pending).length;
    return GcnCard(
      child: Row(
        children: [
          Container(width: 42, height: 42, decoration: BoxDecoration(color: GcnColors.brand50, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.schedule_rounded, color: GcnColors.brand, size: 21)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${recharges.length} recharges today', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
                const SizedBox(height: 2),
                Text('$pending to review & add to record', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: GcnColors.brand),
        ],
      ),
    );
  }
}

class _PortalCard extends StatelessWidget {
  final PortalStat s;
  const _PortalCard(this.s);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 250,
      child: GcnCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.account, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                      Text(s.source.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: GcnColors.muted, letterSpacing: 0.5)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(children: [const Icon(Icons.account_balance_wallet_outlined, size: 14, color: GcnColors.brand), const SizedBox(width: 4), Text(pkr(s.balance), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink))]),
                    const Text('wallet', style: TextStyle(fontSize: 10.5, color: GcnColors.muted)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _stat('Total', s.total.toString(), GcnColors.ink),
                _stat('Active', s.active.toString(), GcnColors.brand),
                _stat('Online', s.online.toString(), GcnColors.emerald),
                _stat('Offline', s.offline.toString(), GcnColors.inkSoft),
                _stat('Expired', s.expired.toString(), GcnColors.red),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, Color tone) {
    return Container(
      width: 66,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(10)),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: tone)),
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: GcnColors.muted)),
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
      child: Row(
        children: [
          Avatar(initials(c.name), bg: GcnColors.red50, fg: GcnColors.red, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink)),
                Text('${c.loginId} · ${c.house}, ${c.sector}', style: const TextStyle(fontSize: 12, color: GcnColors.muted), overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(pkr(c.outstanding), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.red)),
              const SizedBox(height: 2),
              OverdueBadge(c.monthsOverdue),
            ],
          ),
        ],
      ),
    );
  }
}
