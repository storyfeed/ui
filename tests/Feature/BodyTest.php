<?php

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Str;
use Storyfeed\Body\CallToAction;
use Storyfeed\Body\Component;
use Storyfeed\Body\Excerpt;
use Storyfeed\Body\FileAttachment;
use Storyfeed\Body\Image;
use Storyfeed\Body\ItemList;
use Storyfeed\Body\KeyValue;
use Storyfeed\Body\MediaObject;
use Storyfeed\Body\Prose;
use Storyfeed\Body\Table;
use Storyfeed\Contracts\FeedBody;
use Storyfeed\DeferredMedia;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedResource;
use Storyfeed\MediaSlot;
use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;
use Storyfeed\Ui\Support\Links;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * Each of core's body types, recorded on a real entity snapshot and read back
 * through core, drawn under the activity's headline.
 */

/** Publish one activity whose object carries these bodies, and render the feed. */
function render_bodies(FeedBody|iterable $body): string
{
    Order::$body = $body;

    Story::for(Order::class)->verb('place')->headline(':actor placed :object');
    Storyfeed::activity('place', Order::create(['number' => '1042']))
        ->by(User::create(['name' => 'Dana', 'email' => 'dana@example.com']))
        ->publish();

    return render_feed();
}

it('draws a key-value body as labelled rows', function () {
    $html = render_bodies(KeyValue::make([
        'Pickup' => '12:10 pm',
        'Paid' => true,
        'Reference' => KeyValue::verbatim('ORD-1042'),
        'Table' => KeyValue::placeholder(null, 'not seated'),
        'Notes' => null,
    ], title: 'Order #1042'));

    expect($html)->toContain(
        '<div data-storyfeed-body> <figure> <figcaption>Order #1042</figcaption> <dl> '
        .'<div> <dt>Pickup</dt> <dd><span>12:10 pm</span></dd> </div> '
        .'<div> <dt>Paid</dt> <dd><span>Yes</span></dd> </div> '
        .'<div> <dt>Reference</dt> <dd title="ORD-1042">ORD-1042</dd> </div> '
        .'<div> <dt>Table</dt> <dd><span>not seated</span></dd> </div> '
        .'</dl> </figure> </div>'
    )->not->toContain('Notes');
});

it('draws an excerpt with where it came from', function () {
    expect(render_bodies(Excerpt::make('Please leave it at the door', from: 'Delivery note')))->toContain(
        '<figure> <blockquote>Please leave it at the door<span aria-hidden="true">…</span></blockquote> '
        .'<figcaption>Delivery note</figcaption> </figure>'
    );
});

it('renders Markdown formatting and strips raw HTML and unsafe links', function () {
    $html = render_bodies(Prose::markdown("**Rush** [Order](/orders/1042)\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)", title: 'Note'));

    expect($html)->toContain('<figcaption>Note</figcaption>', '<strong>Rush</strong>', '<a href="/orders/1042">Order</a>')
        ->not->toContain('<script', 'alert(1)', 'javascript:');
});

it('sanitizes HTML while retaining safe formatting and relative links', function () {
    $html = render_bodies(Prose::html('<p onclick="alert(1)"><strong>Ready</strong> <a href="/orders/1042">Order</a></p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Bad</a><iframe src="https://example.com"></iframe><svg onload="alert(1)"></svg>'));

    expect($html)->toContain('<strong>Ready</strong>', '<a href="/orders/1042">Order</a>')
        ->not->toContain('<script', 'onclick', 'onerror', 'javascript:', '<iframe', '<svg onload');
});

it('keeps plain text and unknown encodings escaped', function () {
    foreach (['text/plain', 'application/x-unknown'] as $mediaType) {
        $html = render_blade('<x-storyfeed::body.prose :body="$body" />', [
            'body' => ['content' => "**Rush** <script>alert(1)</script>\nSecond line", 'mediaType' => $mediaType, 'title' => '<Note>'],
        ]);

        expect($html)->toContain('<figcaption>&lt;Note&gt;</figcaption>', '<p>**Rush** &lt;script&gt;alert(1)&lt;/script&gt; Second line</p>')
            ->not->toContain('<script>', '<strong>');
    }
});

