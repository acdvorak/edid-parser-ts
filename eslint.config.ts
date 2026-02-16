import type { Plugin } from '@eslint/core';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import commandPlugin from 'eslint-plugin-command';
import importPlugin from 'eslint-plugin-import';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsESLint from 'typescript-eslint';

import type { CustomESLintConfigObjects, TSLintRuleMap } from './eslint-types';

const ext = `{ts,cts,mts,tsx,js,cjs,mjs}`;
const allFiles = [`**/*.${ext}`];
const rootFiles = [`*.${ext}`];

export default defineConfig([
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/out/**',
      '**/release/**',
      '**/data/**',
      '**/submodules/**',
    ],
  },

  {
    settings: {},

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  eslint.configs.recommended,
  tsESLint.configs.strictTypeChecked,
  tsESLint.configs.stylisticTypeChecked,

  {
    files: allFiles,

    plugins: {
      command: commandPlugin as Plugin,
      import: importPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },

    rules: {
      '@typescript-eslint/array-type': [
        'warn',
        {
          default: 'array-simple',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],

      '@typescript-eslint/dot-notation': [
        'error',
        {
          allowIndexSignaturePropertyAccess: true,
        },
      ],

      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],

      '@typescript-eslint/no-floating-promises': [
        'warn',
        {
          ignoreVoid: true,
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: [],
        },
      ] satisfies TSLintRuleMap['@typescript-eslint/no-empty-function'],

      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        {
          allowBoolean: true,
          allowNumber: true,
          allowRegExp: true,
          allowNullish: true,
        },
      ] satisfies TSLintRuleMap['@typescript-eslint/restrict-template-expressions'],

      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      'command/command': 'error',

      // Replaced by @typescript-eslint/no-empty-function
      'no-empty-function': 'off',

      // Replaced by @typescript-eslint/no-shadow
      'no-shadow': 'off',

      // Prohibit redundant renaming in imports, exports, and destructuring
      'no-useless-rename': 'error',

      // Require shorthand syntax in object literals
      'object-shorthand': 'error',

      'no-console': ['off', { allow: ['warn', 'error'] }],

      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      'import/no-cycle': [
        'error',
        {
          maxDepth: 5,
          ignoreExternal: true,
        },
      ],

      'simple-import-sort/exports': 'error',

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-in modules first
            ['^node:', '^\\u0000'],
            // External packages
            ['^@?[\\w-]'],
            // Parent imports (../)
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Sibling imports (./)
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Images
            ['.+[.](svg|png|gif|jpg|jpeg)$'],
          ],
        },
      ],
    },
  },

  {
    files: allFiles,
    ignores: rootFiles,

    rules: {
      'import/no-default-export': 'error',
    },
  },

  {
    files: [
      '**/*primitives.ts',
      '**/*Primitives.ts',
      '**/primitives.ts',
      '**/Primitives.ts',
      '**/*types.ts',
      '**/*Types.ts',
      '**/types.ts',
      '**/Types.ts',
    ],
    rules: {
      // forbid exporting any value declarations (functions, const, enums, etc.)
      'no-restricted-syntax': [
        'error',
        // prohibit importing values into types-only files
        {
          selector:
            "ImportDeclaration[importKind!='type'][specifiers.length=0]",
          message:
            'types files may only import types; side-effect imports are not allowed.',
        },
        {
          selector:
            "ImportDeclaration[importKind!='type'] ImportNamespaceSpecifier",
          message:
            'types files may only import types; use import type or move value imports elsewhere.',
        },
        {
          selector:
            "ImportDeclaration[importKind!='type'] ImportDefaultSpecifier",
          message:
            'types files may only import types; use import type or move value imports elsewhere.',
        },
        {
          selector:
            "ImportDeclaration[importKind!='type'] ImportSpecifier:not([importKind='type']):not([imported.name=/Enum$/i]):not([local.name=/Enum$/i])",
          message:
            'types files may only import types or enums; use import type or move value imports elsewhere.',
        },
        // default export of anything
        {
          selector: 'ExportDefaultDeclaration',
          message: 'types files may only export types',
        },
        // export * from './foo'
        {
          selector: 'ExportAllDeclaration',
          message: 'types files may only export types',
        },
        // export const/let/var/class/function or non-type declarations
        {
          selector:
            'ExportNamedDeclaration[declaration!=null][declaration.type!=' +
            "'TSTypeAliasDeclaration'][declaration.type!=" +
            "'TSInterfaceDeclaration'][declaration.type!='TSEnumDeclaration']" +
            "[declaration.type!='ClassDeclaration']",
          message:
            'types files may only export type aliases, interfaces, enums, or classes',
        },
        // export { Foo } from './bar' or export { Foo };
        {
          selector:
            "ExportNamedDeclaration[specifiers.length>0][exportKind!='type'] ExportSpecifier:not([exported.name=/Enum$/i]):not([local.name=/Enum$/i])",
          message: 'types files may only re-export types or enums',
        },
      ],
    },
  },

  prettierConfig,

  // Re-enable curly rule after prettier config
  // (prettier disables it by default).
  //
  // ⚠️ MUST BE LAST IN THE LIST!
  {
    files: allFiles,
    rules: {
      curly: ['error', 'all'],
    },
  },
] satisfies CustomESLintConfigObjects);
