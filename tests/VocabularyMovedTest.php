<?php

/*
 * The detail forms left this package on 2026-09-14. They are core's, under
 * `Storyfeed\Detail`, because a detail's name must not contain the library
 * that defined it and every one of them was already named `Storyfeed/…`.
 *
 * This test exists so the move cannot quietly come undone: a copy reappearing
 * here would give one form two classes, which is how a vocabulary forks.
 */

use Storyfeed\Contracts\FeedDetail;

it('leaves the detail vocabulary to core', function () {
    foreach (['Change', 'Excerpt', 'Fields', 'File', 'Markdown', 'MediaObject'] as $form) {
        expect(class_exists("Storyfeed\\Detail\\{$form}"))->toBeTrue()
            ->and(class_exists("Storyfeed\\Ui\\Data\\{$form}"))->toBeFalse()
            ->and("Storyfeed\\Detail\\{$form}"::name())->toBe("Storyfeed/Detail/{$form}");
    }
});

it('draws forms it did not define', function () {
    // The contract is the only thing a renderer needs: this package will draw
    // a form defined by an app it has never heard of, exactly as it draws
    // core's six.
    $appOwned = new class implements FeedDetail
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

    expect($appOwned->toArray()['$detail'])->toBe('Acme/Attachment');
});
