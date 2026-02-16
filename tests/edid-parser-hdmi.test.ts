/**
 * @fileoverview Tests for parsing HDMI Vendor Specific Data Blocks (VSDB) and
 * HDMI Forum VSDBs, covering HDMI 1.4, 2.0, and 2.1 features.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidHDMISpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';
import type { ParsedEdid, VendorDataBlock } from '../src/parser/parser-types';
import { isVendorBlock } from '../src/parser/parser-utils';

import {
  calculateChecksum,
  createFullEdidArray,
  DELL_P2415Q_4K_HDMI14_PRO,
  fixChecksums,
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

function getVendorBlocks(parsed: ParsedEdid): VendorDataBlock[] {
  return (parsed.extensions[0]?.dataBlockCollection ?? []).filter(
    isVendorBlock,
  );
}

describe('HDMI Vendor Specific Data Block Parsing', () => {
  describe('HDMI 1.4 VSDB', () => {
    it('should identify HDMI 1.4 VSDB by IEEE OUI', () => {
      const hdmi14Edid = new Array<number>(128).fill(0);
      hdmi14Edid[0] = 0x00;
      hdmi14Edid[1] = 0xff;
      hdmi14Edid[2] = 0xff;
      hdmi14Edid[3] = 0xff;
      hdmi14Edid[4] = 0xff;
      hdmi14Edid[5] = 0xff;
      hdmi14Edid[6] = 0xff;
      hdmi14Edid[7] = 0x00;
      hdmi14Edid[126] = 1;
      hdmi14Edid[127] = calculateChecksum(hdmi14Edid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(
          3,
          [
            0x03, 0x0c, 0x00, 0x20, 0x00, 0x20, 0x3c, 0xc0, 0x40, 0x40, 0x60,
            0x60,
          ],
        ),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdmi14Edid.concat(ctaExtension)),
      );
      const hdmiBlock = getVendorBlocks(parsed).find(
        (block) => block.ieeeOui === 0x000c03,
      );

      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.ieeeOui).toBe(0x000c03);
      expect(hdmiBlock?.physicalAddress).toBe(0x2000);
      expect(hdmiBlock?.supportsDeepColor36).toBe(true);
      expect(hdmiBlock?.supportsDeepColor48).toBe(false);
      expect(hdmiBlock?.supportsDeepColor30).toBe(false);
      expect(hdmiBlock?.hdmi14MaxTmdsRateMhz).toBe(300);
      expect(hdmiBlock?.progressiveVideoLatencyMs).toBe(126);
      expect(hdmiBlock?.progressiveAudioLatencyMs).toBe(126);
      expect(hdmiBlock?.interlacedVideoLatencyMs).toBe(190);
      expect(hdmiBlock?.interlacedAudioLatencyMs).toBe(190);
    });
  });

  describe('HDMI 2.0 VSDB', () => {
    it('should identify HDMI Forum VSDB by IEEE OUI', () => {
      const hdmi20Edid = new Array<number>(128).fill(0);
      hdmi20Edid[0] = 0x00;
      hdmi20Edid[1] = 0xff;
      hdmi20Edid[2] = 0xff;
      hdmi20Edid[3] = 0xff;
      hdmi20Edid[4] = 0xff;
      hdmi20Edid[5] = 0xff;
      hdmi20Edid[6] = 0xff;
      hdmi20Edid[7] = 0x00;
      hdmi20Edid[126] = 1;
      hdmi20Edid[127] = calculateChecksum(hdmi20Edid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(3, [0xd8, 0x5d, 0xc4, 0x01, 0x78, 0x44, 0x00]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdmi20Edid.concat(ctaExtension)),
      );
      const hdmiBlock = getVendorBlocks(parsed).find(
        (block) => block.ieeeOui === 0xc45dd8,
      );

      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.ieeeOui).toBe(0xc45dd8);
      expect(hdmiBlock?.hdmi20PayloadVersion).toBe(1);
      expect(hdmiBlock?.hdmi20MaxTmdsRateMhz).toBe(600);
      expect(hdmiBlock?.supportsSCDC).toBe(false);
      expect(hdmiBlock?.supportsSCDCRR).toBe(true);
      expect(hdmiBlock?.supports3DDV).toBe(false);
      expect(hdmiBlock?.supports3DIV).toBe(true);
    });
  });

  describe('HDMI 2.1 Features', () => {
    it('should detect enhanced SCDC capabilities', () => {
      const hdmi21Edid = new Array<number>(128).fill(0);
      hdmi21Edid[0] = 0x00;
      hdmi21Edid[1] = 0xff;
      hdmi21Edid[2] = 0xff;
      hdmi21Edid[3] = 0xff;
      hdmi21Edid[4] = 0xff;
      hdmi21Edid[5] = 0xff;
      hdmi21Edid[6] = 0xff;
      hdmi21Edid[7] = 0x00;
      hdmi21Edid[126] = 1;
      hdmi21Edid[127] = calculateChecksum(hdmi21Edid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(
          3,
          [0xd8, 0x5d, 0xc4, 0x01, 0x78, 0x80, 0x00, 0x62, 0x30, 0x78, 0x00],
        ),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(hdmi21Edid.concat(ctaExtension)),
      );

      const hdmiBlock = getVendorBlocks(parsed).find(
        (block) => block.ieeeOui === 0xc45dd8,
      );

      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.supportsSCDC).toBe(true);

      expect(hdmiBlock?.hdmiForumFeatures).toBeDefined();
      expect(hdmiBlock?.hdmiForumFeatures?.supportsALLM).toBe(true);
      expect(parsed.featureSupport.supportsALLM).toBe(true);

      expect(hdmiBlock?.vrrMinHz).toBe(48);
      expect(hdmiBlock?.vrrMaxHz).toBe(120);
    });
  });

  describe('Multiple HDMI VSDBs', () => {
    it('should parse multiple HDMI VSDBs', () => {
      const dualHdmiEdid = new Array<number>(128).fill(0);
      dualHdmiEdid[0] = 0x00;
      dualHdmiEdid[1] = 0xff;
      dualHdmiEdid[2] = 0xff;
      dualHdmiEdid[3] = 0xff;
      dualHdmiEdid[4] = 0xff;
      dualHdmiEdid[5] = 0xff;
      dualHdmiEdid[6] = 0xff;
      dualHdmiEdid[7] = 0x00;
      dualHdmiEdid[126] = 1;
      dualHdmiEdid[127] = calculateChecksum(dualHdmiEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(3, [0x03, 0x0c, 0x00, 0x10, 0x00, 0x20]),
        ...buildDataBlock(3, [0xd8, 0x5d, 0xc4, 0x01, 0x78, 0x44, 0x00]),
        ...buildDataBlock(3, [0x3b, 0x1a, 0x00, 0x01, 0x02]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(dualHdmiEdid.concat(ctaExtension)),
      );

      const hdmiBlocks = getVendorBlocks(parsed).filter((block) =>
        [0x000c03, 0xc45dd8].includes(block.ieeeOui ?? -1),
      );

      expect(hdmiBlocks.length).toBe(2);

      const hdmi14Block = hdmiBlocks.find(
        (block) => block.ieeeOui === 0x000c03,
      );
      const hdmiForumBlock = hdmiBlocks.find(
        (block) => block.ieeeOui === 0xc45dd8,
      );

      expect(hdmi14Block?.physicalAddress).toBeDefined();
      expect(hdmiForumBlock?.hdmi20PayloadVersion).toBeDefined();
    });
  });

  describe('Vendor Block Error Handling', () => {
    it('should handle truncated HDMI VSDB gracefully', () => {
      const errorEdid = new Array<number>(128).fill(0);
      errorEdid[0] = 0x00;
      errorEdid[1] = 0xff;
      errorEdid[2] = 0xff;
      errorEdid[3] = 0xff;
      errorEdid[4] = 0xff;
      errorEdid[5] = 0xff;
      errorEdid[6] = 0xff;
      errorEdid[7] = 0x00;
      errorEdid[126] = 1;
      errorEdid[127] = calculateChecksum(errorEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(3, [0x03, 0x0c, 0x00, 0x10]),
        ...buildDataBlock(3, [0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(errorEdid.concat(ctaExtension)),
      );

      const hdmiBlocks = getVendorBlocks(parsed).filter(
        (block) => block.ieeeOui === 0x000c03,
      );

      expect(hdmiBlocks.length).toBe(1);

      const hdmiBlock = hdmiBlocks[0];
      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.ieeeOui).toBe(0x000c03);

      const unknownBlocks = getVendorBlocks(parsed).filter(
        (block) => block.ieeeOui === 0x563412,
      );

      expect(unknownBlocks.length).toBe(1);

      const unknownBlock = unknownBlocks[0];
      expect(unknownBlock).toBeDefined();
      expect(unknownBlock?.ieeeOui).toBe(0x563412);
    });
  });

  describe('Real World HDMI Examples', () => {
    it('should parse Samsung Q800T HDMI capabilities', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const hdmiBlocks = getVendorBlocks(parsed).filter((block) =>
        [0x000c03, 0xc45dd8].includes(block.ieeeOui ?? -1),
      );

      expect(hdmiBlocks.length).toBeGreaterThan(0);
    });

    it('should parse Dell P2415Q HDMI capabilities', () => {
      const dellData = fixChecksums(DELL_P2415Q_4K_HDMI14_PRO);
      dellData.block0[126] = 1;

      const ctaExtension = buildCtaExtension(
        buildDataBlock(3, [0x03, 0x0c, 0x00, 0x10, 0x00, 0x20, 0x3c]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(
          createFullEdidArray(dellData).concat(ctaExtension),
        ),
      );

      const hdmiBlock = getVendorBlocks(parsed).find(
        (block) => block.ieeeOui === 0x000c03,
      );

      expect(hdmiBlock).toBeDefined();
      expect(hdmiBlock?.hdmi14MaxTmdsRateMhz).toBe(300);
    });
  });
});
