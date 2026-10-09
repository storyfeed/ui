{{--
    Storyfeed/Body/Table: a standard table inside Typography's `prose`, footer
    rows in a `<tfoot>`. Cells are plain text that keeps its line breaks, a
    number, a link, or nothing (drawn as a dash).
--}}
@props(['body', 'entity' => null])

@php($table = \Storyfeed\Ui\Support\TableBody::read($body))
@if ($table !== null)
    <figure {{ $attributes->class('sf-table-block m-0 min-w-0 max-w-144 rounded-lg bg-card px-4 py-3') }}>
@if ($table['title'] !== null)
        <figcaption class="sf-table__title mb-1 text-sm text-foreground">{{ $table['title'] }}</figcaption>
@endif
        <div class="sf-table__prose overflow-x-auto prose max-w-none text-[length:inherit] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-border)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)] [&_table]:my-0 [&_table]:w-full [&_:is(th,td)]:whitespace-pre-line [&_tfoot_td]:font-semibold [&_tfoot_td]:text-foreground" tabindex="0">
            <table class="sf-table">
@if ($table['headers'] !== [])
                <thead><tr>@foreach ($table['headers'] as $header)<th>{{ $header }}</th>@endforeach</tr></thead>
@endif
@foreach (['tbody' => $table['rows'], 'tfoot' => $table['footer']] as $section => $rows)
@if ($rows !== [])
                <{{ $section }}>
@foreach ($rows as $row)
                    <tr>@foreach ($row as $cell)<td>@php($link = is_array($cell) ? \Storyfeed\Ui\Support\Links::body($cell, $entity) : null)@if ($link !== null)<a href="{{ $link['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($link['attributes']))->class('sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline') }}>{{ $cell['label'] }}</a>@elseif (is_array($cell)){{ $cell['label'] }}@elseif ($cell === null)<span class="sf-table__empty text-muted-foreground">—</span>@else{{ $cell }}@endif</td>@endforeach</tr>
@endforeach
                </{{ $section }}>
@endif
@endforeach
            </table>
        </div>
    </figure>
@endif
