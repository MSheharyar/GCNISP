import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../theme.dart';
import '../format.dart';

Future<void> showPaymentReceipt(
  BuildContext context, {
  required String name,
  required String loginId,
  required int amount,
  required String method,
  required String recordedBy,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _ReceiptSheet(name: name, loginId: loginId, amount: amount, method: method, recordedBy: recordedBy),
  );
}

class _ReceiptSheet extends StatefulWidget {
  final String name, loginId, method, recordedBy;
  final int amount;
  const _ReceiptSheet({required this.name, required this.loginId, required this.amount, required this.method, required this.recordedBy});

  @override
  State<_ReceiptSheet> createState() => _ReceiptSheetState();
}

class _ReceiptSheetState extends State<_ReceiptSheet> {
  final _boundaryKey = GlobalKey();
  bool _sharing = false;

  Future<void> _share() async {
    setState(() => _sharing = true);
    try {
      final boundary = _boundaryKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 3);
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer.asUint8List();
      final file = XFile.fromData(bytes, name: 'gcn-receipt.png', mimeType: 'image/png');
      final text = 'GCN payment receipt — ${pkr(widget.amount)} received from ${widget.name} (${widget.method}).';
      await Share.shareXFiles([file], text: text);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: GcnColors.red, content: Text('Could not share: $e')));
      }
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateFormat('d MMM yyyy · hh:mm a').format(DateTime.now());
    return Container(
      decoration: const BoxDecoration(color: GcnColors.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: GcnColors.hairline, borderRadius: BorderRadius.circular(4)))),
          const SizedBox(height: 18),
          // ── The capturable receipt ──
          RepaintBoundary(
            key: _boundaryKey,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: GcnColors.hairline)),
              child: Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(width: 34, height: 34, clipBehavior: Clip.antiAlias, decoration: BoxDecoration(borderRadius: BorderRadius.circular(9)), child: Image.asset('assets/gcn_logo.png', fit: BoxFit.cover)),
                    const SizedBox(width: 10),
                    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('GCN', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: GcnColors.ink, letterSpacing: 0.5)),
                      Text('GLOBAL CABLE NETWORK', style: TextStyle(fontSize: 8, color: GcnColors.muted, letterSpacing: 1.2)),
                    ]),
                  ]),
                  const SizedBox(height: 18),
                  Container(width: 52, height: 52, decoration: const BoxDecoration(color: GcnColors.emerald50, shape: BoxShape.circle), child: const Icon(Icons.check_rounded, color: GcnColors.emerald, size: 30)),
                  const SizedBox(height: 12),
                  const Text('Payment received', style: TextStyle(fontSize: 14, color: GcnColors.muted, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(pkr(widget.amount), style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: GcnColors.emerald)),
                  const SizedBox(height: 18),
                  const Divider(color: GcnColors.hairline),
                  const SizedBox(height: 8),
                  _row('Customer', widget.name),
                  _row('Login ID', widget.loginId),
                  _row('Method', widget.method),
                  _row('Date', now),
                  _row('Received by', widget.recordedBy),
                  const SizedBox(height: 12),
                  const Divider(color: GcnColors.hairline),
                  const SizedBox(height: 10),
                  const Text('Thank you — GCN', style: TextStyle(fontSize: 11.5, color: GcnColors.muted)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(foregroundColor: GcnColors.inkSoft, side: const BorderSide(color: GcnColors.hairline), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Done'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: FilledButton.icon(
                onPressed: _sharing ? null : _share,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)), // WhatsApp green
                icon: _sharing ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.share_rounded, size: 18),
                label: const Text('Share on WhatsApp'),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(k, style: const TextStyle(fontSize: 12.5, color: GcnColors.muted)),
          Flexible(child: Text(v, textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GcnColors.ink))),
        ]),
      );
}
