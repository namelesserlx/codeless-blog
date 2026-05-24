import { defineConfig, globalIgnores } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
    globalIgnores(['dist/**', 'node_modules/**']),
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            parserOptions: {
                tsconfigRootDir,
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                {
                    allowConstantExport: true,
                    extraHOCs: ['NiceModal'],
                },
            ],
        },
    },
    prettier,
]);
