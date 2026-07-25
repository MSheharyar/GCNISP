import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';
import 'payment_receipt.dart';

/// TV-cable subscriber detail: balance, history, and door-to-door collection.
class CableDetailScreen extends StatefulWidget {
  final CableCustomer customer;
  const CableDetailScreen({super.key, required this.customer});

  @override
  State<CableDetailScreen> createState() => _CableDetailScreenState();
}

class _CableDetailScreenState extends State<CableDetailScreen> {
  late CableCustomer _c;
  late Future<List<LedgerEntry>> _ledger;

  @override
  void initState() {
    super.initState();
    _c = widget.customer;
    _ledger = api.cableLedger(_c.id);
  }

  Future<void> _refresh() async {
    final fresh = await api.cableCustomer(_c.id);
    final led = api.cableLedger(_c.id);
    if (!mounted) return;
    setState(() {
      _c = fresh;
      _ledger = led;
    });
    await led;
  }

  Future<void> _collect() async {
    final updated = await showCablePaymentSheet(context, _c);
    if (updated != null && mounted) {
      setState(() => _c = updated);
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = !(api.user?.isViewer ?? false);
    final title = _c.name?.isNotEmpty == true ? _c.name! : 'House ${_c.house}';
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GcnColors.surface,
        surfaceTintColor: GcnColors.surface,
        elevation: 0,
        foregroundColor: GcnColors.ink,
        title: const Text('Cable subscriber', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GcnColors.ink)),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: GcnColors.hairline)),
      ),
      floatingActionButton: canEdit && _c.status == 'active'
          ? FloatingActionButton.extended(
              onPressed: _collect,
              backgroundColor: GcnColors.emerald,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.payments_rounded, size: 20),
              label: const Text('Record payment', style: TextStyle(fontWeight: FontWeight.w600)),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            GcnCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Avatar(_c.name?.isNotEmpty == true ? initials(_c.name!) : _c.house, bg: GcnColors.violet50, fg: GcnColors.violet, size: 46),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                    const SizedBox(height: 2),
                    Text('House ${_c.house} · Sector ${_c.sector}', style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
                  ])),
                  Pill(_c.status.toUpperCase(), bg: _c.status == 'active' ? GcnColors.emerald50 : GcnColors.canvas, fg: _c.status == 'active' ? GcnColors.emerald : GcnColors.muted),
                ]),
                const SizedBox(height: 14),
                const Divider(height: 1, color: GcnColors.hairline),
                const SizedBox(height: 14),
                Row(children: [
                  _kv('Monthly fee', pkr(_c.monthlyFee)),
                  _kv('Balance', _c.balance > 0 ? pkr(_c.balance) : 'Clear', tone: _c.balance > 0 ? GcnColors.red : GcnColors.emerald),
                  _kv('Last paid', _c.lastPaidDate ?? '—'),
                ]),
              ]),
            ),
            const SizedBox(height: 18),
            const Padding(padding: EdgeInsets.only(left: 4, bottom: 8), child: Text('History', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink))),
            FutureBuilder<List<LedgerEntry>>(
              future: _ledger,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                if (snap.hasError) return ErrorRetry(message: snap.error.toString(), onRetry: _refresh);
                final rows = snap.data!.reversed.toList();
                if (rows.isEmpty) return const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: Text('No history yet.', style: TextStyle(color: GcnColors.muted))));
                return GcnCard(
                  padding: EdgeInsets.zero,
                  child: Column(children: [
                    for (var i = 0; i < rows.length; i++) ...[
                      if (i > 0) const Divider(height: 1, color: GcnColors.hairline, indent: 16, endIndent: 16),
                      _LedgerRow(rows[i]),
                    ],
                  ]),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v, {Color tone = GcnColors.ink}) {
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
        const SizedBox(height: 3),
        Text(v, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: tone)),
      ]),
    );
  }
}

class _LedgerRow extends StatelessWidget {
  final LedgerEntry e;
  const _LedgerRow(this.e);
  @override
  Widget build(BuildContext context) {
    final isPayment = e.credit > 0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(color: isPayment ? GcnColors.emerald50 : GcnColors.canvas, borderRadius: BorderRadius.circular(9)),
          child: Icon(isPayment ? Icons.south_west_rounded : Icons.north_east_rounded, size: 17, color: isPayment ? GcnColors.emerald : GcnColors.muted),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(e.label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: GcnColors.ink)),
          Text(e.date, style: const TextStyle(fontSize: 11.5, color: GcnColors.muted)),
        ])),
        Text((isPayment ? '- ' : '+ ') + pkr(isPayment ? e.credit : e.debit),
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: isPayment ? GcnColors.emerald : GcnColors.inkSoft)),
      ]),
    );
  }
}

