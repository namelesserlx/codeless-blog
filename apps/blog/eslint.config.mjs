import { defineConfig, globalIgnores } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    prettier,
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir,
            },
        },
    },
    {
        files: ['*.config.js', '*.config.cjs', '.prettierrc.js', '.prettierrc.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        rules: {
            'react-hooks/purity': 'off',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
]);
