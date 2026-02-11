/**
 * @fileoverview Integration tests for the EDID parser covering modern display
 * capabilities including 8K, HDR, HDMI 2.1, VRR, and OLED features across
 * various display types.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidIntegrationSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import * as fs from 'fs/promises';
import { describe, expect, it } from 'vitest';

import {
  isExtendedTagBlock,
  isVendorBlock,
  isVideoBlock,
  parseEdid,
} from '../src/edid-parser';
import type {
  DataBlock,
  ExtendedTagDataBlock,
  ParsedEdid,
} from '../src/edid-types';

import {
  createFullEdidArray,
  FAKE_ASUS_8K120_GAMING,
  fixChecksums,
  LG_C9_4K60_HDMI21_GAMING,
  SAMSUNG_Q800T_8K60_HDMI21_GAMING,
} from './edid-test-data';

/**
 * Samsung S95C series, model QN65S95CAF, mfg. 2023.
 *
 * - 4K UHD
 * - HDR10+
 * - 144 Hz max
 * - VRR up to 120 Hz
 *
 * @see https://www.displayspecifications.com/en/model/fcb13131
 * @see https://www.flatpanelshd.com/samsung_qs95c_qdoled_2023.php
 */
const SAMSUNG_S95C_BYTES = new Uint8Array([
  0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0xa5, 0x73, 0x00,
  0x0e, 0x00, 0x01, 0x01, 0x21, 0x01, 0x03, 0x80, 0x8e, 0x50, 0x78, 0x0a, 0xf4,
  0x11, 0xb2, 0x4a, 0x41, 0xb3, 0x26, 0x0e, 0x50, 0x54, 0xbd, 0xef, 0x80, 0x71,
  0x4f, 0x81, 0xc0, 0x81, 0x00, 0x81, 0x80, 0x95, 0x00, 0xa9, 0xc0, 0xb3, 0x00,
  0xd1, 0xc0, 0x08, 0xe8, 0x00, 0x30, 0xf2, 0x70, 0x5a, 0x80, 0xb0, 0x58, 0x8a,
  0x00, 0x50, 0x1d, 0x74, 0x00, 0x00, 0x1e, 0x6f, 0xc2, 0x00, 0xa0, 0xa0, 0xa0,
  0x55, 0x50, 0x30, 0x20, 0x35, 0x00, 0x50, 0x1d, 0x74, 0x00, 0x00, 0x1a, 0x00,
  0x00, 0x00, 0xfd, 0x00, 0x18, 0x78, 0x0f, 0xff, 0x8f, 0x00, 0x0a, 0x20, 0x20,
  0x20, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00, 0xfc, 0x00, 0x51, 0x43, 0x51, 0x39,
  0x35, 0x53, 0x0a, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x01, 0x1e, 0x02, 0x03,
  0x75, 0xf0, 0xe2, 0x78, 0x03, 0x5a, 0x61, 0x60, 0x65, 0x66, 0x75, 0x76, 0xda,
  0xdb, 0x10, 0x1f, 0x04, 0x13, 0x05, 0x14, 0x20, 0x21, 0x22, 0x40, 0x3f, 0x5d,
  0x5e, 0x5f, 0x62, 0x64, 0x03, 0x12, 0x2f, 0x0d, 0x57, 0x07, 0x09, 0x07, 0x07,
  0x15, 0x07, 0x50, 0x57, 0x07, 0x01, 0x67, 0x54, 0x07, 0x83, 0x0f, 0x00, 0x00,
  0xe2, 0x00, 0x4f, 0xe3, 0x05, 0xc3, 0x01, 0x6e, 0x03, 0x0c, 0x00, 0x20, 0x00,
  0xb8, 0x44, 0x28, 0x00, 0x80, 0x01, 0x02, 0x03, 0x04, 0x6d, 0xd8, 0x5d, 0xc4,
  0x01, 0x78, 0x80, 0x5b, 0x42, 0x30, 0x90, 0xd1, 0x34, 0x05, 0xe3, 0x06, 0x0d,
  0x01, 0xe2, 0x0f, 0xff, 0xe5, 0x01, 0x8b, 0x84, 0x90, 0x81, 0x6d, 0x1a, 0x00,
  0x00, 0x02, 0x07, 0x30, 0x90, 0x00, 0x04, 0x76, 0x02, 0x4b, 0x02, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xb9, 0x02, 0x03, 0x04, 0xf0,
  0x58, 0x4d, 0x00, 0xb8, 0xa1, 0x38, 0x14, 0x40, 0xf8, 0x2c, 0x45, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x1e, 0x5c, 0xc1, 0x00, 0xe4, 0xa2, 0x38, 0xaa, 0x40,
  0x24, 0x2c, 0x45, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0xcf, 0xcb, 0x00,
  0x80, 0xf5, 0x40, 0x3a, 0x60, 0x20, 0xa0, 0x3a, 0x50, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x1c, 0x1a, 0x68, 0x00, 0xa0, 0xf0, 0x38, 0x1f, 0x40, 0x30, 0x20, 0x3a,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1a, 0x74, 0xd6, 0x00, 0xa0, 0xf0, 0x38,
  0x40, 0x40, 0x30, 0x20, 0x3a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1a, 0x5a,
  0x87, 0x80, 0xa0, 0x70, 0x38, 0x4d, 0x40, 0x30, 0x20, 0x35, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x70, 0x12, 0x79, 0x00, 0x00, 0x03,
  0x01, 0x64, 0x26, 0xaf, 0x01, 0x08, 0xff, 0x0e, 0xef, 0x05, 0x4f, 0x01, 0xa7,
  0x01, 0x3f, 0x06, 0x74, 0x00, 0x02, 0x80, 0x09, 0x00, 0x51, 0x2c, 0x02, 0x08,
  0xff, 0x0e, 0x2f, 0x02, 0xf7, 0x80, 0x1f, 0x00, 0x6f, 0x08, 0x59, 0x00, 0x4b,
  0x00, 0x07, 0x00, 0xea, 0xb7, 0x00, 0x08, 0xff, 0x09, 0xab, 0x00, 0x07, 0x80,
  0x1f, 0x00, 0x37, 0x04, 0x75, 0x00, 0x3e, 0x00, 0x07, 0x00, 0x86, 0x94, 0x01,
  0x08, 0xff, 0x0e, 0x67, 0x01, 0x93, 0x80, 0x1f, 0x00, 0x3f, 0x06, 0x71, 0x00,
  0x63, 0x00, 0x07, 0x00, 0x1d, 0xff, 0x00, 0x08, 0xff, 0x0e, 0x4f, 0x00, 0x07,
  0x80, 0x1f, 0x00, 0x37, 0x04, 0x4c, 0x00, 0x3e, 0x00, 0x07, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xa2, 0x90,
]);

