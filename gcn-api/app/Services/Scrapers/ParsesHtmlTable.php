<?php

namespace App\Services\Scrapers;

trait ParsesHtmlTable
{
    /**
     * Return every <tr>'s cell texts from the largest <table> in the HTML.
     *
     * @return array<int, array<int, string>>
     */
    protected function tableRows(string $html): array
    {
        // largest table = the data table
        preg_match_all('/<table[\s\S]*?<\/table>/i', $html, $tables);
        $table = collect($tables[0] ?? [])->sortByDesc(fn ($t) => strlen($t))->first() ?? '';

        preg_match_all('/<tr[\s\S]*?<\/tr>/i', $table, $trs);
        $rows = [];
        foreach ($trs[0] ?? [] as $tr) {
            preg_match_all('/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i', $tr, $cells);
            $texts = array_map(
                fn ($c) => trim(html_entity_decode(preg_replace('/\s+/', ' ', strip_tags($c)))),
                $cells[1] ?? []
            );
            if ($texts) {
                $rows[] = $texts;
            }
        }

        return $rows;
    }
}