it('preserves exact source whitespace and escapes verbatim regardless of encoding', function () {
    $source = "<b>**literal**</b>\n    indented\n\nlast line";

    foreach (['text/plain', 'text/markdown', 'text/html'] as $mediaType) {
        $html = Blade::render('<x-storyfeed::body.prose :body="$body" />', [
            'body' => ['content' => $source, 'mediaType' => $mediaType, 'verbatim' => true],
        ]);

        expect($html)->toContain('<code>'.e($source).'</code></pre>')
            ->not->toContain('<b>', '<strong>');
    }
});

it('keeps long rich text instead of silently truncating it', function () {
    $source = '<p>'.str_repeat('Keep this text. ', 1500).'The end.</p>';

    expect(render_bodies(Prose::html($source)))->toContain('The end.</p>');
});

it('reads a slim excerpt: from v2 an absent truncated flag means truncated', function () {
    $render = fn (array $body) => render_blade('<x-storyfeed::body.excerpt :body="$body" />', ['body' => $body]);

    expect($render(['$v' => 2, 'text' => 'Part']))->toContain('<blockquote>Part<span aria-hidden="true">…</span></blockquote>')
        ->and($render(['$v' => 2, 'text' => 'Whole', 'truncated' => false]))->toContain('<blockquote>Whole</blockquote>')
        ->and($render(['$v' => 1, 'text' => 'Hand-written']))->toContain('<blockquote>Hand-written</blockquote>')
        ->and($render(['text' => 'Unversioned']))->toContain('<blockquote>Unversioned</blockquote>');
});

it('escapes excerpt text and source and only marks truncated passages', function () {
    expect(render_blade('<x-storyfeed::body.excerpt :body="$body" />', [
        'body' => ['text' => '<b>Quoted</b>', 'from' => '<Source>', 'truncated' => false],
    ]))->toContain('<blockquote>&lt;b&gt;Quoted&lt;/b&gt;</blockquote>', '<figcaption>&lt;Source&gt;</figcaption>')
        ->not->toContain('…');
});

it('draws file metadata including its owning entity label', function () {
    expect(render_bodies([FileAttachment::make(2_516_582, 'application/pdf', 'invoice.pdf'), FileAttachment::make(512, name: 'Order #1042')]))
        ->toContain('<p>invoice.pdf PDF · 2.5 MB</p>', '<p>Order #1042 512 bytes</p>');
});

it('escapes file names and ignores stored URLs', function () {
    expect(render_blade('<x-storyfeed::body.file-attachment :body="$body" />', [
        'body' => ['name' => '<invoice>.pdf', 'href' => '/not-from-the-body'],
    ]))->toContain('<p>&lt;invoice&gt;.pdf</p>')->not->toContain('<a', '/not-from-the-body');
});

it('shows zero-byte files and omits an empty file form', function () {
    expect(render_blade('<x-storyfeed::body.file-attachment :body="$body" />', ['body' => ['size' => 0]]))
        ->toContain('<p>0 bytes</p>')
        ->and(render_blade('<x-storyfeed::body.file-attachment :body="[]" />'))->toBe('');
});

it('draws an item list, numbered when ordered, with what was not sent', function () {
    $html = render_bodies(ItemList::ordered(['Margherita', FeedLink::make('Tiramisu', '/menu/tiramisu')], title: 'Items', totalItems: 5, more: FeedLink::make('See all', '/orders/1042')));

    expect($html)->toContain(
        '<figure> <figcaption>Items</figcaption> <div> <ol> '
        .'<li> Margherita </li> <li> <a href="/menu/tiramisu">Tiramisu</a> </li> </ol> </div> '
        .'<figcaption> <span>and 3 more</span> <a href="/orders/1042">See all</a> </figcaption> </figure>'
    );
});