// ── Cable payment sheet ──────────────────────────────────────────────────
const _payMethods = ['Cash', 'JazzCash', 'Bank', 'Other'];

/// Returns the updated subscriber when a payment was recorded, else null.
Future<CableCustomer?> showCablePaymentSheet(BuildContext context, CableCustomer c) {
  return showModalBottomSheet<CableCustomer>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _CablePaymentSheet(host: context, customer: c),
  );
}

class _CablePaymentSheet extends StatefulWidget {
  final BuildContext host;
  final CableCustomer customer;
  const _CablePaymentSheet({required this.host, required this.customer});

  @override
  State<_CablePaymentSheet> createState() => _CablePaymentSheetState();
}

class _CablePaymentSheetState extends State<_CablePaymentSheet> {
  late final TextEditingController _amount;
  String _method = 'Cash';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    // Prefill with what they owe, else a month's fee.
    final suggested = c.balance > 0 ? c.balance : c.monthlyFee;
    _amount = TextEditingController(text: suggested > 0 ? suggested.toString() : '');
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _record() async {
    final amt = int.tryParse(_amount.text.trim()) ?? 0;
    if (amt <= 0) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final updated = await api.recordCablePayment(cableId: widget.customer.id, amount: amt, label: 'Cable collection');
      if (!mounted) return;
      final c = widget.customer;
      final title = c.name?.isNotEmpty == true ? c.name! : 'House ${c.house}';
      final method = _method;
      Navigator.of(context).pop(updated); // close sheet, return fresh row
      if (widget.host.mounted) {
        showPaymentReceipt(
          widget.host,
          name: title,
          loginId: 'House ${c.house} · Sector ${c.sector}',
          referenceLabel: 'Address',
          amount: amt,
          method: method,
          recordedBy: api.user?.name ?? 'GCN',
          title: 'Cable payment received',
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final c = widget.customer;
    final amt = int.tryParse(_amount.text.trim()) ?? 0;
    final title = c.name?.isNotEmpty == true ? c.name! : 'House ${c.house}';

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(color: GcnColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: GcnColors.hairline, borderRadius: BorderRadius.circular(4)))),
            const SizedBox(height: 16),
            Row(children: [
              Container(width: 38, height: 38, decoration: BoxDecoration(color: GcnColors.violet50, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.tv_rounded, color: GcnColors.violet, size: 20)),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Cable collection', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                Text('Record it the moment you collect', style: TextStyle(fontSize: 12, color: GcnColors.muted)),
              ])),
            ]),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                Avatar(c.name?.isNotEmpty == true ? initials(c.name!) : c.house, bg: GcnColors.violet50, fg: GcnColors.violet, size: 40),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                  Text('House ${c.house} · ${c.balance > 0 ? 'owes ${pkr(c.balance)}' : 'clear'}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
                ])),
              ]),
            ),
            const SizedBox(height: 16),
            const _Label('Amount received'),
            TextField(
              controller: _amount,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: GcnColors.ink),
              decoration: const InputDecoration(prefixText: 'Rs  ', prefixStyle: TextStyle(fontSize: 16, color: GcnColors.muted), hintText: '0'),
            ),
            const SizedBox(height: 16),
            const _Label('Method'),
            Wrap(spacing: 8, children: [
              for (final m in _payMethods)
                ChoiceChip(
                  label: Text(m),
                  selected: _method == m,
                  onSelected: (_) => setState(() => _method = m),
                  showCheckmark: false,
                  labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _method == m ? GcnColors.brand : GcnColors.inkSoft),
                  backgroundColor: GcnColors.surface,
                  selectedColor: GcnColors.brand50,
                  side: BorderSide(color: _method == m ? GcnColors.brand100 : GcnColors.hairline),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(color: GcnColors.red50, borderRadius: BorderRadius.circular(10)),
                child: Text(_error!, style: const TextStyle(fontSize: 12.5, color: GcnColors.red)),
              ),
            ],
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: amt > 0 && !_saving ? _record : null,
                icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_rounded, size: 18),
                label: Text(amt > 0 ? 'Record ${pkr(amt)}' : 'Record payment'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6, left: 2),
        child: Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: GcnColors.inkSoft)),
      );
}
