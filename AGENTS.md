# Styling: Tailwind is mandatory

Ship literal Tailwind v4 utilities in markup, including arbitrary values,
properties, variants and container queries. Tokens belong in the host's
`@theme`. No shipped CSS files, stylesheet import step, `<style>` blocks or
inline appearance styles. Fixed sets of values must use literal class strings.

`tests/Arch/TailwindTest.php` runs in the existing Pest CI matrix. It scans
executable markup under `resources/`, including Blade attribute-bag merges,
and rejects CSS files, style blocks and unlisted style bindings. Workbench,
build output, dependencies and Markdown usage examples are excluded.
`tests/tailwind-allowlist.php` holds exact snippets, occurrence counts and
one-line reasons for genuinely arbitrary runtime values Tailwind cannot
precompile. Prefer utilities. To add an exception, inventory the value,
explain why it is not a fixed set, add the smallest exact snippet and count,
and run the guard. Changed, missing and duplicated exceptions fail.

# Storyfeed UI

Free MIT renderer package for Storyfeed's versioned payload: Blade,
Vue/Inertia and React/Inertia kits. Core stays headless. Keep all three kits
in parity, use morph aliases and preserve payload compatibility.

## Gates and conventions

Read `README.md`, `package.json`, `composer.json`, the relevant kit README and
existing tests before editing. Work on a branch from latest `origin/main`.
Before commit and PR updates run:

- `vendor/bin/pest --no-configuration --bootstrap vendor/autoload.php tests`
- `vendor/bin/phpstan analyse`
- `vendor/bin/pint` (then `vendor/bin/pint --test`)
- `npm run test:vue`, `npm run test:react`, `npm run test:installed`
- `npm run typecheck:react` and `npm run workbench`
- For layout changes, run the applicable headless parity, alignment, wells,
  targets, hydration and bare-host checks from `package.json`.

Every change needs a regression test and an Unreleased changelog entry, with
an issue number when working on an issue. Local passing checks are one
configuration; inspect GitHub CI on the final PR commit before claiming green.
Stage files by explicit path and preserve unrelated work.

Commit as `Jasper Tey <jasper@teylabs.com>` with imperative, sentence-case
subjects. No attribution of any kind in commits or PRs: no co-authors,
generator notices, agent identifiers or session links. Open draft PRs with
what changed, verification and `Closes #N` when applicable. Never merge,
push to main, tag or release; the maintainer handles those steps.

This repository is public. Never publish secrets, local absolute paths,
private app or client names, or internal notes. Do not touch or describe
prior implementations without the local-only client-name guidance.