it('draws rich prose and lists inside Typography prose at the feed\'s size', function () {
    foreach (['prose' => ['content' => '- One', 'mediaType' => 'text/markdown'], 'item-list' => ['items' => ['One']]] as $component => $body) {
        expect(Blade::render("<x-storyfeed::body.{$component} :body=\"\$body\" />", ['body' => $body]))
            ->toMatch('/class="[^"]*\bprose max-w-none text-\[length:inherit\][^"]*"/')
            ->not->toMatch('/\bprose-(sm|base|lg|xl|2xl)\b/');
    }
});

it('keeps a card picture\'s shape: clamped declared ratio, whole when undeclared, square icon', function () {
    $draw = fn (string $slot, array $image) => Blade::render('<x-storyfeed::body.media-object :body="$body" :entity="$entity" />', [
        'body' => ['$v' => 2, 'subject' => 'Post', 'image' => $slot],
        'entity' => Entity::of(['label' => 'Post', 'media' => [$slot => ['src' => '/p', ...$image]]]),
    ]);
    $frame = fn (string $html): array => preg_match('/<div class="(sf-media-object__image[^"]*)"(?:\s+style="([^"]*)")?/', $html, $m) === 1 ? [$m[1], $m[2] ?? null] : [];

    foreach ([[[1200, 630], '1.9048'], [[800, 800], '1'], [[600, 1200], '1'], [[3000, 1000], '2']] as [[$width, $height], $ratio]) {
        [$classes, $style] = $frame($draw('preview', ['width' => $width, 'height' => $height]));
        expect($classes)->toContain('h-16')->and($style)->toBe("--sf-picture-ratio: {$ratio}");
    }

    $free = $draw('preview', []);
    expect($frame($free)[0])->toContain('w-24')->and($free)->toContain('[&amp;_img]:object-contain!');
    expect($frame($draw('icon', ['width' => 1200, 'height' => 630])))->toBe(['sf-media-object__image w-16 flex-none', null]);
});

it('draws a media object with the entity\'s current picture, once', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg', width: 800, height: 600, alt: 'The order');

    $html = render_bodies(MediaObject::make(
        subject: 'Dinner for two',
        content: 'Two pizzas and a dessert.',
        footnote: FeedLink::make('Receipt', '/receipts/1042'),
    )->image(MediaSlot::Preview)->withFiles(FeedResource::make('/files/menu.pdf', mediaType: 'application/pdf', name: 'menu.pdf')));

    expect($html)->toContain('src="/img/1042.jpg"', 'width="800"', 'height="600"', 'Dinner for two', 'Two pizzas and a dessert.', 'href="/files/menu.pdf"', 'href="/receipts/1042"')
        ->and(substr_count($html, '/img/1042.jpg'))->toBe(1);
});

it('draws a linked card title without a picture or optional sections', function () {
    $html = render_bodies(MediaObject::make(subject: FeedLink::make('Order #1042', '/orders/1042'), content: 'Dinner'));

    expect($html)
        ->toContain('<div> <div> <p> <a href="/orders/1042">Order #1042</a> </p>')
        ->not->toContain('<img', '<ul', '/receipts/');
});

it('draws no object picture when no body asks for it', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg');

    expect(render_bodies([]))->not->toContain('/img/1042.jpg');
});

it('draws nothing for a body type it has no component for', function () {
    $html = render_bodies([Component::make('order-card', ['id' => 1042]), Excerpt::make('Kept')]);

    expect($html)
        ->toContain('Kept')
        ->not->toContain('order-card')
        ->and(substr_count($html, 'data-storyfeed-body'))->toBe(1);
});

it('draws nothing for a malformed or app-owned body, and an app can add a component for one', function () {
    $item = FeedItem::of(['kind' => 'activity', 'object' => ['type' => 'order', 'body' => [
        ['$body' => 'Acme/Attachment', '$v' => 1, 'name' => 'plan.pdf'],
        ['$body' => '../../etc/passwd'],
        ['no-type' => true],
        'not an array',
    ]]]);

    $render = fn () => render_blade('<x-storyfeed::activity :activity="$item" />', ['item' => $item]);

    expect($render())->not->toContain('data-storyfeed-body');

    $views = sys_get_temp_dir().'/storyfeed-ui-'.uniqid();
    mkdir("{$views}/components/body/acme", recursive: true);
    file_put_contents("{$views}/components/body/acme/attachment.blade.php", '@props([\'body\', \'entity\' => null])<p>{{ $body[\'name\'] }}</p>');
    app('view')->prependNamespace('storyfeed', $views);

    expect($render())->toContain('<div data-storyfeed-body> <p>plan.pdf</p> </div>')
        ->and(substr_count($render(), 'data-storyfeed-body'))->toBe(1);
});

