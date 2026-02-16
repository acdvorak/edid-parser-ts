import type { Config } from 'prettier';

const config: Config = {
  arrowParens: 'always',
  embeddedLanguageFormatting: 'auto',
  endOfLine: 'lf',
  jsxSingleQuote: false,
  plugins: ['prettier-plugin-curly'],
  printWidth: 80,
  proseWrap: 'always',
  quoteProps: 'as-needed',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,

  overrides: [
    {
      files: [
        '*.jsonc',
        'launch.json',
        'mcp.json',
        'settings.json',
        'tasks.json',
        'tsconfig.json',
        'tsconfig.*.json',
      ],
      options: {
        parser: 'jsonc',
        singleQuote: false,
        quoteProps: 'preserve',
      },
    },
  ],
};

export default config;
