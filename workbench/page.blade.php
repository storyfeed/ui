<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Storyfeed UI · Tailwind workbench</title>
    <link rel="stylesheet" href="app.css">
</head>
<body class="bg-background text-foreground">
    <main class="mx-auto max-w-3xl px-6 py-10">
        <header class="mb-10 border-b border-border pb-6">
            <h1 class="text-2xl font-semibold tracking-tight">Storyfeed UI</h1>
            <p class="mt-2 text-sm text-muted-foreground">Blade components · Tailwind CSS v4</p>
        </header>
        @foreach ($sections as $label => $markup)
            <section aria-label="{{ $label }}" class="mb-8">
                <h2 class="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{{ $label }}</h2>
                {!! $markup !!}
            </section>
        @endforeach
    </main>
</body>
</html>