it('draws a body\'s escaped fallback line when its type has no view, and the view when it has one', function () {
    $render = fn (array $body) => render_blade('<x-storyfeed::body :body="$body" />', ['body' => $body]);

    expect($render(['$body' => 'Acme/Invoice', '$fallback' => '<b>Invoice</b> due']))
        ->toBe('<div data-storyfeed-body> <p>&lt;b&gt;Invoice&lt;/b&gt; due</p> </div>')
        ->and($render(['$body' => '../../etc/passwd', '$fallback' => 'Still a line']))->toContain('<p>Still a line</p>');

    foreach ([null, '', '   ', 42, ['text' => 'x']] as $fallback) {
        expect($render(['$body' => 'Acme/Invoice', '$fallback' => $fallback]))->toBe('');
    }

    // A core type keeps its own view, even when it draws nothing.
    expect($render(['$body' => 'Storyfeed/Body/Prose', 'content' => '', '$fallback' => 'Fallback']))->toBe('');

    $views = sys_get_temp_dir().'/storyfeed-ui-'.uniqid();
    mkdir("{$views}/components/body/acme", recursive: true);
    file_put_contents("{$views}/components/body/acme/invoice.blade.php", '@props([\'body\', \'entity\' => null])<em>Drawn</em>');
    app('view')->prependNamespace('storyfeed', $views);

    expect($render(['$body' => 'Acme/Invoice', '$fallback' => 'Fallback']))->toBe('<div data-storyfeed-body> <em>Drawn</em> </div>');
});

it('draws a table inside Typography prose, with footer rows in a tfoot and plain cells that keep their line breaks', function () {
    $body = ['$body' => 'Storyfeed/Body/Table', '$v' => 1, 'title' => 'Order <1042>', 'headers' => ['Item', 'Price'],
        'rows' => [["Delivery to\n12 Harbour Street", '<b>$0</b>'], [['label' => 'Seats', 'href' => '/seats'], null], [['label' => 'Owned', 'href' => null]], 'not a row'],
        'footer' => [['Total', 49.5]]];
    $html = Blade::render('<x-storyfeed::body.table :body="$body" :entity="$entity" />', ['body' => $body, 'entity' => Entity::of(['label' => 'Order', 'url' => '/orders/1', 'link' => ['href' => '/orders/1']])]);

    expect($html)->toMatch('/class="sf-table__prose [^"]*\bprose max-w-none text-\[length:inherit\][^"]*\[&_:is\(th,td\)\]:whitespace-pre-line/')
        ->and(structural_html($html))->toContain(
            '<figcaption>Order &lt;1042&gt;</figcaption>',
            '<thead><tr><th>Item</th><th>Price</th></tr></thead>',
            '<tr><td>Delivery to 12 Harbour Street</td><td>&lt;b&gt;$0&lt;/b&gt;</td></tr>',
            '<tr><td><a href="/seats">Seats</a></td><td><span>—</span></td></tr>',
            '<tr><td><a href="/orders/1">Owned</a></td><td><span>—</span></td></tr>',
            '<tfoot> <tr><td>Total</td><td>49.5</td></tr> </tfoot>',
        )
        ->and($html)->toContain("Delivery to\n12 Harbour Street");

    // Slim: no title, headers or footer; nothing drawn without rows.
    expect(structural_html(Blade::render('<x-storyfeed::body.table :body="$body" />', ['body' => ['rows' => [['a', 'b'], ['c']]]])))
        ->toContain('<tbody> <tr><td>a</td><td>b</td></tr> <tr><td>c</td><td><span>—</span></td></tr> </tbody>')
        ->not->toContain('<thead', '<tfoot', '<figcaption')
        ->and(Blade::render('<x-storyfeed::body.table :body="$body" />', ['body' => ['headers' => ['A']]]))->toBe('');
});

