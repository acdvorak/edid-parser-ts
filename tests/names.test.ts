import { describe, expect, it } from 'vitest';

import { normalizeCompanySuffixes, sanitizeName } from '../src/util/names';

describe('names utils', () => {
  describe('normalizeCompanySuffixes', () => {
    it.each([
      [' Acme inc ', 'Acme Inc.'],
      ['Acme int’l', "Acme Int'l"],
      ['Acme s.d.n. b.h.d.', 'Acme Sdn. Bhd.'],
      ['Acme co ltd', 'Acme Co., Ltd.'],
      ['Acme co.ltd', 'Acme Co., Ltd.'],
      ['Acme Corporation Limited', 'Acme Corp. Ltd.'],
      ['Acme International', 'Acme International'],
      ['Acme A/S', 'Acme A.S.'],
    ])('normalizes %s', (input: string, expected: string) => {
      expect(normalizeCompanySuffixes(input)).toBe(expected);
    });
  });

  describe('sanitizeName', () => {
    it.each([
      ['  foo\u00a0bar  ', 'Foo Bar'],
      ['abc‒def – ghi — jkl', 'Abc-Def - Ghi - Jkl'],
      ['“foo” and ‘bar’', `Foo" and 'Bar'`],
      ['Acme,Inc', 'Acme, Inc.'],
      ['Acme co.ltd', 'Acme Co., Ltd.'],
      ['Insturment Corpration Enterpise', 'Instrument Corp. Enterprise'],
      ['G2TOUCH KOREA CO LTD', 'G2Touch Korea Co., Ltd.'],
      ['foo /iEi', 'foo / iEi'],
      ['( Foo )', 'Foo)'],
      ['Lacie', 'LaCie'],
      ['MiTac', 'MiTAC'],
      ['apple', 'apple'],
    ])('sanitizes %s', (input: string, expected: string) => {
      expect(sanitizeName(input)).toBe(expected);
    });

    it.each([
      'Other',
      'Others',
      'Do not use this',
      'Indicates an identity defined by something else',
    ])('removes placeholder/blocked name: %s', (input: string) => {
      expect(sanitizeName(input)).toBe('');
    });
  });
});
