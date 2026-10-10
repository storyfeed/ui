<?php

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Excerpt;
use Storyfeed\Body\FileAttachment;
use Storyfeed\Body\Image;
use Storyfeed\Body\ItemList;
use Storyfeed\Body\KeyValue;
use Storyfeed\Body\MediaObject;
use Storyfeed\Body\Prose;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedResource;
use Storyfeed\MediaSlot;
use Storyfeed\Support\Entity;
use Storyfeed\Ui\Support\BodyComponents;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;
use Storyfeed\Ui\Tests\TestCase;

// Render the actual package views inside Testbench, with core-generated pages.
final class WorkbenchTest extends TestCase
{
    public function test_render_workbench(): void
    {
        $user = User::create(['name' => 'Dana', 'email' => 'dana@example.test']);
        Story::for(Order::class)->verb('place')->headline(':actor placed :object')->icon('shopping-bag');
        Story::for(Order::class)->verb('ship')->headline(':actor shipped :object')->icon('truck');

        $render = fn ($page) => Blade::render('<x-storyfeed::feed :page="$page" />', ['page' => $page]);
        $sections = [];
        Storyfeed::activity('place', Order::create(['number' => '1042']))->by($user)->publish();
        $sections['Activity row'] = $render(Storyfeed::feed()->get());
        Storyfeed::activity('place', Order::create(['number' => '1043']))->by($user)->publish();
        $sections['Group row and members'] = $render(Storyfeed::feed()->live()->get());
        Storyfeed::activity('ship', Order::create(['number' => '1044']))->by($user)->publish();

        $bodies = [
            'KeyValue' => KeyValue::make(['Pickup' => '12:10 pm', 'Paid' => true, 'Reference' => KeyValue::verbatim('ORD-1042'), 'Table' => KeyValue::placeholder(null, 'not seated')], title: 'Order #1042'),
            'MediaObject' => MediaObject::make(subject: FeedLink::make('Dinner for two', '/orders/1042'), content: 'Two pizzas and a dessert, ready for pickup at the kitchen.', footnote: FeedLink::make('Receipt', '/receipts/1042'))->image(MediaSlot::Preview)->withFiles(FeedResource::make('/files/menu.pdf', mediaType: 'application/pdf', name: 'menu.pdf')),
            'Image' => Image::make(caption: 'Dinner is ready', alt: 'A pizza on a plate'),
            'ItemList' => ItemList::ordered(['Margherita', FeedLink::make('Tiramisu', '/menu/tiramisu')], title: 'Items', totalItems: 5, more: FeedLink::make('See all', '/orders/1042')),
            'FileAttachment' => FileAttachment::make(2516582, 'application/pdf', 'invoice.pdf'),
            'Prose plain' => Prose::make("Please ring the bell on arrival.\nLeave the order with reception if no one answers.", title: 'Delivery instructions'),
            'Prose Markdown' => Prose::markdown("**Ready for pickup**\n\nPlease bring your [order confirmation](/orders/1042).\n\n- Two pizzas\n- One dessert", title: 'Pickup note'),
            'Prose HTML' => Prose::html('<p><strong>Order confirmed.</strong> Your pickup is at <em>12:10 pm</em>.</p><p><a href="/orders/1042">View order</a></p>', title: 'Confirmation'),
            'Prose verbatim' => Prose::verbatim("Order #1042\n  status: ready\n  pickup: 12:10 pm\n  result: <confirmed>", title: 'Kitchen output'),
            'Excerpt' => Excerpt::make('The pizza was still warm when we got home. We will be back', from: 'Customer review'),
        ];

        foreach ($bodies as $label => $body) {
            Order::$body = $body;
            Order::$preview = in_array($label, ['MediaObject', 'Image'], true) ? FeedImage::make('meal.svg', width: 160, height: 160, alt: 'A pizza on a plate') : null;
            $order = Order::create(['number' => $label]);
            Storyfeed::activity('place', $order)->by($user)->publish();
            $sections[$label] = $render(Storyfeed::feed()->object($order)->log()->get());
        }

        $sections['Pager'] = Blade::render('<x-storyfeed::pager cursor="workbench-next-page" />');
        $output = dirname(__DIR__).'/build/workbench';
        if (! is_dir($output)) {
            mkdir($output, 0777, true);
        }
        file_put_contents($output.'/index.html', Blade::render(file_get_contents(__DIR__.'/page.blade.php'), compact('sections')));
        copy(__DIR__.'/meal.svg', $output.'/meal.svg');
        $this->assertFileExists($output.'/index.html');

        Carbon::setTestNow('2026-08-14T15:00:00Z');
        app(BodyComponents::class)->register('App/Message', 'workbench::message');
        app('view')->addNamespace('workbench', __DIR__);
        // An app or package adds body renderers by adding views to the namespace.
        app('view')->addNamespace('storyfeed', __DIR__.'/views');
        $payload = json_decode(file_get_contents(__DIR__.'/vue/sample-payload.json'), true, flags: JSON_THROW_ON_ERROR);
        $bodies = json_decode(file_get_contents(__DIR__.'/vue/body-payload.json'), true, flags: JSON_THROW_ON_ERROR);
        $icons = json_decode(file_get_contents(dirname(__DIR__).'/build/workbench-icons.json'), true, flags: JSON_THROW_ON_ERROR);
        $renderers = ['glyph' => fn ($token, $variant) => $icons[$token] ?? $icons['activity']];
        $render = fn ($items, $options = []) => Blade::render('<x-storyfeed::feed :items="$items" :grouped="$grouped" :rail="$rail" :child-rail="$childRail" :dividers="$dividers" :divider-style="$dividerStyle" :renderers="$renderers" :interactive="$interactive" :collapsed="$collapsed" />', [
            'renderers' => $renderers, 'items' => $items, 'interactive' => true, 'collapsed' => null, 'grouped' => true, 'rail' => null, 'childRail' => null, 'dividers' => [], 'dividerStyle' => 'branch', ...$options,
        ]);
        $main = $render($payload['items']);
        $examples = ['Generic body forms' => $render($bodies, ['grouped' => false])];
        foreach (['actor', 'activity', 'actor-only', 'activity-only'] as $rail) {
            $examples[$rail] = $render([$bodies[0]], ['grouped' => false, 'rail' => $rail]);
        }
        foreach (['branch', 'dot'] as $style) {
            $examples[$style === 'branch' ? 'Per-item divider' : 'Dot divider (option)'] = $render([$bodies[0]], ['grouped' => false, 'dividers' => ['body-0' => 'Timeline'], 'dividerStyle' => $style]);
        }
        $cases = json_decode(file_get_contents(__DIR__.'/vue/cases.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($cases as $case) {
            $examples[$case['name']] = $render($case['items'], ['grouped' => $case['grouped'] ?? false, 'rail' => $case['rail'] ?? null, 'childRail' => $case['childRail'] ?? null, 'interactive' => $case['interactive'] ?? true, 'collapsed' => $case['collapsed'] ?? null, 'renderers' => $renderers]);
        }
        $post = collect($bodies)->first(fn ($item) => ($item['object']['body'][0]['$body'] ?? null) === 'Storyfeed/Body/MediaObject')['object'];
        $postEntity = Entity::of($post);
        $postBody = $post['body'][0];
        $examples['MediaObject below'] = Blade::render('<div class="sf-feed text-sm leading-[1.6] text-muted-foreground"><x-storyfeed::body.media-object :body="$postBody" :entity="$postEntity" image-placement="below" /></div>', compact('postBody', 'postEntity'));
        file_put_contents($output.'/parity.html', Blade::render(file_get_contents(__DIR__.'/parity.blade.php'), compact('main', 'examples')));

    }
}
