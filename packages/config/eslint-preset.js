const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier/flat');
const tseslint = require('typescript-eslint');

const createBaseEslintConfig = ({ ignores = [] } = {}) => [
    {
        ignores: [...ignores],
    },
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                tsconfigRootDir: __dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    prettier,
];

module.exports = {
    createBaseEslintConfig,
};
