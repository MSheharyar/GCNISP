import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import '../api/api.dart';
import 'login_screen.dart';
import 'monthly_register_screen.dart';
import 'cash_book_screen.dart';
import 'customers_screen.dart';
import 'cable_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = api.user;
    final name = user?.name ?? 'GCN user';
    final email = user?.email ?? '';
    final role = (user?.role ?? 'user').toUpperCase();
    final isViewer = user?.isViewer ?? false;
    void open(Widget s) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => s));
    void soon() => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(behavior: SnackBarBehavior.floating, content: Text('Coming soon on mobile')));
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        title: const Text('More', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GcnCard(
            child: Row(children: [
              Avatar(initials(name), size: 52),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                const SizedBox(height: 2),
                Text(email, style: const TextStyle(fontSize: 13, color: GcnColors.muted)),
              ])),
              Pill(role, bg: GcnColors.brand50, fg: GcnColors.brand),
            ]),
          ),
          const SizedBox(height: 16),
          GcnCard(
            padding: EdgeInsets.zero,
            child: Column(children: [
              _Item(Icons.calendar_month_rounded, 'Monthly register', 'Per-month recharge report', onTap: () => open(const MonthlyRegisterScreen())),
              if (!isViewer) ...[
                const Divider(height: 1, color: GcnColors.hairline, indent: 60),
                _Item(Icons.receipt_long_rounded, 'Cash Book', 'Kharcha & profit', onTap: () => open(const CashBookScreen())),
                const Divider(height: 1, color: GcnColors.hairline, indent: 60),
                _Item(Icons.tv_rounded, 'TV Cable', 'Cable subscribers', onTap: () => open(const CableScreen())),
                const Divider(height: 1, color: GcnColors.hairline, indent: 60),
                _Item(Icons.people_rounded, 'Customers', 'All internet subscribers', onTap: () => open(const CustomersScreen())),
              ],
            ]),
          ),
          const SizedBox(height: 16),
          GcnCard(
            padding: EdgeInsets.zero,
            child: Column(children: [
              _Item(Icons.settings_outlined, 'Settings', 'Organization & preferences', onTap: soon),
              const Divider(height: 1, color: GcnColors.hairline, indent: 60),
              _Item(Icons.help_outline_rounded, 'Help & support', null, onTap: soon),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              await api.logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
            },
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('Sign out'),
            style: OutlinedButton.styleFrom(foregroundColor: GcnColors.red, side: const BorderSide(color: GcnColors.hairline), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
          const SizedBox(height: 16),
          const Center(child: Text('GCN · v1.0.0', style: TextStyle(fontSize: 12, color: GcnColors.muted))),
        ],
      ),
    );
  }
}

class _Item extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  const _Item(this.icon, this.title, this.subtitle, {this.onTap});
  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      leading: Container(width: 34, height: 34, decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(9)), child: Icon(icon, size: 19, color: GcnColors.inkSoft)),
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
      subtitle: subtitle == null ? null : Text(subtitle!, style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
      trailing: const Icon(Icons.chevron_right_rounded, color: GcnColors.muted),
    );
  }
}
