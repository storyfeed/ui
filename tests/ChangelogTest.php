<?php

// Hosts that customised a copied kit merge only the files each release lists (since v0.16.2).
it('lists the copied files changed in every release from v0.16.2', function () {
    $changelog = file_get_contents(__DIR__.'/../CHANGELOG.md');
    preg_match_all('/^## (v\d+\.\d+\.\d+)[^\n]*\n(.*?)(?=^## |\z)/ms', $changelog, $releases, PREG_SET_ORDER);

    $checked = 0;
    foreach ($releases as [, $tag, $body]) {
        if (version_compare(ltrim($tag, 'v'), '0.16.2', '<')) {
            continue;
        }
        expect($body, "{$tag} lists its copied files")->toContain('### Copied files changed');
        $checked++;
    }
    expect($checked)->toBeGreaterThanOrEqual(6);
});