it('draws core\'s Table body through the feed', function () {
    if (! class_exists(Table::class)) {
        $this->markTestSkipped('This core has no Table body.');
    }

    $html = render_bodies(Table::make(['Item', 'Price'])->title('Receipt')->row(['Seats', '$40.00'])->footer(['Total', '$49.00']));

    expect($html)->toContain('<figcaption>Receipt</figcaption>', '<thead><tr><th>Item</th><th>Price</th></tr></thead>', '<tr><td>Seats</td><td>$40.00</td></tr>', '<tr><td>Total</td><td>$49.00</td></tr>');
});

it('draws a call to action as a plain link button, with safe attributes and its entity as the default target', function () {
    $render = fn (array $body) => Blade::render('<x-storyfeed::body.call-to-action :body="$body" :entity="$entity" />', ['body' => $body, 'entity' => Entity::of(['label' => 'Roadmap', 'url' => '/roadmap', 'link' => ['href' => '/roadmap']])]);
    $action = fn (?string $href, array $attributes = [], bool $modal = false) => ['label' => 'See <it>', 'link' => ['href' => $href, 'modal' => $modal, 'attributes' => $attributes]];

    expect(structural_html($render(['subject' => 'The countdown', 'content' => 'Five milestones.', 'action' => $action('/next', ['target' => '_blank', 'onclick' => 'x'], true)])))
        ->toBe('<div> <p>The countdown</p> <p>Five milestones.</p> <a href="/next" target="_blank">See &lt;it&gt;<span aria-hidden="true">→</span></a> </div>')
        ->and(structural_html($render(['action' => $action('/next')])))->toBe('<a href="/next">See &lt;it&gt;<span aria-hidden="true">→</span></a>')
        ->and(structural_html($render(['content' => 'Mine', 'action' => $action(null)])))->toContain('<a href="/roadmap">')
        ->and(structural_html($render(['subject' => 'Heading', 'action' => ['link' => ['href' => '/x']]])))->toBe('<div> <p>Heading</p> </div>')
        ->and($render(['action' => ['label' => 'No link']]))->toBe('')
        ->and($render([]))->toBe('');
});

it('draws core\'s CallToAction body through the feed', function () {
    if (! class_exists(CallToAction::class)) {
        $this->markTestSkipped('This core has no CallToAction body.');
    }

    expect(render_bodies(CallToAction::make(subject: 'The countdown to 1.0')->action('See the roadmap', '/roadmap')))
        ->toContain('<p>The countdown to 1.0</p>', '<a href="/roadmap">See the roadmap<span aria-hidden="true">→</span></a>');
});

it('reads links in core 0.17\'s shape and core 0.16\'s', function () {
    $new = Entity::of(['label' => 'Order', 'link' => ['href' => '/orders/1', 'modal' => true, 'attributes' => ['target' => '_blank', 'onclick' => 'x']]]);
    $old = Entity::of(['label' => 'Order', 'url' => '/orders/1', 'modal' => true, 'attributes' => ['target' => '_blank', 'onclick' => 'x']]);

    foreach ([$new, $old] as $entity) {
        expect(Links::entity($entity))->toBe(['href' => '/orders/1', 'modal' => true, 'attributes' => ['target' => '_blank']])
            ->and(trim(view('storyfeed::entity', ['entity' => $entity])->render()))->toContain('target="_blank"', 'href="/orders/1"')->not->toContain('onclick')
            // A body link without an href is the entity's own, adding its attributes; one with an href stands alone.
            ->and(Links::body(['label' => 'Own', 'href' => null, 'modal' => false, 'attributes' => ['rel' => 'x']], $entity))
            ->toBe(['href' => '/orders/1', 'modal' => true, 'attributes' => ['target' => '_blank', 'rel' => 'x']])
            ->and(Links::body(['label' => 'There', 'href' => '/there'], $entity))->toBe(['href' => '/there', 'modal' => false, 'attributes' => []]);
    }

    expect(Links::entity(Entity::of(['label' => 'Gone', 'link' => null])))->toBeNull()
        ->and(Links::entity(Entity::of(['label' => 'Gone', 'link' => ['href' => '/x'], 'tombstone' => ['formerType' => 'order']])))->toBeNull()
        ->and(Links::body(['label' => 'Own', 'href' => null], Entity::of(['label' => 'Unlinked'])))->toBeNull()
        ->and(Links::body('not a link', $new))->toBeNull();
});

