<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; color: #1f2733; font-size: 12px; }
  .wrap { padding: 36px 40px; }
  table { width: 100%; border-collapse: collapse; }

  .head td { vertical-align: middle; }
  .brand-mark {
    width: 38px; height: 38px; border-radius: 19px;
    background: #1651b8; color: #fff; text-align: center;
    font-size: 18px; font-weight: bold; line-height: 38px;
  }
  .brand-name { font-family: 'Times New Roman', serif; font-size: 17px; font-weight: bold; letter-spacing: 2px; color: #0f1725; }
  .brand-sub { font-family: 'Times New Roman', serif; font-size: 9px; letter-spacing: 3px; color: #6b7280; }
  .org { text-align: right; font-size: 11px; color: #5b6472; }
  .org b { color: #1f2733; }
  .rule { border-bottom: 2px solid #1651b8; margin: 14px 0 0; }

  .title { font-size: 22px; font-weight: bold; color: #0f1725; letter-spacing: 1px; margin: 22px 0 16px; }

  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #98a1ae; }
  .meta td { padding: 2px 0; }
  .meta .k { color: #98a1ae; padding-right: 14px; }
  .meta .v { color: #1f2733; font-weight: bold; text-align: right; }

  .items { margin-top: 22px; }
  .items th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #98a1ae; border-bottom: 1px solid #cfd5dd; padding: 8px 6px; }
  .items td { padding: 10px 6px; border-bottom: 1px solid #edf0f3; }
  .r { text-align: right; }
  .c { text-align: center; }

  .totrow td { padding: 6px; }
  .totrow .lbl { text-align: right; color: #5b6472; }
  .totrow .amt { text-align: right; width: 120px; }
  .grand { font-size: 15px; font-weight: bold; color: #0f1725; border-top: 2px solid #cfd5dd; }

  .pay { margin-top: 26px; background: #f6f7f9; border-radius: 6px; padding: 12px 14px; font-size: 11px; color: #5b6472; }
  .pay b { color: #1f2733; }
  .notes { margin-top: 16px; font-size: 11px; color: #5b6472; }
  .notes b { color: #1f2733; }
  .terms { margin-top: 18px; font-size: 10px; color: #98a1ae; }
  .foot { margin-top: 30px; border-top: 1px solid #edf0f3; padding-top: 12px; text-align: center; font-size: 10px; color: #98a1ae; }
</style>
</head>
<body>
<div class="wrap">

  <table class="head">
    <tr>
      <td style="width: 48px;"><div class="brand-mark">G</div></td>
      <td>
        <div class="brand-name">GLOBAL</div>
        <div class="brand-sub">CABLE NETWORK</div>
      </td>
      <td class="org">
        <b>{{ $org['business_name'] ?? '' }}</b><br>
        {{ $org['office_address'] ?? '' }}<br>
        {{ $org['office_contact1'] ?? '' }} · {{ $org['office_contact2'] ?? '' }}
      </td>
    </tr>
  </table>
  <div class="rule"></div>

  <div class="title">QUOTATION</div>

  <table>
    <tr>
      <td style="vertical-align: top;">
        <div class="label">Prepared for</div>
        @if($customer)
          <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">{{ $customer->company_name ?: $customer->name }}</div>
          <div style="color: #5b6472; max-width: 260px; margin-top: 2px;">{{ $customer->billing_address }}</div>
          @if($customer->company_name)<div style="color: #5b6472;">Attn: {{ $customer->name }}</div>@endif
          @if($customer->phone)<div style="color: #5b6472;">{{ $customer->phone }}</div>@endif
        @else
          <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">{{ $quotation->recipient_name }}</div>
          @if($quotation->recipient_address)<div style="color: #5b6472; max-width: 260px; margin-top: 2px;">{{ $quotation->recipient_address }}</div>@endif
          @if($quotation->recipient_phone)<div style="color: #5b6472;">{{ $quotation->recipient_phone }}</div>@endif
        @endif
      </td>
      <td style="width: 240px; vertical-align: top;">
        <table class="meta">
          <tr><td class="k">Quotation #</td><td class="v">{{ $quotation->invoice_no }}</td></tr>
          <tr><td class="k">Issue date</td><td class="v">{{ $quotation->issue_date->format('d M Y') }}</td></tr>
          @if($quotation->valid_until)
          <tr><td class="k">Valid until</td><td class="v">{{ $quotation->valid_until->format('d M Y') }}</td></tr>
          @endif
        </table>
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="c" style="width: 80px;">Qty</th>
        <th class="r" style="width: 90px;">Unit price</th>
        <th class="r" style="width: 100px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      @foreach($quotation->line_items as $li)
      <tr>
        <td>{{ $li['description'] }}</td>
        <td class="c">{{ rtrim(rtrim(number_format($li['qty'], 2), '0'), '.') }}@if(!empty($li['unit'])) {{ $li['unit'] }}@endif</td>
        <td class="r">Rs {{ number_format($li['unitPrice']) }}</td>
        <td class="r">Rs {{ number_format($li['qty'] * $li['unitPrice']) }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  <table style="margin-top: 8px;">
    <tr class="totrow">
      <td></td>
      <td style="width: 220px;">
        <table>
          <tr class="totrow"><td class="lbl">Subtotal</td><td class="amt">Rs {{ number_format($quotation->total_amount) }}</td></tr>
          <tr class="totrow grand"><td class="lbl">Total</td><td class="amt">Rs {{ number_format($quotation->total_amount) }}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  @if($quotation->notes)
  <div class="notes"><b>Notes</b><br>{!! nl2br(e($quotation->notes)) !!}</div>
  @endif

  <div class="pay">
    <b>Payment details</b><br>
    JazzCash — <b>{{ $org['jazzcash_title'] ?? '' }}</b> · {{ $org['jazzcash_number'] ?? '' }}<br>
    <span style="color:#98a1ae;">Connection: {{ $org['connection_tech'] ?? '' }}</span>
  </div>

  <div class="terms">
    This is a quotation, not an invoice. Prices are an estimate and final charges may vary with site requirements.@if($quotation->valid_until) Valid until {{ $quotation->valid_until->format('d M Y') }}.@endif
  </div>

  <div class="foot">
    {{ $org['business_name'] ?? '' }} · {{ $org['office_contact1'] ?? '' }} · {{ $org['office_contact2'] ?? '' }} · {{ $org['office_address'] ?? '' }}
  </div>

</div>
</body>
</html>
