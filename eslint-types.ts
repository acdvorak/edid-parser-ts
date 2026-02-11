/* eslint-disable @typescript-eslint/consistent-type-imports */

import type {
  ConfigObject,
  Plugin as ESPlugin,
  RuleConfig,
} from '@eslint/core';
import type TSESTree from '@typescript-eslint/typescript-estree';
import type { RuleModule as TSRuleModule } from '@typescript-eslint/utils/ts-eslint';
import type { Linter as ESLinter } from 'eslint';
import type { ESLintRules } from 'eslint/rules';
import type { PluginSettings as ImportPluginSettings } from 'eslint-import-context';
import type { IntClosedRange as Int, OmitIndexSignature } from 'type-fest';

import type { CompatibleConfigArray } from './node_modules/typescript-eslint/dist/compatibility-types';

/**
 * Defines a specific restriction zone within the ESLint configuration.
 *
 * @module `import/no-restricted-paths`
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md
 */
export interface ImportNoRestrictedPathsZone {
  /**
   * The path(s) that are restricted from being imported FROM.
   * Can be a single glob pattern string or an array of glob pattern strings.
   */
  from: string | string[];

  /**
   * The path(s) that are restricted from being imported INTO.
   * Can be a single glob pattern string or an array of glob pattern strings.
   */
  target: string | string[];

  /**
   * An optional array of glob patterns for paths that are exempt from this restriction,
   * even if they match the 'from' and 'target' criteria.
   */
  except?: string[];

  /**
   * An optional message to display when the restriction is violated.
   */
  message?: string;
}

/**
 * The configuration object for the 'no-restricted-paths' rule.
 * This corresponds to the single item in the ESLint rule's options array.
 *
 * @module `import/no-restricted-paths`
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md
 */
export interface ImportNoRestrictedPathsOptions {
  /**
   * An array of restriction zone objects, where each object defines a
   * 'from' path(s) that cannot import into a 'target' path(s).
   */
  zones: ImportNoRestrictedPathsZone[];

  /**
   * An optional base path to which all relative paths in 'from', 'target', and 'except'
   * are resolved.
   */
  basePath?: string;
}

/**
 * Enforces having one or more empty lines after the last top-level `import`
 * statement or `require` call.
 *
 * @module `import/newline-after-import`
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md
 */
export interface ImportNewlineAfterImportOptions {
  /**
   * Sets the number of newlines that are enforced after the last top-level
   * `import` statement or `require` call.
   *
   * @default 1
   */
  count?: number;

  /**
   * Enforce the exact numbers of newlines that is mentioned in count.
   *
   * @default false
   */
  exactCount?: boolean;

  /**
   * Enforces the rule on comments after the last import statement as well.
   *
   * @default false
   */
  considerComments?: boolean;
}

/**
 * Forbid a module from importing a module with a dependency path back to itself.
 *
 * @module `import/no-cycle`
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md
 */
export interface ImportNoCycleOptions {
  /**
   * Maximum dependency depth to traverse.
   */
  maxDepth?: Int<1, 100> | '∞';

  /**
   * Ignore external modules.
   *
   * @default false
   */
  ignoreExternal?: boolean;

  /**
   * Allow cyclic dependency if there is at least one dynamic import in the chain.
   *
   * @default false
   */
  allowUnsafeDynamicCyclicDependency?: boolean;

  /**
   * When true, don't calculate a strongly-connected-components graph.
   *
   * SCC is used to reduce the time-complexity of cycle detection,
   * but adds overhead.
   *
   * @default false
   */
  disableScc?: boolean;
}

/**
 * @module `simple-import-sort/imports`
 * @module `simple-import-sort/exports`
 * @see https://github.com/lydell/eslint-plugin-simple-import-sort?tab=readme-ov-file#sort-order
 */
export interface SimpleImportSortImportsOptions {
  /**
   * Each string is a regex (with the `u` flag).
   *
   * The regexes decide which imports go where.
   *
   * ⚠️ Remember to escape backslashes it's `"\\w"`, not `"\w"`, for example.
   *
   * - The inner arrays are joined with one newline.
   * - The outer arrays are joined with two newlines, creating a blank line.
   *
   * That's why there are two levels of arrays: it lets you choose where to have
   * blank lines.
   *
   * @see https://github.com/lydell/eslint-plugin-simple-import-sort?tab=readme-ov-file#custom-grouping
   */
  groups: string[][];
}