it('never caps flowing text; only code and verbatim blocks scroll at --sf-prose-max-h', function () {
    $render = fn (string $component, array $body) => Blade::render("<x-storyfeed::body.{$component} :body=\"\$body\" />", ['body' => $body]);
    $cap = 'max-h-[var(--sf-prose-max-h,--spacing(96))]';

    expect($render('prose', ['content' => 'code', 'verbatim' => true]))->toContain('sf-verbatim m-0 '.$cap.' overflow-auto')
        ->and($render('prose', ['content' => '**Rich**', 'mediaType' => 'text/markdown']))->toContain('[&_pre]:'.$cap)->not->toContain('sf-rich-text '.$cap)
        ->and($render('prose', ['content' => 'Plain']))->not->toContain($cap)
        ->and($render('table', ['rows' => [['a']]]))->not->toContain($cap)->toContain('overflow-x-auto');
});

it('honours a body\'s maximum height in its wrapper: a length caps any body, none lifts the block cap too', function () {
    $render = fn (array $body) => Blade::render('<x-storyfeed::body :body="$body" />', ['body' => $body]);
    $list = ['$body' => 'Storyfeed/Body/ItemList', 'items' => ['One']];
    $prose = ['$body' => 'Storyfeed/Body/Prose', 'content' => 'Words'];

    expect($render($list))->not->toContain('style=', 'max-h-(--sf-body-max-h)')
        ->and($render([...$prose, '$meta' => ['maxHeight' => '10rem']]))->toContain('style="--sf-prose-max-h: none; --sf-body-max-h: 10rem"', 'max-h-(--sf-body-max-h) overflow-y-auto', 'tabindex="0"')
        ->and($render([...$list, '$meta' => ['maxHeight' => '6rem']]))->toContain('--sf-body-max-h: 6rem', 'overflow-y-auto')
        ->and($render([...$prose, '$meta' => ['maxHeight' => 'none']]))->toContain('style="--sf-prose-max-h: none"')->not->toContain('overflow-y-auto')
        // Other `$meta` keys are ignored, and a top-level key is not the bucket.
        ->and($render([...$list, '$meta' => ['maxHeight' => '8rem', 'other' => 'x']]))->toContain('--sf-body-max-h: 8rem')->not->toContain('other')
        ->and($render([...$list, '$maxHeight' => '6rem']))->not->toContain('style=')
        ->and($render([...$prose, '$meta' => ['other' => 'x']]))->not->toContain('style=');

    foreach (['10rem;background:red', 'expression(alert(1))', 'NONE', '', 42] as $invalid) {
        expect($render([...$prose, '$meta' => ['maxHeight' => $invalid]]))->not->toContain('style=');
    }
});

it('honours core\'s FeedBody::maxHeight() through the feed', function () {
    if (! method_exists(Prose::class, 'maxHeight')) {
        $this->markTestSkipped('This core has no FeedBody::maxHeight().');
    }

    expect(render_bodies(Prose::make('Show it all')->maxHeight('none')))->toContain('style="--sf-prose-max-h: none"');
});

it('renders an unordered item list with plain list semantics', function () {
    expect(render_bodies(ItemList::make(['Margherita', 'Tiramisu'])))
        ->toContain('<ul> <li> Margherita </li> <li> Tiramisu </li> </ul>')
        ->not->toContain('<ol>');
});

