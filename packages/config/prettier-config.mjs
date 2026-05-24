/** @type {import("prettier").Config} */
const prettierConfig = {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    jsxSingleQuote: false,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'always',
    endOfLine: 'lf',
    plugins: ['prettier-plugin-tailwindcss'],
    tailwindFunctions: ['clsx', 'cn'],
    overrides: [
        {
            files: ['*.json', '*.jsonc'],
            options: {
                parser: 'json',
                tabWidth: 4,
            },
        },
        {
            files: ['*.yaml', '*.yml'],
            options: {
                parser: 'yaml',
                tabWidth: 4,
            },
        },
    ],
};

export default prettierConfig;
