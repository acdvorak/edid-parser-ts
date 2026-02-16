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

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';
import type {
  AnyDataBlock,
  ExtendedTagDataBlock,
  ParsedEdid,
} from '../src/parser/parser-types';
import {
  isExtendedTagBlock,
  isVendorBlock,
  isVideoBlock,
} from '../src/parser/parser-utils';

import {
  createFullEdidArray,
  FAKE_ACER_8K120_GAMING,
  fixChecksums,
  LG_C9_4K60_HDMI21_GAMING,
  SAMSUNG_Q800T_8K60_HDMI21_GAMING,
} from './edid-test-data';

function getDataBlocks(parsed: ParsedEdid): AnyDataBlock[] {
  return (parsed.extensions[0]?.dataBlockCollection ?? []).filter(
    (block): block is AnyDataBlock => Boolean(block),
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

      expect(parsed.baseBlock.vendorId).toBe('SAM');
      expect(parsed.baseBlock.edidVersionString).toBe('1.3');
      expect(parsed.extensions[0]?.extTagByte).toBe(0x02);
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
        .find((block) => block.ieeeOui === 0xc45dd8);

      expect(hdmiForumBlock).toBeDefined();
      expect(hdmiForumBlock?.vrrMinHz).toBeGreaterThan(0);
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
      const gamingData = fixChecksums(FAKE_ACER_8K120_GAMING);
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
      const gamingData = fixChecksums(FAKE_ACER_8K120_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(gamingData)),
      );

      const hdmiForumScdb = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 0x79);

      expect(hdmiForumScdb).toBeDefined();

      const vrrMin = hdmiForumScdb?.vrrMinHz;
      const vrrMax = hdmiForumScdb?.vrrMaxHz;

      expect(vrrMin).toBeDefined();
      expect(vrrMin).toBeGreaterThan(0);

      expect(vrrMax).toBeDefined();
      expect(vrrMax).toBeGreaterThan(vrrMin ?? Number.MAX_SAFE_INTEGER);
      expect(vrrMax).toBeLessThanOrEqual(240);
    });

    // TODO(acdvorak): Implement parser support
    it.skip('should detect gaming-optimized features', () => {
      const gamingData = fixChecksums(FAKE_ACER_8K120_GAMING);
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
        FAKE_ACER_8K120_GAMING,
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
        FAKE_ACER_8K120_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
      ];

      for (const displayData of testDisplays) {
        const fixed = fixChecksums(displayData);
        const parsed = parseEdid(
          new Uint8ClampedArray(createFullEdidArray(fixed)),
        );

        expect(parsed.baseBlock.isChecksumValid).toBe(true);
        expect(parsed.extensions[0]?.isChecksumValid).toBe(true);
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
        (block) => block.ieeeOui === 0xc45dd8,
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
        FAKE_ACER_8K120_GAMING,
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
          return block.ieeeOui === 0xc45dd8;
        }).length;
      }

      expect(foundModernFeatures).toBeGreaterThan(2);
    });
  });
});