it('renders stored File, KeyValue v1 and MediaObject v1 bodies without rewriting them', function () {
    $bodies = [
        ['$body' => 'Storyfeed/Body/File', '$v' => 1, 'name' => 'legacy.zip', 'size' => 512],
        ['$body' => 'Storyfeed/Body/KeyValue', '$v' => 1, 'missing' => 'Unknown', 'items' => [
            ['key' => 'Seat', 'value' => null, 'missing' => 'Not seated'],
            ['key' => 'Silent', 'value' => null, 'missing' => null],
            ['key' => 'Default', 'value' => null],
        ]],
        ['$body' => 'Storyfeed/Body/MediaObject', '$v' => 1, 'attachments' => [['href' => '/legacy.pdf', 'name' => 'Legacy file']]],
    ];
    $item = FeedItem::of(['kind' => 'activity', 'object' => ['type' => 'order', 'body' => $bodies]]);
    $html = render_blade('<x-storyfeed::activity :activity="$item" />', ['item' => $item]);

    expect($html)->toContain('legacy.zip', '512 bytes', 'Not seated', 'Unknown', 'href="/legacy.pdf"', 'Legacy file')
        ->not->toContain('Silent')
        ->and($bodies[0]['$body'])->toBe('Storyfeed/Body/File')
        ->and($bodies[2])->toHaveKey('attachments');
});

it('renders Image from the named slot with escaped caption and fallback alt', function () {
    $entity = Entity::of(['media' => ['preview' => ['src' => '/preview.jpg'], 'image' => ['src' => '/image.jpg'], 'url' => ['src' => '/not-a-picture']]]);
    $html = Blade::render('<x-storyfeed::body.image :body="$body" :entity="$entity" />', [
        'body' => ['$body' => 'Storyfeed/Body/Image', 'caption' => '<Boat>', 'image' => 'image'],
        'entity' => $entity,
    ]);
    expect($html)->toContain('src="/image.jpg"', 'alt="&lt;Boat&gt;"', '&lt;Boat&gt;</figcaption>')
        ->not->toContain('/preview.jpg', '/not-a-picture');

    $blank = Blade::render('<x-storyfeed::body.image :body="$body" :entity="$entity" />', [
        'body' => ['$body' => 'Storyfeed/Body/Image', 'caption' => 'Hidden', 'image' => 'icon'],
        'entity' => $entity,
    ]);
    expect($blank)->not->toContain('<img', '<figcaption', 'Hidden');
});

it('renders Prose Markdown as GitHub-flavoured Markdown', function () {
    $html = render_bodies(Prose::markdown("| a | b |\n|:--|--:|\n| 1 | 2 |\n\n~~gone~~ ~one~ www.example.com\n\n- [x] done\n- [ ] todo"));

    expect($html)->toContain(
        '<table> <thead> <tr> <th align="left">a</th> <th align="right">b</th> </tr> </thead> <tbody> <tr> <td align="left">1</td> <td align="right">2</td> </tr> </tbody> </table>',
        '<p><del>gone</del> <del>one</del> <a href="http://www.example.com">www.example.com</a></p>',
        '<ul> <li><input type="checkbox" disabled checked /> done</li> <li><input type="checkbox" disabled /> todo</li> </ul>',
    );
});

it('keeps server-rendered task boxes and drops every other input', function () {
    $html = render_bodies(Prose::html(Str::markdown("- [x] shipped\n- [ ] next").'<p><input type="checkbox"> <input type="text" value="x"> <input type="checkbox" checked></p>'));

    expect($html)->toContain('<li><input type="checkbox" disabled checked /> shipped</li>', '<li><input type="checkbox" disabled /> next</li>')
        ->and(substr_count($html, '<input'))->toBe(2);
});

