import { describe, expect, it } from 'vitest';

import {
  computeDiagonalInches,
  computeDiagonalMm,
} from '../src/parser/parser-utils';

describe('computeDiagonalMm', () => {
  it('computes a known real-world display diagonal in millimeters', () => {
    expect(computeDiagonalMm(600, 340)).toBe(689.6);
  });

  it('computes an exact 3-4-5 triangle diagonal', () => {
    expect(computeDiagonalMm(3, 4)).toBe(5);
  });

  it('returns zero for a zero-sized display', () => {
    expect(computeDiagonalMm(0, 0)).toBe(0);
  });

  it('handles negative dimensions by using Euclidean magnitude', () => {
    expect(computeDiagonalMm(-3, 4)).toBe(5);
    expect(computeDiagonalMm(-3, -4)).toBe(5);
  });

  it('rounds to one decimal place', () => {
    expect(computeDiagonalMm(1, 1)).toBe(1.4);
    expect(computeDiagonalMm(10.05, 0)).toBe(10.1);
  });

  it.each<[number | null | undefined, number | null | undefined]>([
    [null, 100],
    [100, null],
    [undefined, 100],
    [100, undefined],
    [NaN, 100],
    [100, NaN],
    [Number.POSITIVE_INFINITY, 100],
    [100, Number.NEGATIVE_INFINITY],
  ])('returns undefined for invalid inputs: (%s, %s)', (width, height) => {
    expect(computeDiagonalMm(width, height)).toBeUndefined();
  });
});

describe('computeDiagonalInches', () => {
  it('computes a known real-world display diagonal in inches', () => {
    expect(computeDiagonalInches(600, 340)).toBe(27.2);
  });

  it('converts an exact 25.4 mm diagonal to 1.0 inch', () => {
    expect(computeDiagonalInches(25.4, 0)).toBe(1);
  });

  it('returns zero when the millimeter diagonal is zero', () => {
    expect(computeDiagonalInches(0, 0)).toBe(0);
  });

  it('handles negative dimensions by using Euclidean magnitude', () => {
    expect(computeDiagonalInches(-25.4, 0)).toBe(1);
    expect(computeDiagonalInches(-3, -4)).toBe(0.2);
  });

  it.each<[number | null | undefined, number | null | undefined]>([
    [null, 100],
    [100, null],
    [undefined, 100],
    [100, undefined],
    [NaN, 100],
    [100, NaN],
    [Number.POSITIVE_INFINITY, 100],
    [100, Number.NEGATIVE_INFINITY],
  ])('returns undefined for invalid inputs: (%s, %s)', (width, height) => {
    expect(computeDiagonalInches(width, height)).toBeUndefined();
  });
});
