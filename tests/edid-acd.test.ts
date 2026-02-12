/**
 * @license MIT
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type { PartialDeep } from 'type-fest';
import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/edid-parser-functions';
import type { ParsedEdid } from '../src/edid-parser-types';

import {
  APPLE_TB27_BYTES,
  DELL_ST2320L_BYTES,
  SAMSUNG_S95C_BYTES,
} from './edid-test-data';

describe('EDID Parser - ACD Test Data', () => {
  describe('Samsung S95C', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(SAMSUNG_S95C_BYTES);

      expect(parsed.bytes.byteLength).toBe(512);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        headerValid: true,
        checksumValid: true,
        baseBlock: {
          vendorId: 'SAM',
          vendorName: 'Samsung Electric Company',
          vendorBrand: 'Samsung',
          productCode: 29605,
          serialNumber: 16780800,
          manufactureWeek: 1,
          manufactureYear: 2023,
          manufactureDate: '1/2023',
          edidVersion: 1,
          edidRevision: 3,
          edidVersionString: '1.3',
        },
        extensions: [
          {
            extensionType: 'cta-861',
            underscan: true,
            basicAudio: true,
            ycbcr444: true,
            ycbcr422: true,
            checksumValid: true,
          },
          {
            extensionType: 'cta-861',
            underscan: true,
            basicAudio: true,
            ycbcr444: true,
            ycbcr422: true,
            checksumValid: true,
          },
          {
            // TODO(acdvorak): Update parser to support whatever this extension is
            extensionType: 'unknown',
            checksumValid: true,
          },
        ],
      });
    });
  });

  describe('Apple Thunderbolt 27in', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(APPLE_TB27_BYTES);

      expect(parsed.bytes.byteLength).toBe(256);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        warnings: [],
        headerValid: true,
        checksumValid: true,
        expectedExtensionCount: 1,
        baseBlock: {
          vendorId: 'APP',
          vendorName: 'Apple Computer',
          vendorBrand: 'Apple',
          productCode: 37415,
          serialNumber: 437063866,
          manufactureWeek: 13,
          manufactureYear: 2016,
          manufactureDate: '13/2016',
          edidVersion: 1,
          edidRevision: 4,
          edidVersionString: '1.4',
        },
        extensions: [
          {
            underscan: true,
            basicAudio: true,
            ycbcr444: false,
            extensionType: 'cta-861',
          },
        ],
      });
    });
  });

  describe('Dell ST2320L', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(DELL_ST2320L_BYTES);

      expect(parsed.bytes.byteLength).toBe(256);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        warnings: [],
        headerValid: true,
        checksumValid: true,
        expectedExtensionCount: 1,
        baseBlock: {
          headerValid: true,
          headerValidity: 'OK',
          vendorId: 'DEL',
          vendorName: 'Dell',
          vendorBrand: 'Dell',
          productCode: 61476,
          serialNumber: 1127761737,
          manufactureWeek: 28,
          manufactureYear: 2012,
          manufactureDate: '28/2012',
          edidVersion: 1,
          edidRevision: 3,
          edidVersionString: '1.3',
          numberOfExtensions: 1,
          checksum: 52,
          checksumValid: true,
        },
        extensions: [
          {
            underscan: true,
            basicAudio: true,
            ycbcr444: true,
            ycbcr422: true,
            extensionType: 'cta-861',
            checksumValid: true,
          },
        ],
      });
    });
  });
});