/**
 * @module `react-hooks/exhaustive-deps`
 * @see https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
 */
export interface ReactHooksExhaustiveDepsOptions {
  /**
   * Regex string to match the names of custom Hooks that have dependencies.
   *
   * ⚠️ Use this option very sparingly, if at all. Generally speaking, most
   * custom Hooks should **not** use the dependencies argument, and instead
   * provide a higher-level API that is more focused around a specific use case.
   *
   * @example "(useMyCustomHook|useMyOtherCustomHook)"
   */
  additionalHooks?: string;

  /**
   * Require that an explicit value be passed to the `deps` argument of
   * `useEffect()`, `useLayoutEffect()`, etc.
   *
   * - If a hook should only run *once*, on the first render, pass an empty
   *   dependency array (`[]`).
   * - If a hook should run on *every* render, pass `undefined`.
   *
   * @default false
   */
  requireExplicitEffectDeps: boolean;
}

/**
 * @module `react-refresh/only-export-components`
 * @see https://github.com/ArnaudBarre/eslint-plugin-react-refresh
 */
export interface ReactRefreshOnlyExportComponentsOptions {
  /**
   * If you use a framework that handles HMR of some specific exports,
   * you can use this option to avoid warning for them.
   *
   * @example
   * ```json
   * {
   *   "react-refresh/only-export-components": [
   *     "error",
   *     { "allowExportNames": ["meta", "links", "headers", "loader", "action"] }
   *   ]
   * }
   * ```
   */
  allowExportNames?: string[];

  /**
   * Don't warn when a constant (string, number, boolean, templateLiteral) is
   * exported aside one or more components.
   *
   * This should be enabled if the fast refresh implementation correctly handles
   * this case (HMR when the constant doesn't change, propagate update to
   * importers when the constant changes.). Vite supports it.
   *
   * Enabling this option allows code such as the following:
   *
   * ```ts
   * export const CONSTANT = 3;
   * export const Foo = () => <></>;
   * ```
   *
   * @default false // (true in vite config)
   */
  allowConstantExport?: boolean;

  /**
   * If you're exporting a component wrapped in a custom HOC, you can use this
   * option to avoid false positives.
   *
   * @example
   * ```json
   * {
   *   "react-refresh/only-export-components": [
   *     "error",
   *     { "customHOCs": ["observer", "withAuth"] }
   *   ]
   * }
   * ```
   */
  customHOCs?: string[];

  /**
   * If you're using JSX inside `.js` files (which I don't recommend because it
   * forces you to configure every tool you use to switch the parser), you can
   * still use the plugin by enabling this option. To reduce the number of false
   * positives, only files importing react are checked.
   *
   * @default false
   */
  checkJS?: boolean;
}

////////////////////////////////////////////////////////////////////////////////

type ESLintRuleName = keyof OmitIndexSignature<ESLintRules>;
type ESLintRuleMap = {
  [K in ESLintRuleName]: ESLintRules[K];
};

type ESLintRuleEntryOptions<T> =
  T extends ESLinter.RuleEntry<[Partial<infer O>]>
    ? { [K in keyof O]?: O[K] }
    : never;

type ExtractAllowArrayElement<T> =
  T extends ESLinter.RuleEntry<[Partial<infer O>]>
    ? O extends { allow?: ReadonlyArray<infer E> }
      ? E
      : never
    : never;

type ESNoEmptyFunctionAllowKind = ExtractAllowArrayElement<
  ESLintRules['no-empty-function']
>;

////////////////////////////////////////////////////////////////////////////////

type TSLintRules =
  typeof import('./node_modules/@typescript-eslint/eslint-plugin/dist/rules/index');

type TSLintRuleName = keyof TSLintRules;

type TSLintRuleOptionsFor<TOpts> =
  TOpts extends TSRuleModule<string, infer T extends readonly unknown[]>
    ? T
    : never;

type TSRuleConfig<K extends TSLintRuleName> = RuleConfig<
  TSLintRuleOptionsFor<TSLintRules[K]>
>;

type TSNoEmptyFunctionAllowKind =
  | 'private-constructors'
  | 'protected-constructors'
  | 'decoratedFunctions'
  | 'overrideMethods';

type ESNoEmptyFunctionOptions = ESLintRuleEntryOptions<
  ESLintRules['no-empty-function']