it('draws an Image body\'s own picture, else the slot it names, custom slots included', function () {
    $media = ['icon' => ['src' => '/icon.svg'], 'preview' => ['src' => '/preview.jpg', 'width' => 160, 'height' => 100], 'slots' => ['sparkline' => ['src' => 'data:image/svg+xml,%3Csvg%2F%3E', 'width' => 120, 'height' => 24]]];
    $entity = Entity::of(['label' => 'Order', 'media' => $media]);
    $draw = fn (array $body) => Blade::render('<x-storyfeed::body :body="$body" :entity="$entity" />', ['body' => ['$body' => 'Storyfeed/Body/Image', ...$body], 'entity' => $entity]);

    // Its own picture, at its declared size, needing no entity; it wins over a slot.
    $own = ['$v' => 3, 'src' => 'https://cdn.example.com/day-3.jpg', 'width' => 1200, 'height' => 800, 'alt' => 'Cabinets installed', 'caption' => 'Day 3'];
    expect(Blade::render('<x-storyfeed::body :body="$body" />', ['body' => ['$body' => 'Storyfeed/Body/Image', ...$own]]))
        ->toContain('src="https://cdn.example.com/day-3.jpg"', 'width="1200"', 'height="800"', 'alt="Cabinets installed"', 'Day 3');
    expect($draw([...$own, 'image' => 'preview']))->toContain('day-3.jpg')->not->toContain('/preview.jpg');
    // A slot: built in, or custom under media.slots.
    expect($draw(['$v' => 3, 'image' => 'preview']))->toContain('src="/preview.jpg"', 'width="160"');
    expect($draw(['$v' => 3, 'image' => 'slots.sparkline']))->toContain('src="data:image/svg+xml,%3Csvg%2F%3E"', 'width="120"', 'height="24"');
    // v1 and v2 rows naming nothing still show the preview; v3 names its slot always.
    expect($draw([]))->toContain('/preview.jpg')->and($draw(['$v' => 2]))->toContain('/preview.jpg');
    foreach ([['$v' => 3], ['$v' => 3, 'image' => 'slots.missing'], ['$v' => 3, 'image' => 'slots.bad name'], ['image' => 'url']] as $body) {
        expect($draw($body))->not->toContain('<img');
    }
    // Before v3 a body stored no picture of its own: a stray `src` is not read.
    expect($draw(['$v' => 2, 'src' => '/not-yet.jpg']))->toContain('/preview.jpg')->not->toContain('/not-yet.jpg');
});

it('lets a stored or custom-slot Image stand for its entity in a group\'s strip', function () {
    $photo = fn (string $id, array $body, array $media = []) => ['type' => 'document', 'id' => $id, 'label' => $id, 'url' => '/'.$id, 'body' => [['$body' => 'Storyfeed/Body/Image', '$v' => 3, ...$body]], 'media' => $media];
    $item = ['kind' => 'group', 'headline' => 'Three photos', 'count' => 2, 'sample' => ['objects' => [
        $photo('a', ['src' => '/own.jpg']),
        $photo('b', ['image' => 'slots.chart'], ['slots' => ['chart' => ['src' => '/chart.svg']]]),
    ]], 'children' => []];
    expect(Blade::render('<x-storyfeed::feed :items="[$item]" :grouped="false" />', compact('item')))->toContain('src="/own.jpg"', 'src="/chart.svg"');
});

it('draws the Image bodies core writes from 0.18', function () {
    $entity = Entity::of(['label' => 'Order', 'media' => ['icon' => null, 'preview' => null, 'image' => null, 'slots' => ['sparkline' => ['src' => '/sparkline.svg', 'width' => 120, 'height' => 24]]]]);
    $draw = fn (array $body) => Blade::render('<x-storyfeed::body :body="$body" :entity="$entity" />', ['body' => $body, 'entity' => $entity]);

    expect($draw(Image::make('https://cdn.example.com/day-3.jpg')->alt('Cabinets installed')->width(1200)->height(800)->caption('Day 3')->toPayload()))
        ->toContain('src="https://cdn.example.com/day-3.jpg"', 'width="1200"', 'alt="Cabinets installed"', 'Day 3');
    expect($draw(Image::make(DeferredMedia::slot('sparkline'))->toPayload()))->toContain('src="/sparkline.svg"', 'height="24"');
})->skip(! class_exists(DeferredMedia::class), 'core before 0.18 writes no own pictures or custom slots');
