export interface CompareStringsOptions {
  case?: 'sensitive' | 'insensitive';
}

/**
 * Case-INsensitive by default.
 *
 * @param a First string to compare.
 * @param b Second string to compare.
 * @param options Options.
 * @returns Sort order.
 */
export function compareStrings(
  a: string | null | undefined,
  b: string | null | undefined,
  options: CompareStringsOptions = {},
): number {
  const missingA = a === null || typeof a === 'undefined';
  const missingB = b === null || typeof b === 'undefined';

  if (missingA && missingB) {
    return 0;
  }
  if (missingA) {
    return -1;
  }
  if (missingB) {
    return 1;
  }

  return a.localeCompare(b, undefined, {
    sensitivity: options.case === 'sensitive' ? undefined : 'base',
    usage: 'sort',
  });
}

export function toLowerCase<T extends string>(str: T): T {
  return str.toLocaleLowerCase() as T;
}

/**
 * Shorthand function to perform a case-INsensitive, locale-aware comparison
 * of two strings, or two objects that both have a `.name` property.
 */
export function caseInsensitive<T extends string>(
  a: T | null | undefined,
  b: T | null | undefined,
): number {
  const missingA = a === null || typeof a === 'undefined';
  const missingB = b === null || typeof b === 'undefined';
  if (missingA && missingB) {
    return 0;
  }
  if (missingA) {
    return -1;
  }
  if (missingB) {
    return 1;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return compareStrings(a, b);
  }
  return 0;
}
