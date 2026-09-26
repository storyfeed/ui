<?php

use Storyfeed\Body\Change;
use Storyfeed\Body\Component;
use Storyfeed\Body\Excerpt;
use Storyfeed\Body\File;
use Storyfeed\Body\ItemList;
use Storyfeed\Body\KeyValue;
use Storyfeed\Body\MediaObject;
use Storyfeed\Body\Prose;
use Storyfeed\Contracts\FeedBody;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedResource;
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

    Storyfeed::grammar(['order.place' => ':actor placed :object']);
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
        'Table' => KeyValue::missingAs(null, 'not seated'),
        'Notes' => null,
    ], title: 'Order #1042'));

    expect($html)->toContain(
        '<div data-storyfeed-body> <figure> <figcaption>Order #1042</figcaption> <dl> '
        .'<div> <dt>Pickup</dt> <dd>12:10 pm</dd> </div> '
        .'<div> <dt>Paid</dt> <dd>Yes</dd> </div> '
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

it('draws prose as its source, escaped, and verbatim text in a fixed width', function () {
    $html = render_bodies([
        Prose::markdown('**Rush** <script>alert(1)</script>', title: 'Note'),
        Prose::verbatim('SELECT 1;', title: 'query.sql'),
    ]);

    expect($html)
        ->toContain('<figcaption>Note</figcaption> <p>**Rush** &lt;script&gt;alert(1)&lt;/script&gt;</p>')
        ->toContain('<pre><code>SELECT 1;</code></pre>')
        ->not->toContain('<script>');
});

it('draws a change as before and after', function () {
    expect(render_bodies(Change::make(['status' => ['draft', 'paid'], 'coupon' => [1 => 'SUMMER'], 'note' => ['Hi', null]])))->toContain(
        '<dl> '
        .'<div> <dt>status</dt> <dd> <span>draft</span> <span aria-hidden="true">→</span> <span>paid</span> </dd> </div> '
        .'<div> <dt>coupon</dt> <dd> <span>SUMMER</span> </dd> </div> '
        .'<div> <dt>note</dt> <dd> <span>Hi</span> <span aria-hidden="true">→</span> <span>empty</span> </dd> </div> '
        .'</dl>'
    );
});

it('draws a file\'s name, size and type, leaving out a name the headline says', function () {
    expect(render_bodies([File::make(2_516_582, 'application/pdf', 'invoice.pdf'), File::make(512, name: 'Order #1042')]))
        ->toContain('<p>invoice.pdf · 2.4 MB · application/pdf</p>')
        ->toContain('<p>512 B</p>');
});

it('draws an item list, numbered when ordered, with what was not sent', function () {
    $html = render_bodies(ItemList::ordered(['Margherita', FeedLink::make('Tiramisu', '/menu/tiramisu')], title: 'Items', totalItems: 5, more: FeedLink::make('See all', '/orders/1042')));

    expect($html)->toContain(
        '<figure> <figcaption>Items</figcaption> <ol> '
        .'<li> Margherita </li> <li> <a href="/menu/tiramisu">Tiramisu</a> </li> </ol> '
        .'<figcaption> <span>3 more</span> <a href="/orders/1042">See all</a> </figcaption> </figure>'
    );
});

it('draws a media object with the entity\'s current picture, once', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg', width: 800, height: 600, alt: 'The order');

    $html = render_bodies(MediaObject::make(
        subject: 'Dinner for two',
        content: 'Two pizzas and a dessert.',
        footnote: FeedLink::make('Receipt', '/receipts/1042'),
    )->withPreview()->withAttachments(FeedResource::make('/files/menu.pdf', mediaType: 'application/pdf', name: 'menu.pdf')));

    expect($html)
        ->toContain('<div> <div><div style="aspect-ratio: 800 / 600"><img src="/img/1042.jpg" alt="The order" loading="lazy"></div> </div> '
            .'<div> <p> Dinner for two </p> <p>Two pizzas and a dessert.</p> '
            .'<ul> <li><a href="/files/menu.pdf">menu.pdf</a> · application/pdf</li> </ul> '
            .'<p> <a href="/receipts/1042">Receipt</a> </p> </div> </div>')
        // The form draws the preview, so the row does not draw it again.
        ->and(substr_count($html, '/img/1042.jpg'))->toBe(1);
});

it('draws a linked card title without a picture or optional sections', function () {
    $html = render_bodies(MediaObject::make(subject: FeedLink::make('Order #1042', '/orders/1042'), content: 'Dinner'));

    expect($html)
        ->toContain('<div> <div> <p> <a href="/orders/1042">Order #1042</a> </p>')
        ->not->toContain('<img', '<ul', '/receipts/');
});

it('draws the object\'s preview on the row when no body claims it', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg');

    expect(render_bodies([]))->toContain('<div><img src="/img/1042.jpg" alt="" loading="lazy"></div>');
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
