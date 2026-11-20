// The rules a host app commonly runs over the published Vue kit (ui#122).
// Lints the files `storyfeed:ui vue` copies: resources/js/vue and resources/js/shared.
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const rules = {
    curly: ['error', 'all'],
    'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['block-like'], next: '*' },
        { blankLine: 'always', prev: '*', next: ['block-like'] },
    ],
    // import/consistent-type-specifier-style 'prefer-top-level', without the import plugin.
    'no-restricted-syntax': ['error', { selector: "ImportSpecifier[importKind='type']", message: 'Use a separate `import type` statement.' }],
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
};

export default [
    {
        files: ['resources/js/vue/**/*.ts', 'resources/js/shared/**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { '@typescript-eslint': tseslint.plugin },
        rules,
    },
    {
        files: ['resources/js/vue/**/*.vue'],
        languageOptions: { parser: vueParser, parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
        plugins: { '@typescript-eslint': tseslint.plugin },
        rules,
    },
];
