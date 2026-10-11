<?php

use Illuminate\Support\Facades\Blade;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Grouping\Group;
use Storyfeed\Support\Entity;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * The page's viewer reads as "You" (ui#75). Only the render changes: the
 * payload is the same for every reader.
 */

beforeEach(function () {
    $this->dana = User::create(['name' => 'Dana', 'email' => 'dana@example.com']);
    $this->ravi = User::create(['name' => 'Ravi', 'email' => 'ravi@example.com']);

    Story::for(Order::class)->verb('place')->headline(':actor placed :object');
    Story::for(Order::class)->verb('assign')->headline(':object was assigned to :target');
});

it('names the viewer You at the start of a headline', function () {
    Storyfeed::activity('place', Order::create(['number' => '1042']))->by($this->dana)->publish();

    expect(render_feed(attributes: ':viewer="$viewer"', data: ['viewer' => $this->dana]))
        ->toContain('<span><span>You</span> placed <a href="/orders/1" target="_blank">Order #1042</a></span>')
        ->not->toContain('>Dana<');
});

it('names the viewer you mid-sentence, in any role', function () {
    Storyfeed::activity('assign', Order::create(['number' => '7']))->by($this->ravi)->target($this->dana)->publish();

    expect(render_feed(attributes: 'viewer="user:1"'))->toContain('was assigned to <span>you</span></span>');
});

it('leaves everyone else, and pages with no viewer, as they were', function () {
    Storyfeed::activity('place', Order::create(['number' => '1']))->by($this->ravi)->publish();
    Storyfeed::anonymous()->action('place', Order::create(['number' => '2']))->publish();

    $html = render_feed(attributes: ':viewer="[\'type\' => \'user\', \'id\' => 1]"');

    expect($html)->toContain('<a href="/users/2">Ravi</a> placed')->toContain(method_exists(Entity::class, 'isAbsent') ? '<span>Someone</span> placed' : '<span>Someone placed')->not->toContain('You')
        ->and(render_feed())->toBe(render_feed(attributes: ':viewer="null"'));
});

it('names the viewer You inside a list of actors', function () {
    Story::for(Order::class)->verb('review')->headline(':actor reviewed :object')
        ->groups(Group::byActors()->headline(':actors reviewed :object'));
    $order = Order::create(['number' => '9']);
    foreach ([$this->dana, $this->ravi, User::create(['name' => 'Kim', 'email' => 'kim@example.com'])] as $user) {
        $this->travel(1)->minutes();
        Storyfeed::activity('review', $order)->by($user)->publish();
    }

    expect(render_blade('<x-storyfeed::feed :page="$page" viewer="user:1" />', ['page' => Storyfeed::feed()->live()->get()]))
        ->toMatch('/<a href="\/users\/3">Kim<\/a>, <a href="\/users\/2">Ravi<\/a> and <span>you<\/span> reviewed/');
});

it('draws the viewer as an actor: weight and colour, no link', function () {
    Storyfeed::activity('place', Order::create(['number' => '3']))->by($this->dana)->publish();

    expect(Blade::render('<x-storyfeed::feed :page="$page" viewer="user:1" />', ['page' => Storyfeed::feed()->get()]))
        ->toContain('<span class="sf-entity sf-entity--viewer font-medium text-foreground">You</span> placed');
});
