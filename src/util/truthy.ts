export type Falsy = 0 | 0n | false | '' | null | undefined;

export type Truthy<T> = Exclude<T, Falsy>;

/**
 * Type predicate that checks if the given {@link value} is "truthy"
 * (that is, anything other than `null`, `undefined`, an empty string, `0`,
 * `false`, or `NaN`), and if so, narrows its TypeScript type to exclude
 * `null`, `undefined`, `0`, `false`, and `""` (empty string).
 *
 * @param value Value to check for truthiness.
 *
 * @returns `true` if {@link value} is truthy; otherwise `false`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Truthy
 */
export function isTruthy<T>(value: T | null | undefined): value is Truthy<T> {
  return !!value;
}
