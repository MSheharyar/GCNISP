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
    final pages = [
      DashboardScreen(onOpenRecharges: () => setState(() => _index = 1)),
      const ChargedTodayScreen(),
      const RecoveryScreen(),
      const MoreScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      floatingActionButton: (_index == 3 || (api.user?.isViewer ?? false))
          ? null
          : FloatingActionButton.extended(
              onPressed: () => showRecordPaymentSheet(context),
              backgroundColor: GcnColors.emerald,
              foregroundColor: Colors.white,
              elevation: 2,
              icon: const Icon(Icons.payments_rounded, size: 20),
              label: const Text('Record payment', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.bolt_outlined), selectedIcon: Icon(Icons.bolt), label: 'Recharges'),
          NavigationDestination(icon: Icon(Icons.savings_outlined), selectedIcon: Icon(Icons.savings), label: 'Recovery'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'More'),
        ],
      ),
    );
  }
}