>;

type TSNoEmptyFunctionOptions = Omit<ESNoEmptyFunctionOptions, 'allow'> & {
  allow?: Array<ESNoEmptyFunctionAllowKind | TSNoEmptyFunctionAllowKind>;
};

export type TSLintRuleMap = {
  [K in `@typescript-eslint/${TSLintRuleName}`]: K extends `@typescript-eslint/${infer R}`
    ? 'no-empty-function' extends R
      ? RuleConfig<[TSNoEmptyFunctionOptions]>
      : TSRuleConfig<R & TSLintRuleName>
    : never;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * @see `node_modules/eslint-plugin-import/lib/index.js`
 */
type ImportRuleName =
  | 'consistent-type-specifier-style'
  | 'default'
  | 'dynamic-import-chunkname'
  | 'enforce-node-protocol-usage'
  | 'export'
  | 'exports-last'
  | 'extensions'
  | 'first'
  | 'group-exports'
  | 'imports-first'
  | 'max-dependencies'
  | 'named'
  | 'namespace'
  | 'newline-after-import'
  | 'no-absolute-path'
  | 'no-amd'
  | 'no-anonymous-default-export'
  | 'no-commonjs'
  | 'no-cycle'
  | 'no-default-export'
  | 'no-deprecated'
  | 'no-duplicates'
  | 'no-dynamic-require'
  | 'no-empty-named-blocks'
  | 'no-extraneous-dependencies'
  | 'no-import-module-exports'
  | 'no-internal-modules'
  | 'no-mutable-exports'
  | 'no-named-as-default-member'
  | 'no-named-as-default'
  | 'no-named-default'
  | 'no-named-export'
  | 'no-namespace'
  | 'no-nodejs-modules'
  | 'no-relative-packages'
  | 'no-relative-parent-imports'
  | 'no-restricted-paths'
  | 'no-self-import'
  | 'no-unassigned-import'
  | 'no-unresolved'
  | 'no-unused-modules'
  | 'no-useless-path-segments'
  | 'no-webpack-loader-syntax'
  | 'order'
  | 'prefer-default-export'
  | 'unambiguous';

type ImportRuleMap = {
  [K in `import/${ImportRuleName}`]: 'import/no-restricted-paths' extends K
    ? RuleConfig<[ImportNoRestrictedPathsOptions]>
    : 'import/newline-after-import' extends K
      ? RuleConfig<[ImportNewlineAfterImportOptions]>
      : 'import/no-cycle' extends K
        ? RuleConfig<[ImportNoCycleOptions]>
        : 'import/first' extends K
          ? RuleConfig<never[]>
          : 'import/no-duplicates' extends K
            ? RuleConfig<
                [{ considerQueryString?: boolean; 'prefer-inline'?: boolean }]
              >
            : RuleConfig<never[]>;
};

////////////////////////////////////////////////////////////////////////////////

interface SimpleImportSortRuleMap {
  'simple-import-sort/imports': RuleConfig<[SimpleImportSortImportsOptions]>;
  'simple-import-sort/exports': RuleConfig<[SimpleImportSortImportsOptions]>;
}

////////////////////////////////////////////////////////////////////////////////

export interface CommandRuleMap {
  'command/command': RuleConfig<never[]>;
}

////////////////////////////////////////////////////////////////////////////////

export type AllRulesMap = Partial<
  | ESLintRuleMap
  | TSLintRuleMap
  | ImportRuleMap
  | SimpleImportSortRuleMap
  | CommandRuleMap
>;

////////////////////////////////////////////////////////////////////////////////

export type TSLanguageOptions = ESLinter.LanguageOptions & {
  parserOptions?: TSESTree.TSESTreeOptions;
};

export interface CustomESLintConfigObject extends ConfigObject<AllRulesMap> {
  languageOptions?: TSLanguageOptions;

  // @keep-sorted
  plugins?: {
    'simple-import-sort'?: ESPlugin;
    'starchart-rules'?: ESPlugin;
    command?: ESPlugin;
    import?: ESPlugin;
  };

  settings?: ImportPluginSettings & {
    'import-x/parsers'?: {
      '@typescript-eslint/parser': Array<`.${string}`>;
    };
  };
}

export type CustomESLintConfigObjects = Array<
  CustomESLintConfigObject | CompatibleConfigArray
>;
