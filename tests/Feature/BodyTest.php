<?php

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
        '<div class="sf-body-form"> <figure class="sf-facts"> <figcaption class="sf-facts__title">Order #1042</figcaption> <dl class="sf-facts__rows"> '
        .'<div class="sf-facts__row"> <dt class="sf-facts__label">Pickup</dt> <dd class="sf-facts__value">12:10 pm</dd> </div> '
        .'<div class="sf-facts__row"> <dt class="sf-facts__label">Paid</dt> <dd class="sf-facts__value">Yes</dd> </div> '
        .'<div class="sf-facts__row"> <dt class="sf-facts__label">Reference</dt> <dd class="sf-facts__value sf-facts__value--verbatim" title="ORD-1042">ORD-1042</dd> </div> '
        .'<div class="sf-facts__row"> <dt class="sf-facts__label">Table</dt> <dd class="sf-facts__value"><span class="sf-facts__value--absent">not seated</span></dd> </div> '
        .'</dl> </figure> </div>'
    )->not->toContain('Notes');
});

it('draws an excerpt with where it came from', function () {
    expect(render_bodies(Excerpt::make('Please leave it at the door', from: 'Delivery note')))->toContain(
        '<figure class="sf-excerpt-block"> <blockquote class="sf-excerpt">Please leave it at the door<span aria-hidden="true">…</span></blockquote> '
        .'<figcaption class="sf-excerpt__from">Delivery note</figcaption> </figure>'
    );
});

it('draws prose as its source, escaped, and verbatim text in a fixed width', function () {
    $html = render_bodies([
        Prose::markdown('**Rush** <script>alert(1)</script>', title: 'Note'),
        Prose::verbatim('SELECT 1;', title: 'query.sql'),
    ]);

    expect($html)
        ->toContain('<figcaption class="sf-prose__title">Note</figcaption> <p class="sf-prose">**Rush** &lt;script&gt;alert(1)&lt;/script&gt;</p>')
        ->toContain('<pre class="sf-verbatim"><code>SELECT 1;</code></pre>')
        ->not->toContain('<script>');
});

it('draws a file\'s name, size and type, leaving out a name the headline says', function () {
    expect(render_bodies([File::make(2_516_582, 'application/pdf', 'invoice.pdf'), File::make(512, name: 'Order #1042')]))
        ->toContain('<p class="sf-file">invoice.pdf · 2.4 MB · application/pdf</p>')
        ->toContain('<p class="sf-file">512 B</p>');
});

it('draws an item list, numbered when ordered, with what was not sent', function () {
    $html = render_bodies(ItemList::ordered(['Margherita', FeedLink::make('Tiramisu', '/menu/tiramisu')], title: 'Items', totalItems: 5, more: FeedLink::make('See all', '/orders/1042')));

    expect($html)->toContain(
        '<figure class="sf-list-block"> <figcaption class="sf-list__title">Items</figcaption> <ol class="sf-list"> '
        .'<li class="sf-list__item"> Margherita </li> <li class="sf-list__item"> <a href="/menu/tiramisu" class="sf-entity">Tiramisu</a> </li> </ol> '
        .'<figcaption class="sf-list__more"> <span>3 more</span> <a href="/orders/1042" class="sf-entity">See all</a> </figcaption> </figure>'
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
        ->toContain('<div class="sf-media-object"> <p class="sf-media-object__subject"> Dinner for two </p> <p class="sf-prose">Two pizzas and a dessert.</p> '
            .'<div class="sf-media" style="aspect-ratio: 800 / 600"><img src="/img/1042.jpg" alt="The order" loading="lazy"></div> '
            .'<p class="sf-file"><a href="/files/menu.pdf">menu.pdf</a> · application/pdf</p> '
            .'<p class="sf-media-object__footnote"> <a href="/receipts/1042">Receipt</a> </p> </div>')
        // The form draws the preview, so the row does not draw it again.
        ->and(substr_count($html, '/img/1042.jpg'))->toBe(1);
});

it('draws the object\'s preview on the row when no body claims it', function () {
    Order::$preview = FeedImage::make('/img/1042.jpg');

    expect(render_bodies([]))->toContain('<div class="sf-media"><img src="/img/1042.jpg" alt="" loading="lazy"></div>');
});

it('draws nothing for a body type it has no component for', function () {
    $html = render_bodies([Component::make('order-card', ['id' => 1042]), Excerpt::make('Kept')]);

    expect($html)
        ->toContain('Kept')
        ->not->toContain('order-card')
        ->and(substr_count($html, 'sf-body-form'))->toBe(1);
});

it('draws nothing for a malformed or app-owned body, and an app can add a component for one', function () {
    $item = FeedItem::of(['kind' => 'activity', 'object' => ['type' => 'order', 'body' => [
        ['$body' => 'Acme/Attachment', '$v' => 1, 'name' => 'plan.pdf'],
        ['$body' => '../../etc/passwd'],
        ['no-type' => true],
        'not an array',
    ]]]);

    $render = fn () => render_blade('<x-storyfeed::activity :activity="$item" />', ['item' => $item]);

    expect($render())->not->toContain('sf-body-form');

    $views = sys_get_temp_dir().'/storyfeed-ui-'.uniqid();
    mkdir("{$views}/components/body/acme", recursive: true);
    file_put_contents("{$views}/components/body/acme/attachment.blade.php", '@props([\'body\', \'entity\' => null])<p class="acme">{{ $body[\'name\'] }}</p>');
    app('view')->prependNamespace('storyfeed', $views);

    expect($render())->toContain('<div class="sf-body-form"> <p class="acme">plan.pdf</p> </div>')
        ->and(substr_count($render(), 'sf-body-form'))->toBe(1);
});
