<?php

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Str;
use Storyfeed\Body\Component;
use Storyfeed\Body\Excerpt;
use Storyfeed\Body\FileAttachment;
use Storyfeed\Body\Image;
use Storyfeed\Body\ItemList;
use Storyfeed\Body\KeyValue;
use Storyfeed\Body\MediaObject;
use Storyfeed\Body\Prose;
use Storyfeed\Contracts\FeedBody;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedResource;
use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;
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

        expect($html)->toContain('<figcaption>&lt;Note&gt;</figcaption>', '<p tabindex="0">**Rush** &lt;script&gt;alert(1)&lt;/script&gt; Second line</p>')
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

it('draws a media object with the entity\'s current picture, once', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg', width: 800, height: 600, alt: 'The order');

    $html = render_bodies(MediaObject::make(
        subject: 'Dinner for two',
        content: 'Two pizzas and a dessert.',
        footnote: FeedLink::make('Receipt', '/receipts/1042'),
    )->withPreview()->withFiles(FeedResource::make('/files/menu.pdf', mediaType: 'application/pdf', name: 'menu.pdf')));

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
        'body' => Image::make()->caption('<Boat>')->withImage()->toPayload(),
        'entity' => $entity,
    ]);
    expect($html)->toContain('src="/image.jpg"', 'alt="&lt;Boat&gt;"', '&lt;Boat&gt;</figcaption>')
        ->not->toContain('/preview.jpg', '/not-a-picture');

    $blank = Blade::render('<x-storyfeed::body.image :body="$body" :entity="$entity" />', [
        'body' => Image::make()->caption('Hidden')->withIcon()->toPayload(),
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
