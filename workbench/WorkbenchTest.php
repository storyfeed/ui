<?php

use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Excerpt;
use Storyfeed\Body\File;
use Storyfeed\Body\ItemList;
use Storyfeed\Body\KeyValue;
use Storyfeed\Body\MediaObject;
use Storyfeed\Body\Prose;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedResource;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;
use Storyfeed\Ui\Tests\TestCase;

// Render the actual package views inside Testbench, with core-generated pages.
final class WorkbenchTest extends TestCase
{
    public function test_render_workbench(): void
    {
        $user = User::create(['name' => 'Dana', 'email' => 'dana@example.test']);
        Storyfeed::grammar(['order.place' => ':actor placed :object', 'order.ship' => ':actor shipped :object'])
            ->icons(['order.place' => 'shopping-bag', 'order.ship' => 'truck']);

        $render = fn ($page) => Blade::render('<x-storyfeed::feed :page="$page" />', ['page' => $page]);
        $sections = [];
        Storyfeed::activity('place', Order::create(['number' => '1042']))->by($user)->publish();
        $sections['Activity row'] = $render(Storyfeed::feed()->get());
        Storyfeed::activity('place', Order::create(['number' => '1043']))->by($user)->publish();
        $sections['Group row and members'] = $render(Storyfeed::feed()->live()->get());
        Storyfeed::activity('ship', Order::create(['number' => '1044']))->by($user)->publish();
        $sections['Summary row'] = $render(Storyfeed::feed()->summary()->get());

        $bodies = [
            'KeyValue' => KeyValue::make(['Pickup' => '12:10 pm', 'Paid' => true, 'Reference' => KeyValue::verbatim('ORD-1042'), 'Table' => KeyValue::missingAs(null, 'not seated')], title: 'Order #1042'),
            'MediaObject' => MediaObject::make(subject: FeedLink::make('Dinner for two', '/orders/1042'), content: 'Two pizzas and a dessert, ready for pickup at the kitchen.', footnote: FeedLink::make('Receipt', '/receipts/1042'))->withPreview()->withAttachments(FeedResource::make('/files/menu.pdf', mediaType: 'application/pdf', name: 'menu.pdf')),
            'ItemList' => ItemList::ordered(['Margherita', FeedLink::make('Tiramisu', '/menu/tiramisu')], title: 'Items', totalItems: 5, more: FeedLink::make('See all', '/orders/1042')),
            'File' => File::make(2516582, 'application/pdf', 'invoice.pdf'),
            'Prose plain' => Prose::make("Please ring the bell on arrival.\nLeave the order with reception if no one answers.", title: 'Delivery instructions'),
            'Prose Markdown' => Prose::markdown("**Ready for pickup**\n\nPlease bring your [order confirmation](/orders/1042).\n\n- Two pizzas\n- One dessert", title: 'Pickup note'),
            'Prose HTML' => Prose::html('<p><strong>Order confirmed.</strong> Your pickup is at <em>12:10 pm</em>.</p><p><a href="/orders/1042">View order</a></p>', title: 'Confirmation'),
            'Prose verbatim' => Prose::verbatim("Order #1042\n  status: ready\n  pickup: 12:10 pm\n  result: <confirmed>", title: 'Kitchen output'),
            'Excerpt' => Excerpt::make('The pizza was still warm when we got home. We will be back', from: 'Customer review'),
        ];

        foreach ($bodies as $label => $body) {
            Order::$body = $body;
            Order::$preview = $label === 'MediaObject' ? FeedImage::make('meal.svg', width: 160, height: 160, alt: 'A pizza on a plate') : null;
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
    }
}
