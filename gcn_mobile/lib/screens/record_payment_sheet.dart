import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';
import '../widgets.dart';
import '../format.dart';
import '../api/api.dart';
import '../api/models.dart';
import 'payment_receipt.dart';

const _payMethods = ['Cash', 'JazzCash', 'Bank', 'Other'];

Future<void> showRecordPaymentSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _RecordPaymentSheet(host: context),
  );
}

class _RecordPaymentSheet extends StatefulWidget {
  final BuildContext host;
  const _RecordPaymentSheet({required this.host});

  @override
  State<_RecordPaymentSheet> createState() => _RecordPaymentSheetState();
}

class _RecordPaymentSheetState extends State<_RecordPaymentSheet> {
  final _search = TextEditingController();
  final _amount = TextEditingController();
  late Future<List<Customer>> _customers;
  Customer? _selected;
  String _method = 'Cash';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _customers = api.customers();
  }

  @override
  void dispose() {
    _search.dispose();
    _amount.dispose();
    super.dispose();
  }

  List<Customer> _match(List<Customer> all) {
    final q = _search.text.trim().toLowerCase();
    final list = q.isEmpty ? all.where((c) => c.balance > 0) : all.where((c) => '${c.name} ${c.loginId}'.toLowerCase().contains(q));
    return list.take(20).toList();
  }

  void _pick(Customer c) {
    setState(() {
      _selected = c;
      if (c.balance > 0) _amount.text = c.balance.toString();
    });
    FocusScope.of(context).unfocus();
  }

  void _record() async {
    final amt = int.tryParse(_amount.text.trim()) ?? 0;
    if (_selected == null || amt <= 0) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await api.recordPayment(customerId: _selected!.id, amount: amt, method: _method);
      if (!mounted) return;
      final name = _selected!.name;
      final login = _selected!.loginId;
      final method = _method;
      Navigator.of(context).pop(); // close the entry sheet
      // Show the shareable receipt on the still-mounted host (shell) context.
      if (widget.host.mounted) {
        showPaymentReceipt(widget.host, name: name, loginId: login, amount: amt, method: method, recordedBy: api.user?.name ?? 'GCN');
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
    final amt = int.tryParse(_amount.text.trim()) ?? 0;
    final canSave = _selected != null && amt > 0;

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
              Container(width: 38, height: 38, decoration: BoxDecoration(color: GcnColors.emerald50, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.payments_rounded, color: GcnColors.emerald, size: 20)),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Record a payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: GcnColors.ink)),
                Text('Enter it the moment cash / JazzCash arrives', style: TextStyle(fontSize: 12, color: GcnColors.muted)),
              ])),
            ]),
            const SizedBox(height: 18),
            if (_selected == null)
              _picker()
            else
              _paymentForm(amt, canSave),
          ],
        ),
      ),
    );
  }

  Widget _picker() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const _Label('Customer'),
      TextField(
        controller: _search,
        autofocus: true,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(hintText: 'Search name, login ID…', prefixIcon: Icon(Icons.search, size: 20, color: GcnColors.muted)),
      ),
      const SizedBox(height: 8),
      FutureBuilder<List<Customer>>(
        future: _customers,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
          if (snap.hasError) return Padding(padding: const EdgeInsets.all(16), child: Text(snap.error.toString(), style: const TextStyle(color: GcnColors.red, fontSize: 13)));
          final matches = _match(snap.data!);
          if (matches.isEmpty) return const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No customers found.', style: TextStyle(color: GcnColors.muted))));
          return ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: matches.length,
              separatorBuilder: (_, _) => const Divider(height: 1, color: GcnColors.hairline),
              itemBuilder: (_, i) {
                final c = matches[i];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Avatar(initials(c.name), size: 36),
                  title: Text(c.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: GcnColors.ink)),
                  subtitle: Text(c.loginId, style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
                  trailing: Text(c.balance > 0 ? pkr(c.balance) : 'clear', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c.balance > 0 ? GcnColors.red : GcnColors.emerald)),
                  onTap: () => _pick(c),
                );
              },
            ),
          );
        },
      ),
    ]);
  }

  Widget _paymentForm(int amt, bool canSave) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: GcnColors.canvas, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          Avatar(initials(_selected!.name), size: 40),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_selected!.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GcnColors.ink)),
            Text('${_selected!.loginId} · owes ${pkr(_selected!.balance)}', style: const TextStyle(fontSize: 12, color: GcnColors.muted)),
          ])),
          TextButton(onPressed: () => setState(() { _selected = null; _amount.clear(); _search.clear(); _error = null; }), child: const Text('Change')),
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
          onPressed: canSave && !_saving ? _record : null,
          icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_rounded, size: 18),
          label: Text(canSave ? 'Record ${pkr(amt)}' : 'Record payment'),
        ),
      ),
    ]);
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
