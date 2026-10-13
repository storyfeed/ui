## Storyfeed UI

`storyfeed/ui` renders Storyfeed activity feeds: a Blade kit (registered by the package), and Vue 3 and React 19 kits for Inertia that `php artisan storyfeed:ui vue` or `php artisan storyfeed:ui react` copies into the app. Core (`storyfeed/storyfeed`) records and reads the feed; this package only draws the page core returns. Storyfeed is pre-1.0, so check the package README before relying on a remembered prop. The `storyfeed-ui` skill covers installing each kit, feed props, the `FEED_*` provides and custom body renderers in more depth.

### Conventions

- Tailwind CSS v4 is mandatory and there is no package stylesheet to import. Register the Typography plugin and an `@source` scan of the kit in `resources/css/app.css`; retune colours and sizes through the app's `@theme` and the kit's `--sf-*` variables.
- The kits expect the Laravel starter-kit colour tokens (`background`, `foreground`, `card`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `border`, `ring`).
- Render the feed with the kit's components. Never copy kit markup into app views, add CSS files for the feed, or assert the kit's class names in the app's tests: test the app's own output, such as the headline text.
- Copied Vue and React kits belong to the app. Re-run the copy with `--diff` to review an update and `--force` to replace edited files.

### Blade

@verbatim
<code-snippet name="Render a feed in Blade" lang="blade">
{{-- $page = Storyfeed::feed()->cursorPaginate(15) --}}
<x-storyfeed::feed :page="$page" image-size="card" :viewer="auth()->user()" />
</code-snippet>
@endverbatim

@verbatim
<code-snippet name="Tailwind setup for the Blade kit" lang="css">
@plugin "@tailwindcss/typography";
@source "../../vendor/storyfeed/ui/resources/views";
</code-snippet>
@endverbatim

### Vue and React (Inertia)

Pass core's page JSON as `page`. `image-size` (Vue) or `imageSize` (React) sets the default picture size for the feed: `thumbnail`, `inline`, `card`, `feature` or `full`; an Image body's own `size()` wins.

@verbatim
<code-snippet name="Render a feed in React" lang="tsx">
import { Link } from '@inertiajs/react';
import { FeedProvider, FeedStream } from '@/components/storyfeed';
import type { FeedPagePayload } from '@/components/storyfeed';

export default function History({ feed }: { feed: FeedPagePayload }) {
    return (
        <FeedProvider FEED_LINK={Link}>
            <FeedStream page={feed} imageSize="card" />
        </FeedProvider>
    );
}
</code-snippet>
@endverbatim
