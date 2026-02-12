/**
 * @fileoverview Tests for parsing HDR (High Dynamic Range) related data blocks
 * in EDID, including Static Metadata, Dynamic Metadata, Colorimetry, and Gaming
 * features.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidHDRSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/edid-parser-functions';
import type {
  DataBlock,
  ExtendedTagDataBlock,
  ParsedEdid,
} from '../src/edid-parser-types';
import {
  isExtendedTagBlock,
  isVendorBlock,
  isVideoBlock,
} from '../src/edid-parser-utils';

import {
  calculateChecksum,
  createFullEdidArray,
  fixChecksums,
  LG_C9_SIMPLIFIED,
  SAMSUNG_Q800T_8K60_HDMI21_GAMING,
} from './edid-test-data';

const EDID_BLOCK_LENGTH = 128;

function buildExtensionBlock(prefix: number[]): number[] {
  const block = prefix.concat(
    new Array<number>(Math.max(EDID_BLOCK_LENGTH - prefix.length, 0)).fill(0),
  );
  block[127] = calculateChecksum(block);
  return block;
}

function buildCtaExtension(
  dataBlocks: number[],
  options?: { revision?: number; flags?: number; dtdStart?: number },
): number[] {
  const dtdStart = options?.dtdStart ?? Math.min(4 + dataBlocks.length, 127);
  const header = [
    0x02,
    options?.revision ?? 0x03,
    dtdStart,
    options?.flags ?? 0xf1,
  ];
  return buildExtensionBlock([...header, ...dataBlocks]);
}

function buildDataBlock(tagCode: number, payload: number[]): number[] {
  return [(tagCode << 5) + payload.length, ...payload];
}

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

describe('HDR Static Metadata Data Block Parsing', () => {
  describe('HDR Static Metadata Data Block', () => {
    it('should identify HDR Static Metadata Data Block', () => {
      const hdrEdid = new Array<number>(128).fill(0);
      hdrEdid[0] = 0x00;
      hdrEdid[1] = 0xff;
      hdrEdid[2] = 0xff;
      hdrEdid[3] = 0xff;
      hdrEdid[4] = 0xff;
      hdrEdid[5] = 0xff;
      hdrEdid[6] = 0xff;
      hdrEdid[7] = 0x00;
      hdrEdid[126] = 1;
      hdrEdid[127] = calculateChecksum(hdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x06, 0x0c, 0x01, 0x78, 0x5a, 0x1e]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => {
          return getExtendedTagValue(block) === 6;
        });

      expect(hdrBlock).toBeDefined();
    });

    it('should parse supported EOTFs correctly', () => {
      const hdrEdid = new Array<number>(128).fill(0);
      hdrEdid[0] = 0x00;
      hdrEdid[1] = 0xff;
      hdrEdid[2] = 0xff;
      hdrEdid[3] = 0xff;
      hdrEdid[4] = 0xff;
      hdrEdid[5] = 0xff;
      hdrEdid[6] = 0xff;
      hdrEdid[7] = 0x00;
      hdrEdid[126] = 1;
      hdrEdid[127] = calculateChecksum(hdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x06, 0x0c, 0x01, 0x78, 0x5a, 0x1e]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
      expect(hdrBlock?.supportedEOTFs).toContain('SMPTE ST2084 (PQ)');
      expect(hdrBlock?.supportedEOTFs).toContain('Hybrid Log-Gamma (HLG)');
      expect(hdrBlock?.supportedEOTFs).not.toContain(
        'Traditional gamma - SDR luminance range',
      );
    });

    it('should parse static metadata descriptor support', () => {
      const hdrEdid = new Array<number>(128).fill(0);
      hdrEdid[0] = 0x00;
      hdrEdid[1] = 0xff;
      hdrEdid[2] = 0xff;
      hdrEdid[3] = 0xff;
      hdrEdid[4] = 0xff;
      hdrEdid[5] = 0xff;
      hdrEdid[6] = 0xff;
      hdrEdid[7] = 0x00;
      hdrEdid[126] = 1;
      hdrEdid[127] = calculateChecksum(hdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x06, 0x0c, 0x01, 0x78, 0x5a, 0x1e]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
      expect(hdrBlock?.supportedStaticMetadataDescriptors).toContain(
        'Static Metadata Type 1',
      );
    });

    it('should parse luminance values', () => {
      const hdrEdid = new Array<number>(128).fill(0);
      hdrEdid[0] = 0x00;
      hdrEdid[1] = 0xff;
      hdrEdid[2] = 0xff;
      hdrEdid[3] = 0xff;
      hdrEdid[4] = 0xff;
      hdrEdid[5] = 0xff;
      hdrEdid[6] = 0xff;
      hdrEdid[7] = 0x00;
      hdrEdid[126] = 1;
      hdrEdid[127] = calculateChecksum(hdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x06, 0x0c, 0x01, 0x78, 0x5a, 0x1e]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
      expect(hdrBlock?.desiredContentMaxLuminance).toBe(0x78);
      expect(hdrBlock?.desiredContentMaxFrameAverageLuminance).toBe(0x5a);
      expect(hdrBlock?.desiredContentMinLuminance).toBe(0x1e);
    });
  });

  describe('Enhanced Colorimetry with HDR', () => {
    it('should detect BT.2020 color gamut support', () => {
      const colorimetryEdid = new Array<number>(128).fill(0);
      colorimetryEdid[0] = 0x00;
      colorimetryEdid[1] = 0xff;
      colorimetryEdid[2] = 0xff;
      colorimetryEdid[3] = 0xff;
      colorimetryEdid[4] = 0xff;
      colorimetryEdid[5] = 0xff;
      colorimetryEdid[6] = 0xff;
      colorimetryEdid[7] = 0x00;
      colorimetryEdid[126] = 1;
      colorimetryEdid[127] = calculateChecksum(colorimetryEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(7, [0x05, 0xc0, 0x0f]),
        ...buildDataBlock(7, [0x06, 0x0e, 0x01, 0x88, 0x78, 0x20]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(colorimetryEdid.concat(ctaExtension)),
      );

      const colorimetryBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 5);

      expect(colorimetryBlock).toBeDefined();
      expect(colorimetryBlock?.supportsBT2020RGB).toBe(true);
      expect(colorimetryBlock?.supportsBT2020YCC).toBe(true);
    });

    it('should combine HDR and wide color gamut capabilities', () => {
      const colorimetryEdid = new Array<number>(128).fill(0);
      colorimetryEdid[0] = 0x00;
      colorimetryEdid[1] = 0xff;
      colorimetryEdid[2] = 0xff;
      colorimetryEdid[3] = 0xff;
      colorimetryEdid[4] = 0xff;
      colorimetryEdid[5] = 0xff;
      colorimetryEdid[6] = 0xff;
      colorimetryEdid[7] = 0x00;
      colorimetryEdid[126] = 1;
      colorimetryEdid[127] = calculateChecksum(colorimetryEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(7, [0x05, 0xc0, 0x0f]),
        ...buildDataBlock(7, [0x06, 0x0e, 0x01, 0x88, 0x78, 0x20]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(colorimetryEdid.concat(ctaExtension)),
      );

      const extendedBlocks = getDataBlocks(parsed).filter(isExtendedTagBlock);

      const hdrBlock = extendedBlocks.find(
        (block) => getExtendedTagValue(block) === 6,
      );
      const colorimetryBlock = extendedBlocks.find(
        (block) => getExtendedTagValue(block) === 5,
      );

      expect(hdrBlock).toBeDefined();
      expect(colorimetryBlock).toBeDefined();

      expect(
        hdrBlock?.supportedEOTFs?.includes('SMPTE ST2084 (PQ)') &&
          colorimetryBlock?.supportsBT2020RGB,
      ).toBe(true);
    });
  });

  describe('HDR Dynamic Metadata', () => {
    it('should identify HDR Dynamic Metadata Data Block', () => {
      const dynamicHdrEdid = new Array<number>(128).fill(0);
      dynamicHdrEdid[0] = 0x00;
      dynamicHdrEdid[1] = 0xff;
      dynamicHdrEdid[2] = 0xff;
      dynamicHdrEdid[3] = 0xff;
      dynamicHdrEdid[4] = 0xff;
      dynamicHdrEdid[5] = 0xff;
      dynamicHdrEdid[6] = 0xff;
      dynamicHdrEdid[7] = 0x00;
      dynamicHdrEdid[126] = 1;
      dynamicHdrEdid[127] = calculateChecksum(dynamicHdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x07, 0x01, 0x04, 0x00, 0x40]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(dynamicHdrEdid.concat(ctaExtension)),
      );

      const dynamicHdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 7);

      expect(dynamicHdrBlock).toBeDefined();
    });

    it('should parse HDR dynamic metadata types', () => {
      const dynamicHdrEdid = new Array<number>(128).fill(0);
      dynamicHdrEdid[0] = 0x00;
      dynamicHdrEdid[1] = 0xff;
      dynamicHdrEdid[2] = 0xff;
      dynamicHdrEdid[3] = 0xff;
      dynamicHdrEdid[4] = 0xff;
      dynamicHdrEdid[5] = 0xff;
      dynamicHdrEdid[6] = 0xff;
      dynamicHdrEdid[7] = 0x00;
      dynamicHdrEdid[126] = 1;
      dynamicHdrEdid[127] = calculateChecksum(dynamicHdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(7, [0x07, 0x01, 0x04, 0x00, 0x40]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(dynamicHdrEdid.concat(ctaExtension)),
      );

      const dynamicHdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 7);

      expect(dynamicHdrBlock).toBeDefined();
      expect(dynamicHdrBlock?.supportedMetadataTypes?.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('Gaming HDR Features', () => {
    it('should detect HDR gaming capabilities', () => {
      const gamingHdrEdid = new Array<number>(128).fill(0);
      gamingHdrEdid[0] = 0x00;
      gamingHdrEdid[1] = 0xff;
      gamingHdrEdid[2] = 0xff;
      gamingHdrEdid[3] = 0xff;
      gamingHdrEdid[4] = 0xff;
      gamingHdrEdid[5] = 0xff;
      gamingHdrEdid[6] = 0xff;
      gamingHdrEdid[7] = 0x00;
      gamingHdrEdid[126] = 1;
      gamingHdrEdid[127] = calculateChecksum(gamingHdrEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(7, [0x06, 0x0e, 0x01, 0x90, 0x80, 0x10]),
        ...buildDataBlock(
          3,
          [0xd8, 0x5d, 0xc4, 0x01, 0x78, 0x80, 0x00, 0x62, 0x30, 0x78, 0x00],
        ),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(gamingHdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      const hdmiBlock = getDataBlocks(parsed)
        .filter(isVendorBlock)
        .find((block) => block.ieeeIdentifier === 0xc45dd8);

      expect(hdrBlock).toBeDefined();
      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.vrrMin).toBeGreaterThan(0);
    });

    it('should detect high refresh rate HDR formats', () => {
      const gamingHdrEdid = new Array<number>(128).fill(0);
      gamingHdrEdid[0] = 0x00;
      gamingHdrEdid[1] = 0xff;
      gamingHdrEdid[2] = 0xff;
      gamingHdrEdid[3] = 0xff;
      gamingHdrEdid[4] = 0xff;
      gamingHdrEdid[5] = 0xff;
      gamingHdrEdid[6] = 0xff;
      gamingHdrEdid[7] = 0x00;
      gamingHdrEdid[126] = 1;
      gamingHdrEdid[127] = calculateChecksum(gamingHdrEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(2, [0x76, 0x77, 0x78]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(gamingHdrEdid.concat(ctaExtension)),
      );

      const videoBlock = getDataBlocks(parsed).find(isVideoBlock);
      expect(videoBlock).toBeDefined();
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(0);

      const supportsHighRefresh4K =
        videoBlock?.shortVideoDescriptors.some(
          (svd) => svd.vic >= 118 && svd.vic <= 120,
        ) ?? false;
      expect(supportsHighRefresh4K).toBe(true);
    });
  });

  describe('HDR Error Handling', () => {
    it('should handle minimal HDR data blocks', () => {
      const errorHdrEdid = new Array<number>(128).fill(0);
      errorHdrEdid[0] = 0x00;
      errorHdrEdid[1] = 0xff;
      errorHdrEdid[2] = 0xff;
      errorHdrEdid[3] = 0xff;
      errorHdrEdid[4] = 0xff;
      errorHdrEdid[5] = 0xff;
      errorHdrEdid[6] = 0xff;
      errorHdrEdid[7] = 0x00;
      errorHdrEdid[126] = 1;
      errorHdrEdid[127] = calculateChecksum(errorHdrEdid);

      const ctaExtension = buildCtaExtension(buildDataBlock(7, [0x06]));

      const parsed = parseEdid(
        new Uint8ClampedArray(errorHdrEdid.concat(ctaExtension)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
    });

    it('should handle invalid extended tag blocks', () => {
      const errorHdrEdid = new Array<number>(128).fill(0);
      errorHdrEdid[0] = 0x00;
      errorHdrEdid[1] = 0xff;
      errorHdrEdid[2] = 0xff;
      errorHdrEdid[3] = 0xff;
      errorHdrEdid[4] = 0xff;
      errorHdrEdid[5] = 0xff;
      errorHdrEdid[6] = 0xff;
      errorHdrEdid[7] = 0x00;
      errorHdrEdid[126] = 1;
      errorHdrEdid[127] = calculateChecksum(errorHdrEdid);

      const ctaExtension = buildCtaExtension(buildDataBlock(7, [0xff, 0x00]));

      const parsed = parseEdid(
        new Uint8ClampedArray(errorHdrEdid.concat(ctaExtension)),
      );

      expect(getDataBlocks(parsed).length).toBeGreaterThan(0);
    });
  });

  describe('Real World HDR Examples', () => {
    it('should parse LG OLED C9 HDR capabilities', () => {
      let lgData = fixChecksums(LG_C9_SIMPLIFIED);
      lgData = {
        ...lgData,
        block1: buildCtaExtension([
          ...buildDataBlock(7, [0x06, 0x0e, 0x01, 0x96, 0x82, 0x12]),
          ...buildDataBlock(3, [0xd8, 0x5d, 0xc4, 0x01, 0x78, 0x40, 0x00]),
        ]),
      };

      const fixedData = fixChecksums(lgData);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(fixedData)),
      );

      const hdrBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 6);

      expect(hdrBlock).toBeDefined();
    });

    it('should identify premium HDR displays', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const extendedBlocks = getDataBlocks(parsed).filter(isExtendedTagBlock);
      const vendorBlocks = getDataBlocks(parsed).filter(isVendorBlock);

      const hasHDR = extendedBlocks.some((block) => {
        return getExtendedTagValue(block) === 6;
      });
      const hasWideColorGamut = extendedBlocks.some((block) => {
        return getExtendedTagValue(block) === 5 && !!block.supportsBT2020RGB;
      });
      const hasHDMI21 = vendorBlocks.some((block) => {
        return block.ieeeIdentifier === 0xc45dd8;
      });

      expect(hasHDR || hasHDMI21 || hasWideColorGamut).toBe(true);
    });
  });
});
