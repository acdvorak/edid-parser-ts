/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

export type Primitive = string | number | boolean | bigint | null | undefined;

export function isString<T extends string>(value: unknown): value is T {
  return typeof value === 'string';
}

export function isRegExp<T extends RegExp>(value: unknown): value is T {
  return typeof value === 'object' && value instanceof RegExp;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFunction<T extends (...args: any[]) => any>(
  value: unknown,
): value is T {
  return typeof value === 'function';
}

export function isPrimitive(value: unknown): value is Primitive {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'undefined' ||
    value === null
  );
}
