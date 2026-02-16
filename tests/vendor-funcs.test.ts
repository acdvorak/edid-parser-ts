import { describe, expect, it } from 'vitest';

import { HWDATA_VENDOR_MAP } from '../gen/vids/hwdata-const';
import { LANSWEEPER_VENDOR_MAP } from '../gen/vids/lansweeper-const';
import { LINUXHW_VENDOR_MAP } from '../gen/vids/linuxhw-const';
import type { MergedVendorId } from '../gen/vids/merged-vid-types';
import { NOTABLE_VENDORS } from '../src/vids/notable-const';
import { getVendorInfo } from '../src/vids/vendor-funcs';

const NOTABLE_VENDOR_IDS = new Set<string>(
  NOTABLE_VENDORS.map((vendor) => vendor.vid),
);

const ALL_VIDS = Array.from(
  new Set<string>([
    ...NOTABLE_VENDOR_IDS,
    ...Object.keys(LINUXHW_VENDOR_MAP),
    ...Object.keys(LANSWEEPER_VENDOR_MAP),
    ...Object.keys(HWDATA_VENDOR_MAP),
  ]),
);

const MAPS = {
  linuxhw: LINUXHW_VENDOR_MAP as Record<string, string>,
  lansweeper: LANSWEEPER_VENDOR_MAP as Record<string, string>,
  hwdata: HWDATA_VENDOR_MAP as Record<string, string>,
};

const COMBINATION_KEYS = [
  '0001',
  '0010',
  '0011',
  '0100',
  '0101',
  '0110',
  '0111',
  '1000',
  '1001',
  '1010',
  '1011',
  '1100',
  '1101',
  '1110',
  '1111',
] as const;

function getCombinationKey(vid: string): string {
  return [
    NOTABLE_VENDOR_IDS.has(vid) ? '1' : '0',
    MAPS.linuxhw[vid] ? '1' : '0',
    MAPS.lansweeper[vid] ? '1' : '0',
    MAPS.hwdata[vid] ? '1' : '0',
  ].join('');
}

function getVidForCombination(comboKey: string): string | null {
  return ALL_VIDS.find((vid) => getCombinationKey(vid) === comboKey) ?? null;
}

describe('getVendorInfo', () => {
  it.each(COMBINATION_KEYS)(
    'uses highest-quality name for dataset combination %s',
    (comboKey) => {
      const vid = getVidForCombination(comboKey);
      expect(vid).not.toBeNull();
      if (!vid) {
        return;
      }

      const notableShortName =
        NOTABLE_VENDORS.find((vendor) => vendor.vid === vid)?.shortName ?? null;
      const linuxhwName = MAPS.linuxhw[vid] ?? null;
      const lansweeperName = MAPS.lansweeper[vid] ?? null;
      const hwdataName = MAPS.hwdata[vid] ?? null;

      const info = getVendorInfo(vid as MergedVendorId);
      const expectedGoodName =
        notableShortName || linuxhwName || lansweeperName || hwdataName || vid;

      expect(info.goodName).toBe(expectedGoodName);
    },
  );

  it('returns the VID itself for unknown/invalid values', () => {
    const info = getVendorInfo('XXX' as MergedVendorId);

    expect(info).toEqual({
      vid: 'XXX',
      goodName: 'XXX',
    });
  });
});
