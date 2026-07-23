import 'package:intl/intl.dart';

String pkr(num v) => 'Rs ${NumberFormat.decimalPattern('en_PK').format(v.round())}';

/// 'YYYY-MM' or 'YYYY-MM-DD' → 'Jul 2026' / '5 Jul 2026'
String niceDate(String iso) {
  if (iso.isEmpty) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  final p = iso.split('-');
  if (p.length < 2) return iso;
  final m = int.tryParse(p[1]) ?? 1;
  final mon = months[(m - 1).clamp(0, 11)];
  return p.length >= 3 ? '${int.tryParse(p[2]) ?? p[2]} $mon ${p[0]}' : '$mon ${p[0]}';
}
