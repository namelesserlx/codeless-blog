import { defineConfig, globalIgnores } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
    globalIgnores([
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/build/**',
        '**/coverage/**',
        '**/public/**',
    ]),
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                tsconfigRootDir,
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
    {
        files: [
            '**/*.config.js',
            '**/*.config.cjs',
            '**/.prettierrc.js',
            '**/.prettierrc.cjs',
            '**/.lintstagedrc.js',
            'commitlint.config.js',
            'packages/config/*.js',
        ],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    prettier,
]);
