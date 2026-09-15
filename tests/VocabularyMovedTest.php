<?php

/*
 * The body forms left this package on 2026-09-14. They are core's, under
 * `Storyfeed\Body`, because a form's name must not contain the library
 * that defined it and every one of them was already named `Storyfeed/…`.
 *
 * This test exists so the move cannot quietly come undone: a copy reappearing
 * here would give one form two classes, which is how a vocabulary forks.
 */

use Storyfeed\Contracts\FeedBody;

it('leaves the body vocabulary to core', function () {
    foreach (['Change', 'Excerpt', 'KeyValue', 'File', 'Prose', 'MediaObject', 'ItemList'] as $form) {
        expect(class_exists("Storyfeed\\Body\\{$form}"))->toBeTrue()
            ->and(class_exists("Storyfeed\\Ui\\Data\\{$form}"))->toBeFalse()
            ->and("Storyfeed\\Body\\{$form}"::name())->toBe("Storyfeed/Body/{$form}");
    }
});

it('draws forms it did not define', function () {
    // The contract is the only thing a renderer needs: this package will draw
    // a form defined by an app it has never heard of, exactly as it draws
    // core's six.
    $appOwned = new class implements FeedBody
    {
        public static function name(): string
        {
            return 'Acme/Attachment';
        }

        public static function version(): int
        {
            return 1;
        }

        public static function upgrade(array $payload, int $from): array
        {
            return $payload;
        }

        public function toPayload(): array
        {
            return [self::KEY => self::name(), self::VERSION => self::version()];
        }

        public function toArray(): array
        {
            return $this->toPayload();
        }
    };

    expect($appOwned->toArray()['$body'])->toBe('Acme/Attachment');
});