function getDataBlocks(parsed: ParsedEdid): DataBlock[] {
  return (parsed.extensions[0]?.dataBlockCollection ?? []).filter(
    (block): block is DataBlock => Boolean(block),
  );
}

function getExtendedTagValue(block: ExtendedTagDataBlock): number | undefined {
  if (typeof block.extendedTag === 'number') {
    return block.extendedTag;
  }
  return block.extendedTag?.value;
}

describe('EDID Parser Integration Tests', () => {
  describe('Complete Modern Display Integration', () => {
    it('writes file', async () => {
      const parsed = parseEdid(SAMSUNG_S95C_BYTES);
      await fs.writeFile(
        '/tmp/samsung_s95c_edid.json',
        JSON.stringify(parsed, null, 2),
      );
    });

    it('should parse complete EDID without errors', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      expect(parsed.baseBlock.headerValidity).toBe('OK');
      expect(parsed.baseBlock.numberOfExtensions).toBe(1);
    });

    it('should detect all modern display capabilities', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      expect(parsed.baseBlock.eisaId).toBe('SAM');
      expect(parsed.baseBlock.edidVersionString).toBe('1.3');
      expect(parsed.extensions[0]?.extTag).toBe(0x02);
      expect(getDataBlocks(parsed).length).toBeGreaterThan(5);
    });

    it('should parse 8K video capabilities', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const videoBlock = getDataBlocks(parsed).find(isVideoBlock);
      expect(videoBlock).toBeDefined();
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(15);

      const supports8k =
        videoBlock?.shortVideoDescriptors.some((svd) => svd.vic >= 218) ??
        false;
      expect(supports8k).toBe(true);
    });

    it('should detect HDR capabilities', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
    });

    // TODO(acdvorak): Implement parser support
    it.skip('should detect HDMI 2.1 gaming features', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const hdmiForumBlock = getDataBlocks(parsed)
        .filter(isVendorBlock)
        .find((block) => block.ieeeIdentifier === 0xc45dd8);

      expect(hdmiForumBlock).toBeDefined();
      expect(hdmiForumBlock?.vrrMin).toBeGreaterThan(0);
    });

    it('should detect wide color gamut support', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const colorimetryBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 5);

      expect(colorimetryBlock).toBeDefined();
      expect(colorimetryBlock?.supportsBT2020RGB).toBe(true);
    });
  });

  describe('Gaming Monitor Integration', () => {
    it('should detect high refresh rate capabilities', () => {
      const gamingData = fixChecksums(FAKE_ASUS_8K120_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(gamingData)),
      );

      const videoBlock = getDataBlocks(parsed).find(isVideoBlock);
      expect(videoBlock).toBeDefined();
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(0);

      expect(
        videoBlock?.shortVideoDescriptors.some(
          (svd) => svd.vic >= 118 && svd.vic <= 120,
        ),
      ).toBe(true);
    });

    it('should detect VRR range information', () => {
      const gamingData = fixChecksums(FAKE_ASUS_8K120_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(gamingData)),
      );

      const hdmiForumScdb = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 0x79);

      expect(hdmiForumScdb).toBeDefined();

      const vrrMin = hdmiForumScdb?.vrrMin;
      const vrrMax = hdmiForumScdb?.vrrMax;

      expect(vrrMin).toBeDefined();
      expect(vrrMin).toBeGreaterThan(0);

      expect(vrrMax).toBeDefined();
      expect(vrrMax).toBeGreaterThan(vrrMin ?? Number.MAX_SAFE_INTEGER);
      expect(vrrMax).toBeLessThanOrEqual(240);
    });

    // TODO(acdvorak): Implement parser support
    it.skip('should detect gaming-optimized features', () => {
      const gamingData = fixChecksums(FAKE_ASUS_8K120_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(gamingData)),
      );

      const videoCapBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 0);

      expect(videoCapBlock?.supportsQMS).toBe(true);
    });
  });

  describe('Professional OLED Integration', () => {
    it('should detect OLED-specific capabilities', () => {
      const lgData = fixChecksums(LG_C9_4K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(lgData)),
      );

      expect(parsed.baseBlock.headerValidity).toBe('OK');
      expect(parsed.baseBlock.numberOfExtensions).toBe(1);
    });

    // TODO(acdvorak): Implement parser support
    it.skip('should detect premium HDR support', () => {
      const lgData = fixChecksums(LG_C9_4K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(lgData)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(
        hdrBlock?.supportedEOTFs?.some((eotf) =>
          ['SMPTE ST2084 (PQ)', 'Hybrid Log-Gamma (HLG)'].includes(eotf),
        ),
      ).toBe(true);
    });

    // TODO(acdvorak): Implement parser support
    it.skip('should detect cinema-grade color support', () => {
      const lgData = fixChecksums(LG_C9_4K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(lgData)),
      );

      const colorimetryBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 5);

      expect(
        colorimetryBlock?.supportsBT2020RGB ||
          colorimetryBlock?.supportsBT2020YCC,
      ).toBe(true);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle multiple display types consistently', () => {
      const testDisplays = [
        SAMSUNG_Q800T_8K60_HDMI21_GAMING,
        FAKE_ASUS_8K120_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
      ];

      for (const displayData of testDisplays) {
        const fixed = fixChecksums(displayData);
        const parsed = parseEdid(
          new Uint8ClampedArray(createFullEdidArray(fixed)),
        );

        expect(parsed.baseBlock.headerValidity).toBe('OK');
        expect(parsed.baseBlock.numberOfExtensions).toBe(1);
        expect(getDataBlocks(parsed).length).toBeGreaterThan(0);
      }
    });

    it('should maintain consistent checksum validation', () => {
      const testDisplays = [
        SAMSUNG_Q800T_8K60_HDMI21_GAMING,
        FAKE_ASUS_8K120_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
      ];

      for (const displayData of testDisplays) {
        const fixed = fixChecksums(displayData);
        const parsed = parseEdid(
          new Uint8ClampedArray(createFullEdidArray(fixed)),
        );

        expect(parsed.baseBlock.checksumValid).toBe(true);
        expect(parsed.extensions[0]?.checksumValid).toBe(true);
      }
    });
  });

  describe('Feature Detection Accuracy', () => {
    it('should accurately identify display generation', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const allBlocks = getDataBlocks(parsed);
      const vendorBlocks = allBlocks.filter(isVendorBlock);
      const extendedBlocks = allBlocks.filter(isExtendedTagBlock);
      const videoBlocks = allBlocks.filter(isVideoBlock);

      const hasHDMI21Features = vendorBlocks.some(
        (block) => block.ieeeIdentifier === 0xc45dd8,
      );

      const hasHDRSupport = extendedBlocks.some(
        (block) => getExtendedTagValue(block) === 6,
      );

      const has8KSupport = videoBlocks.some((block) =>
        block.shortVideoDescriptors.some((svd) => svd.vic >= 200),
      );

      expect(hasHDMI21Features || hasHDRSupport || has8KSupport).toBe(true);
    });

    it('should detect next-generation features', () => {
      const allDisplays = [
        SAMSUNG_Q800T_8K60_HDMI21_GAMING,
        FAKE_ASUS_8K120_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
      ];

      let foundModernFeatures = 0;

      for (const display of allDisplays) {
        const fixed = fixChecksums(display);
        const parsed = parseEdid(
          new Uint8ClampedArray(createFullEdidArray(fixed)),
        );

        const allBlocks = getDataBlocks(parsed);
        const vendorBlocks = allBlocks.filter(isVendorBlock);
        const extendedBlocks = allBlocks.filter(isExtendedTagBlock);

        foundModernFeatures += extendedBlocks.filter((block) => {
          const extendedTag = getExtendedTagValue(block);
          return (
            extendedTag !== undefined && extendedTag >= 6 && extendedTag <= 15
          );
        }).length;

        foundModernFeatures += vendorBlocks.filter((block) => {
          return block.ieeeIdentifier === 0xc45dd8;
        }).length;
      }

      expect(foundModernFeatures).toBeGreaterThan(2);
    });
  });
});
