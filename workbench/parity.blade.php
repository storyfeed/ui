<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Blade parity</title><link rel="stylesheet" href="app.css"></head>
<body><main class="comparison single"><article class="pane converted"><h1>Blade</h1>{!! $main !!}
@foreach ($examples as $label => $markup)
<section class="example"><h2>{{ $label }}</h2>{!! $markup !!}</section>
@endforeach
</article></main></body></html>
