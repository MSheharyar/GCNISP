<?php

namespace App\Support;

use App\Models\Dealer;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Resolves the letterhead branding for a dealer's PDF (invoice / quotation):
 * their own logo + business name + primary colour. Images are embedded as
 * base64 data URIs so DomPDF never has to fetch anything at render time.
 */
class PdfBranding
{
    /**
     * @return array{logoSrc: ?string, name: string, color: string, initial: string}
     */
    public static function resolve(array $org): array
    {
        $dealer = Tenant::id() ? Dealer::find(Tenant::id()) : null;
        $name = ($org['business_name'] ?? null) ?: ($dealer?->name ?? 'Invoice');
        $color = ($dealer && $dealer->primary_color) ? $dealer->primary_color : '#1651b8';
        $initial = mb_strtoupper(mb_substr(trim($name), 0, 1)) ?: 'G';

        return [
            'logoSrc' => self::logo($dealer),
            'name' => $name,
            'color' => $color,
            'initial' => $initial,
        ];
    }

    private static function logo(?Dealer $dealer): ?string
    {
        // 1) The dealer's own uploaded/linked logo.
        if ($dealer && $dealer->logo_url) {
            $data = self::fetch($dealer->logo_url);
            if ($data) {
                return $data;
            }
        }

        // 2) The bundled GCN mark — only for the original tenant (dealer #1).
        if (! $dealer || $dealer->id === 1) {
            $path = public_path('images/gcn-logo.png');
            if (is_file($path)) {
                return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
            }
        }

        // 3) None — the blade falls back to an initial-letter circle.
        return null;
    }

    private static function fetch(string $url): ?string
    {
        try {
            $res = Http::timeout(6)->get($url);
            if (! $res->ok()) {
                return null;
            }
            $ct = $res->header('Content-Type') ?: 'image/png';
            if (! str_starts_with($ct, 'image/')) {
                return null;
            }

            return 'data:'.$ct.';base64,'.base64_encode($res->body());
        } catch (Throwable $e) {
            return null;
        }
    }
}
