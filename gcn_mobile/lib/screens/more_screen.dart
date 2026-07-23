import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets.dart';
import 'login_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
              const Avatar('SG', size: 52),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                Text('Sheharyar Ghori', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                SizedBox(height: 2),
                Text('sheharyar@gcn.pk', style: TextStyle(fontSize: 13, color: GcnColors.muted)),
              ])),
              const Pill('ADMIN', bg: GcnColors.brand50, fg: GcnColors.brand),
            ]),
          ),
          const SizedBox(height: 16),
          GcnCard(
            padding: EdgeInsets.zero,
            child: Column(children: const [
              _Item(Icons.calendar_month_rounded, 'Monthly register', 'Per-month recharge report'),
              Divider(height: 1, color: GcnColors.hairline, indent: 60),
              _Item(Icons.receipt_long_rounded, 'Cash Book', 'Kharcha & profit'),
              Divider(height: 1, color: GcnColors.hairline, indent: 60),
              _Item(Icons.tv_rounded, 'TV Cable', 'Cable subscribers'),
              Divider(height: 1, color: GcnColors.hairline, indent: 60),
              _Item(Icons.people_rounded, 'Customers', 'All internet subscribers'),
            ]),
          ),
          const SizedBox(height: 16),
          GcnCard(
            padding: EdgeInsets.zero,
            child: Column(children: const [
              _Item(Icons.settings_outlined, 'Settings', 'Organization & preferences'),
              Divider(height: 1, color: GcnColors.hairline, indent: 60),
              _Item(Icons.help_outline_rounded, 'Help & support', null),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false),
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
  const _Item(this.icon, this.title, this.subtitle);
  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      leading: Container(width: 34, height: 34, decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(9)), child: Icon(icon, size: 19, color: GcnColors.inkSoft)),
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
      subtitle: subtitle == null ? null : Text(subtitle!, style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
      trailing: const Icon(Icons.chevron_right_rounded, color: GcnColors.muted),
      onTap: () {},
    );
  }
}
