import 'package:flutter/material.dart';
import '../theme.dart';
import '../api/api.dart';
import 'dashboard_screen.dart';
import 'charged_today_screen.dart';
import 'recovery_screen.dart';
import 'more_screen.dart';
import 'record_payment_sheet.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    // The dealer's enabled modules decide which tabs (and the FAB) appear.
    final internet = api.user?.hasModule('internet') ?? true;

    final tabs = <_Tab>[
      _Tab(Icons.grid_view_outlined, Icons.grid_view_rounded, 'Dashboard',
          DashboardScreen(onOpenRecharges: _goToRecharges)),
      if (internet) _Tab(Icons.bolt_outlined, Icons.bolt, 'Recharges', const ChargedTodayScreen()),
      if (internet) _Tab(Icons.savings_outlined, Icons.savings, 'Recovery', const RecoveryScreen()),
      _Tab(Icons.person_outline, Icons.person, 'More', const MoreScreen()),
    ];
    if (_index >= tabs.length) _index = 0;
    final onMore = tabs[_index].label == 'More';
    final showFab = internet && !onMore && !(api.user?.isViewer ?? false);

    return Scaffold(
      body: IndexedStack(index: _index, children: [for (final t in tabs) t.page]),
      floatingActionButton: showFab
          ? FloatingActionButton.extended(
              onPressed: () => showRecordPaymentSheet(context),
              backgroundColor: GcnColors.emerald,
              foregroundColor: Colors.white,
              elevation: 2,
              icon: const Icon(Icons.payments_rounded, size: 20),
              label: const Text('Record payment', style: TextStyle(fontWeight: FontWeight.w600)),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          for (final t in tabs)
            NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
        ],
      ),
    );
  }

  void _goToRecharges() {
    final internet = api.user?.hasModule('internet') ?? true;
    if (internet) setState(() => _index = 1); // Recharges is tab 1 when internet is on
  }
}

class _Tab {
  final IconData icon, selectedIcon;
  final String label;
  final Widget page;
  _Tab(this.icon, this.selectedIcon, this.label, this.page);
}
