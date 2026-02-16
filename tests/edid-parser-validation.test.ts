/**
 * @fileoverview Validation suite for the EDID parser, covering edge cases,
 * error handling, memory safety, and performance with corrupted or malformed
 * EDID data.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidValidationSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';
import { isVendorBlock, isVideoBlock } from '../src/parser/parser-utils';

import {
  calculateChecksum,
  createFullEdidArray,
  FAKE_1080P60,
  fixChecksums,
  LG_C9_4K60_HDMI21_GAMING,
  SAMSUNG_Q800T_8K60_HDMI21_GAMING,
} from './edid-test-data';

const EDID_BLOCK_LENGTH = 128;

function buildBlock(prefix: number[]): number[] {
  const block = prefix.concat(
    new Array<number>(Math.max(EDID_BLOCK_LENGTH - prefix.length, 0)).fill(0),
  );
  block[127] = calculateChecksum(block);
  return block;
}

describe('EDID Parser Validation and Edge Cases', () => {
  describe('Header Validation Edge Cases', () => {
    it('should handle partial headers gracefully', () => {
      const partialHeader = [0x00, 0xff, 0xff];
      const parsed = parseEdid(new Uint8ClampedArray(partialHeader));
      expect(parsed.baseBlock.isHeaderValid).toBe(false);
    });

    it('should reject corrupted header patterns', () => {
      const corruptedHeaders = [
        [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00],
        [0x00, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00],
        [0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01],
      ];

      for (const header of corruptedHeaders) {
        const parsed = parseEdid(new Uint8ClampedArray(buildBlock(header)));
        expect(parsed.baseBlock.isHeaderValid).toBe(false);
      }
    });

    it('should handle empty EDID data', () => {
      const parsed = parseEdid(new Uint8ClampedArray([]));
      expect(parsed.baseBlock.isHeaderValid).toBe(false);
    });
  });

  describe('Checksum Validation Edge Cases', () => {
    it('should detect single-bit checksum errors', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[127] = calculateChecksum(baseEdid);

      let parsed = parseEdid(new Uint8ClampedArray(baseEdid));
      expect(parsed.baseBlock.isChecksumValid).toBe(true);

      baseEdid[127] ^= 0x01;
      parsed = parseEdid(new Uint8ClampedArray(baseEdid));
      expect(parsed.baseBlock.isChecksumValid).toBe(false);
    });

    it('should handle multiple block checksum validation', () => {
      const block0 = new Array<number>(128).fill(0);
      block0[0] = 0x00;
      block0[1] = 0xff;
      block0[2] = 0xff;
      block0[3] = 0xff;
      block0[4] = 0xff;
      block0[5] = 0xff;
      block0[6] = 0xff;
      block0[7] = 0x00;
      block0[126] = 1;

      const block1 = new Array<number>(128).fill(0);
      block1[0] = 0x02;

      block0[127] = calculateChecksum(block0);
      block1[127] = calculateChecksum(block1);

      const parsed = parseEdid(new Uint8ClampedArray(block0.concat(block1)));
      expect(parsed.baseBlock.isChecksumValid).toBe(true);
      expect(parsed.extensions[0]?.isChecksumValid).toBe(true);
    });
  });

  describe('Extension Block Edge Cases', () => {
    it('should handle missing extension blocks gracefully', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[126] = 2;
      baseEdid[127] = calculateChecksum(baseEdid);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid));
      expect(parsed.baseBlock.numberOfExtensions).toBe(2);
      expect(
        parsed.warnings.some(
          (warning) => warning.code === 'extension_count_mismatch',
        ),
      ).toBe(true);
    });

    it('should handle unknown extension tags', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[126] = 1;

      const unknownExt = new Array<number>(128).fill(0);
      unknownExt[0] = 0xff;

      baseEdid[127] = calculateChecksum(baseEdid);
      unknownExt[127] = calculateChecksum(unknownExt);

      const parsed = parseEdid(
        new Uint8ClampedArray(baseEdid.concat(unknownExt)),
      );
      expect(parsed.extensions.length).toBe(1);
      expect(
        parsed.warnings.some(
          (warning) => warning.code === 'unknown_extension_tag',
        ),
      ).toBe(true);
    });
  });

  describe('CTA Data Block Edge Cases', () => {
    it('should handle zero-length data blocks', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x08;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x40;
      ctaExt[5] = 0x20;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });

    it('should handle truncated data blocks', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x08;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x48;
      ctaExt[5] = 0x01;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });

    it('should handle malformed extended tag blocks', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x0c;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x78;
      ctaExt[5] = 0xff;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });
  });

  describe('VIC Code Edge Cases', () => {
    it('should handle invalid VIC codes gracefully', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x0c;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x46;
      ctaExt[5] = 0x00;
      ctaExt[6] = 0xff;
      ctaExt[7] = 0x80;
      ctaExt[8] = 0x01;
      ctaExt[9] = 0x81;
      ctaExt[10] = 0x7f;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const videoBlock =
        parsed.extensions[0]?.dataBlockCollection?.find(isVideoBlock);
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(0);
    });

    it('should handle extended VIC range correctly', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x0e;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x48;
      ctaExt[5] = 0x01;
      ctaExt[6] = 0x6f;
      ctaExt[7] = 0xc0;
      ctaExt[8] = 0xdb;
      ctaExt[9] = 0x04;
      ctaExt[10] = 0x03;
      ctaExt[11] = 0x02;
      ctaExt[12] = 0x01;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const videoBlock =
        parsed.extensions[0]?.dataBlockCollection?.find(isVideoBlock);

      const foundHighVIC =
        videoBlock?.shortVideoDescriptors.some((svd) => svd.vic >= 192) ??
        false;
      expect(foundHighVIC).toBe(true);
    });
  });

  describe('HDMI VSDB Edge Cases', () => {
    it('should handle truncated HDMI VSDB', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x0a;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x64;
      ctaExt[5] = 0x03;
      ctaExt[6] = 0x0c;
      ctaExt[7] = 0x00;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const hdmiBlock = parsed.extensions[0]?.dataBlockCollection
        ?.filter(isVendorBlock)
        .find((block) => block.ieeeOui === 0x000c03);
      expect(hdmiBlock).toBeDefined();
    });

    it('should handle unknown vendor VSDBs', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x0c;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x66;
      ctaExt[5] = 0x12;
      ctaExt[6] = 0x34;
      ctaExt[7] = 0x56;
      ctaExt[8] = 0xab;
      ctaExt[9] = 0xcd;
      ctaExt[10] = 0xef;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const unknownVSDB = parsed.extensions[0]?.dataBlockCollection
        ?.filter(isVendorBlock)
        .find((block) => block.ieeeOui === 0x563412);
      expect(unknownVSDB).toBeDefined();
    });
  });

  describe('Memory Safety and Bounds Checking', () => {
    it('should handle extremely large EDID claims safely', () => {
      const baseEdid = new Array<number>(128).fill(0);
      baseEdid[0] = 0x00;
      baseEdid[1] = 0xff;
      baseEdid[2] = 0xff;
      baseEdid[3] = 0xff;
      baseEdid[4] = 0xff;
      baseEdid[5] = 0xff;
      baseEdid[6] = 0xff;
      baseEdid[7] = 0x00;
      baseEdid[126] = 255;
      baseEdid[127] = calculateChecksum(baseEdid);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid));
      expect(parsed.baseBlock.numberOfExtensions).toBe(255);
    });

    it('should handle data block length overruns', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x06;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x7f;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const parsed = parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });
  });

  describe('Real-World Corrupted EDID Handling', () => {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */

    it('should handle EDIDs with flipped bits', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(samsungData);

      edidArray[50]! ^= 0x01;
      edidArray[150]! ^= 0x80;

      const parsed = parseEdid(new Uint8ClampedArray(edidArray));
      expect(parsed.baseBlock.headerValidity).toBe('OK');
    });

    it('should handle EDIDs with swapped bytes', () => {
      const lgData = fixChecksums(LG_C9_4K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(lgData);

      const temp = edidArray[20]!;
      edidArray[20] = edidArray[21]!;
      edidArray[21] = temp;

      const parsed = parseEdid(new Uint8ClampedArray(edidArray));
      expect(parsed.baseBlock.headerValidity).toBe('OK');
    });

    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    it('should provide meaningful error information for corrupted EDIDs', () => {
      const corruptedEdid = new Array<number>(256).fill(0xff);
      const parsed = parseEdid(new Uint8ClampedArray(corruptedEdid));

      expect(parsed.baseBlock.isHeaderValid).toBe(false);
      expect(parsed.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle large numbers of data blocks efficiently', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x80;
      ctaExt[3] = 0x00;

      let offset = 4;
      while (offset < 120) {
        ctaExt[offset] = 0x60 + (offset % 7);
        offset += 1;
      }

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const startTime = Date.now();
      parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle recursive data structures safely', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
      baseEdid[126] = 1;

      const ctaExt = new Array<number>(128).fill(0);
      ctaExt[0] = 0x02;
      ctaExt[1] = 0x03;
      ctaExt[2] = 0x08;
      ctaExt[3] = 0x00;
      ctaExt[4] = 0x62;
      ctaExt[5] = 0x05;
      ctaExt[6] = 0x04;

      baseEdid[127] = calculateChecksum(baseEdid);
      ctaExt[127] = calculateChecksum(ctaExt);

      const startTime = Date.now();
      parseEdid(new Uint8ClampedArray(baseEdid.concat(ctaExt)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
