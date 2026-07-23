import 'package:flutter/material.dart';
import 'theme.dart';

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  final letters = parts.take(2).map((p) => p.isNotEmpty ? p[0] : '').join();
  return letters.toUpperCase();
}

/// White rounded card matching the web design.
class GcnCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  const GcnCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: GcnColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GcnColors.hairline),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 2))],
      ),
      padding: padding,
      child: child,
    );
  }
}

class Avatar extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;
  final double size;
  const Avatar(this.label, {super.key, this.bg = GcnColors.brand50, this.fg = GcnColors.brand, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: size * 0.32)),
    );
  }
}

class OverdueBadge extends StatelessWidget {
  final int months;
  const OverdueBadge(this.months, {super.key});

  @override
  Widget build(BuildContext context) {
    if (months < 2) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: GcnColors.red50, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.warning_amber_rounded, size: 12, color: GcnColors.red),
        const SizedBox(width: 4),
        Text('${months}mo overdue', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: GcnColors.red)),
      ]),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  const SectionHeader(this.title, {super.key, this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle!, style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
          ],
        ]),
      ),
      ?trailing,
    ]);
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Color bg;
  final Color fg;
  const Pill(this.text, {super.key, required this.bg, required this.fg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}
