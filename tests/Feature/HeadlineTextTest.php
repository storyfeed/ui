<?php

use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Grouping\Group;
use Storyfeed\Support\FeedItem;
use Storyfeed\Support\Headline;
use Storyfeed\Ui\Support\HeadlineText;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * Headline text through an app-registered formatter (ui#97). Only text
 * segments reach it: entities, entity lists and the viewer's words never do.
 */

/** Register a formatter that records what it is given and marks it in the output. @return ArrayObject<int, string> */
function record_headline_text(): ArrayObject
{
    $seen = new ArrayObject;
    app(HeadlineText::class)->register(function (string $text) use ($seen): string {
        $seen[] = $text;

        return '<em>'.e($text).'</em>';
    });

    return $seen;
}

beforeEach(function () {
    $this->dana = User::create(['name' => 'Dana', 'email' => 'dana@example.com']);
    $this->ravi = User::create(['name' => 'Ravi', 'email' => 'ravi@example.com']);

    Story::for(Order::class)->verb('release')->headline(':actor released `v2.3` <b>to</b> :object');
});

it('draws headline text escaped, as before, when no formatter is registered', function () {
    Storyfeed::activity('release', Order::create(['number' => '1']))->by($this->dana)->publish();

    expect(app(HeadlineText::class)->formatter())->toBeNull()
        ->and(render_feed())->toContain('<span><a href="/users/1">Dana</a> released `v2.3` &lt;b&gt;to&lt;/b&gt; <a href="/orders/1" target="_blank">Order #1</a></span>')
        ->not->toContain('<code');
});

it('passes only a singular headline\'s text to the formatter, never entities or the viewer', function () {
    Storyfeed::activity('release', Order::create(['number' => '1']))->by($this->dana)->publish();
    $seen = record_headline_text();

    expect(render_feed(attributes: 'viewer="user:1"'))
        ->toContain('<span><span>You</span><em> released `v2.3` &lt;b&gt;to&lt;/b&gt; </em><a href="/orders/1" target="_blank">Order #1</a></span>')
        ->and($seen->getArrayCopy())->toBe([' released `v2.3` <b>to</b> ']);
})->skip(fn () => ! HeadlineText::supported(), 'core without Headline::toHtml(text:)');

it('passes only a group headline\'s text to the formatter, never its entity lists or counts', function () {
    Story::for(Order::class)->verb('review')->headline(':actor reviewed :object')
        ->groups(Group::byActors()->headline(':actors reviewed `main` on :object (:count reviews, :others; 3)'));
    $order = Order::create(['number' => '9']);
    foreach ([$this->dana, $this->ravi, User::create(['name' => 'Kim', 'email' => 'kim@example.com'])] as $user) {
        $this->travel(1)->minutes();
        Storyfeed::activity('review', $order)->by($user)->publish();
    }
    $seen = record_headline_text();

    expect(render_blade('<x-storyfeed::feed :page="$page" viewer="user:1" />', ['page' => Storyfeed::feed()->live()->get()]))
        ->toMatch('/<a href="\/users\/3">Kim<\/a>, <a href="\/users\/2">Ravi<\/a> and <span>you<\/span><em> reviewed `main` on <\/em><a href="\/orders\/1" target="_blank">Order #9<\/a>/')
        ->toMatch('/<em> \(<\/em>3<em> reviews, <\/em>\s*0 others<em>; 3\)<\/em>/')
        ->and($seen->getArrayCopy())->toContain(' reviewed `main` on ')
        ->not->toContain('3')->not->toContain('0 others')->not->toContain(' 0 others')
        ->and(implode('|', $seen->getArrayCopy()))->not->toContain('Kim')->not->toContain('Ravi')->not->toContain('you')->not->toContain('Order #9');
})->skip(fn () => ! HeadlineText::supported(), 'core without Headline::toHtml(text:)');

it('leaves counts unformatted while formatting the selected count-form prose', function (int $count, string $word) {
    $headline = new Headline(
        FeedItem::of(['kind' => 'group', 'count' => $count]),
        'Released :count builds',
        null,
    );
    $seen = record_headline_text();

    expect(render_blade('<x-storyfeed::headline :headline="$headline" />', ['headline' => $headline]))
        ->toBe("<span><em>Released </em>{$count}<em> {$word}</em></span>")
        ->and($seen->getArrayCopy())->toBe(['Released ', ' '.$word]);
})->with([[1, 'build'], [3, 'builds']])
    ->skip(fn () => ! HeadlineText::supported(), 'core without Headline::toHtml(text:)');

it('passes a pre-rendered fallback headline to the formatter', function () {
    Storyfeed::anonymous()->action('release', Order::create(['number' => '9']))->publish();
    $node = json_decode((string) json_encode(Page::read(Storyfeed::feed()->get())['items']), true)[0];
    app(HeadlineText::class)->register(HeadlineText::inlineCode(...));

    expect(render_feed([[...$node, 'headline_template' => null, 'headline' => 'Deployed `main` & <i>more</i>']]))
        ->toContain('<span>Deployed <code>main</code> &amp; &lt;i&gt;more&lt;/i&gt;</span>');
})->skip(fn () => ! HeadlineText::supported(), 'core without Headline::toHtml(text:)');

it('draws balanced backtick spans as styled inline code, escaped', function () {
    $code = '<code class="rounded bg-muted px-[0.25em] py-[0.125em] font-mono text-[0.875em] text-foreground">';

    expect(HeadlineText::inlineCode('Released `v2.3` to production'))->toBe("Released {$code}v2.3</code> to production")
        ->and(HeadlineText::inlineCode('Shows `<b>` & `a"b`'))->toBe("Shows {$code}&lt;b&gt;</code> &amp; {$code}a&quot;b</code>")
        ->and(HeadlineText::inlineCode('<script>alert(1)</script>'))->toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
});

it('leaves unmatched, empty and doubled backticks literal', function () {
    expect(HeadlineText::inlineCode('a `b'))->toBe('a `b')
        ->and(HeadlineText::inlineCode('`a` and `b'))->toEndWith('</code> and `b')
        ->and(HeadlineText::inlineCode('empty `` ticks'))->toBe('empty `` ticks')
        ->and(HeadlineText::inlineCode('``double``'))->toBe('``double``')
        ->and(HeadlineText::inlineCode('`<b>'))->toBe('`&lt;b&gt;');
});

it('keeps today\'s output on a core whose headline takes no text closure', function () {
    Storyfeed::activity('release', Order::create(['number' => '1']))->by($this->dana)->publish();
    $before = render_feed(attributes: 'viewer="user:1"');

    $seen = record_headline_text();

    expect(render_feed(attributes: 'viewer="user:1"'))->toBe($before)
        ->and($seen->getArrayCopy())->toBe([]);
})->skip(fn () => HeadlineText::supported(), 'compatibility is exercised on older cores');

it('does not format generated fallback words or counts', function () {
    Storyfeed::anonymous()->action('release', Order::create(['number' => '9']))->publish();
    $node = json_decode((string) json_encode(Page::read(Storyfeed::feed()->get())['items']), true)[0];
    $node = [...$node, 'headline_template' => null, 'headline' => null];
    $before = render_feed([$node]);
    $seen = record_headline_text();

    expect(render_feed([$node]))->toBe($before)
        ->and($seen->getArrayCopy())->toBe([]);

    $headline = new Headline(FeedItem::of(['kind' => 'group', 'count' => 3]), null, null);
    expect(render_blade('<x-storyfeed::headline :headline="$headline" />', ['headline' => $headline]))
        ->toBe('<span>3 activities</span>')
        ->and($seen->getArrayCopy())->toBe([]);
});
