/**
 * @fileoverview Unit tests for EDID parser error handling, covering invalid
 * headers, checksum errors, truncated data, invalid blocks, and boundary cases.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidErrorHandlingSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';
import { isVendorBlock } from '../src/parser/parser-utils';

import {
  calculateChecksum,
  createFullEdidArray,
  FAKE_1080P60,
  fixChecksums,
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

describe('EDID Error Handling and Edge Cases', () => {
  describe('Invalid EDID Headers', () => {
    it('should handle completely invalid header', () => {
      const invalidEdid = buildBlock([
        0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(invalidEdid));
      expect(parsed.baseBlock.headerValidity).toBe('ERROR');
      expect(
        parsed.warnings.some((warning) => warning.code === 'invalid_header'),
      ).toBe(true);
    });

    it('should handle partial header data', () => {
      const partialEdid = [0x00, 0xff, 0xff];

      const parsed = parseEdid(new Uint8ClampedArray(partialEdid));
      expect(parsed.baseBlock.isHeaderValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'too_short'),
      ).toBe(true);
    });

    it('should handle empty EDID data', () => {
      const parsed = parseEdid(new Uint8ClampedArray([]));
      expect(parsed.baseBlock.isHeaderValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'too_short'),
      ).toBe(true);
    });
  });

  describe('Checksum Errors', () => {
    it('should detect incorrect base block checksum', () => {
      const invalidChecksumEdid = createFullEdidArray(
        fixChecksums(FAKE_1080P60),
      );
      invalidChecksumEdid[127] = 0xff;

      const parsed = parseEdid(new Uint8ClampedArray(invalidChecksumEdid));
      expect(parsed.baseBlock.isChecksumValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'checksum_failed'),
      ).toBe(true);
    });

    it('should detect incorrect extension block checksum', () => {
      const testData = fixChecksums(FAKE_1080P60);
      testData.block0[126] = 1;

      const invalidExtension = new Array<number>(128).fill(0);
      invalidExtension[0] = 0x02;
      invalidExtension[127] = 0xff;

      const fullEdid = createFullEdidArray(testData).concat(invalidExtension);

      const parsed = parseEdid(new Uint8ClampedArray(fullEdid));
      expect(parsed.extensions[0]?.isChecksumValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'checksum_failed'),
      ).toBe(true);
    });

    it('should handle checksum calculation with edge values', () => {
      const edgeEdid = new Array<number>(128).fill(0xff);
      edgeEdid[0] = 0x00;
      edgeEdid[1] = 0xff;
      edgeEdid[2] = 0xff;
      edgeEdid[3] = 0xff;
      edgeEdid[4] = 0xff;
      edgeEdid[5] = 0xff;
      edgeEdid[6] = 0xff;
      edgeEdid[7] = 0x00;
      edgeEdid[127] = calculateChecksum(edgeEdid);

      const parsed = parseEdid(new Uint8ClampedArray(edgeEdid));
      expect(typeof parsed.baseBlock.checksum).toBe('number');
    });
  });

  describe('Truncated EDID Data', () => {
    it('should handle EDID shorter than 128 bytes', () => {
      const shortEdid = [0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00].concat(
        new Array<number>(50).fill(0),
      );

      const parsed = parseEdid(new Uint8ClampedArray(shortEdid));
      expect(
        parsed.warnings.some((warning) => warning.code === 'too_short'),
      ).toBe(true);
    });

    it('should handle missing extension blocks', () => {
      const baseEdid = createFullEdidArray(FAKE_1080P60);
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

    it('should handle partially truncated extension blocks', () => {
      const testData = fixChecksums(FAKE_1080P60);
      testData.block0[126] = 1;

      const partialExtension = buildBlock([0x02, 0x03, 0x04, 0x00]);
      const fullEdid = createFullEdidArray(testData).concat(partialExtension);

      const parsed = parseEdid(new Uint8ClampedArray(fullEdid));
      expect(parsed.extensions.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid Manufacturer IDs', () => {
    it('should handle invalid EISA ID encoding', () => {
      const invalidIdEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(invalidIdEdid));
      expect(typeof parsed.baseBlock.vendorId).toBe('string');
      expect(parsed.baseBlock.vendorId.length).toBe(3);
    });

    it('should handle manufacturer ID with invalid character mappings', () => {
      const edgeIdEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0xff, 0xff,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(edgeIdEdid));
      expect(parsed.baseBlock.vendorId).toBeDefined();
      expect(parsed.baseBlock.vendorId.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invalid Timing Data', () => {
    it('should handle DTD with zero pixel clock', () => {
      const zeroDtdEdid = createFullEdidArray(FAKE_1080P60);
      zeroDtdEdid[54] = 0x00;
      zeroDtdEdid[55] = 0x00;
      zeroDtdEdid[127] = calculateChecksum(zeroDtdEdid);

      const parsed = parseEdid(new Uint8ClampedArray(zeroDtdEdid));
      expect(parsed.baseBlock.dtds?.length ?? 0).toBe(0);
    });

    it('should handle DTD with invalid timing values', () => {
      const invalidDtdEdid = createFullEdidArray(FAKE_1080P60);
      for (let i = 54; i < 72; i += 1) {
        invalidDtdEdid[i] = 0xff;
      }
      invalidDtdEdid[127] = calculateChecksum(invalidDtdEdid);

      const parsed = parseEdid(new Uint8ClampedArray(invalidDtdEdid));
      const dtd = parsed.baseBlock.dtds?.[0];
      expect(dtd?.pixelClockMhz).toBeGreaterThan(0);
      expect(dtd?.horizontalActivePixels).toBeGreaterThan(0);
      expect(dtd?.verticalActivePixels).toBeGreaterThan(0);
    });

    it('should handle established timings with all bits set', () => {
      const allTimingsEdid = createFullEdidArray(FAKE_1080P60);
      allTimingsEdid[35] = 0xff;
      allTimingsEdid[36] = 0xff;
      allTimingsEdid[37] = 0xff;
      allTimingsEdid[127] = calculateChecksum(allTimingsEdid);

      const parsed = parseEdid(new Uint8ClampedArray(allTimingsEdid));
      expect(parsed.baseBlock.timingBitmap).toBe(0xffffff);
    });
  });

  describe('CTA Extension Error Handling', () => {
    it('should handle invalid CTA revision numbers', () => {
      const invalidRevEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      invalidRevEdid[126] = 1;
      invalidRevEdid[127] = calculateChecksum(invalidRevEdid);

      const ctaExtension = buildBlock([0x02, 0xff, 0x04, 0x00]);

      const parsed = parseEdid(
        new Uint8ClampedArray(invalidRevEdid.concat(ctaExtension)),
      );

      expect(parsed.extensions[0]?.revisionNumber).toBe(0xff);
    });

    it('should handle data blocks extending beyond DTD start', () => {
      const overflowEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      overflowEdid[126] = 1;
      overflowEdid[127] = calculateChecksum(overflowEdid);

      const ctaExtension = buildBlock([
        0x02, 0x03, 0x10, 0xf1, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(overflowEdid.concat(ctaExtension)),
      );

      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });

    it('should handle data blocks with invalid lengths', () => {
      const invalidLengthEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      invalidLengthEdid[126] = 1;
      invalidLengthEdid[127] = calculateChecksum(invalidLengthEdid);

      const ctaExtension = buildBlock([
        0x02, 0x03, 0x20, 0xf1, 0x5f, 0x10, 0x04, 0x03, 0x02, 0x01, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0xff, 0xff, 0xff,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(invalidLengthEdid.concat(ctaExtension)),
      );

      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
    });

    it('should handle unknown data block types', () => {
      const unknownBlockEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      unknownBlockEdid[126] = 1;
      unknownBlockEdid[127] = calculateChecksum(unknownBlockEdid);

      const ctaExtension = buildBlock([0x02, 0x03, 0x05, 0xf1, 0xc1, 0xff]);

      const parsed = parseEdid(
        new Uint8ClampedArray(unknownBlockEdid.concat(ctaExtension)),
      );

      expect(parsed.extensions[0]?.dataBlockCollection).toBeDefined();
      expect(
        parsed.warnings.some(
          (warning) => warning.code === 'unknown_data_block',
        ),
      ).toBe(true);
    });
  });

  describe('HDMI VSDB Error Handling', () => {
    it('should handle HDMI VSDB with insufficient data', () => {
      const shortHdmiEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      shortHdmiEdid[126] = 1;
      shortHdmiEdid[127] = calculateChecksum(shortHdmiEdid);

      const ctaExtension = buildBlock([
        0x02, 0x03, 0x0c, 0xf1, 0x65, 0x03, 0x0c, 0x00, 0x10,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(shortHdmiEdid.concat(ctaExtension)),
      );

      const hdmiBlock = parsed.extensions[0]?.dataBlockCollection
        ?.filter(isVendorBlock)
        .find((block) => block.ieeeOui === 0x000c03);

      expect(hdmiBlock).toBeDefined();
    });

    it('should handle unknown IEEE OUI values', () => {
      const unknownOuiEdid = buildBlock([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00,
      ]);
      unknownOuiEdid[126] = 1;
      unknownOuiEdid[127] = calculateChecksum(unknownOuiEdid);

      const ctaExtension = buildBlock([
        0x02, 0x03, 0x10, 0xf1, 0x68, 0xaa, 0xbb, 0xcc, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(unknownOuiEdid.concat(ctaExtension)),
      );

      const unknownBlock = parsed.extensions[0]?.dataBlockCollection
        ?.filter(isVendorBlock)
        .find((block) => block.ieeeOui === 0xccbbaa);

      expect(unknownBlock).toBeDefined();
    });
  });

  describe('Maximum EDID Size Handling', () => {
    it('should handle maximum 256 block EDID', () => {
      let maxEdid = createFullEdidArray(FAKE_1080P60);
      maxEdid[126] = 255;

      for (let i = 0; i < 3; i += 1) {
        const extension = new Array<number>(128).fill(0);
        extension[0] = 0x02;
        extension[127] = calculateChecksum(extension);
        maxEdid = maxEdid.concat(extension);
      }

      const parsed = parseEdid(new Uint8ClampedArray(maxEdid));
      expect(parsed.baseBlock.numberOfExtensions).toBe(255);
    });

    it('should handle block map extensions', () => {
      const blockMapEdid = createFullEdidArray(FAKE_1080P60);
      blockMapEdid[126] = 1;
      blockMapEdid[127] = calculateChecksum(blockMapEdid);

      const blockMapExtension = new Array<number>(128).fill(0);
      blockMapExtension[0] = 0xf0;
      blockMapExtension[127] = calculateChecksum(blockMapExtension);

      const parsed = parseEdid(
        new Uint8ClampedArray(blockMapEdid.concat(blockMapExtension)),
      );

      expect(parsed.extensions[0]?.extTagByte).toBe(0xf0);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle very large EDID data arrays', () => {
      let largeEdid = createFullEdidArray(FAKE_1080P60);

      for (let i = 0; i < 10; i += 1) {
        const extension = new Array<number>(128).fill(i % 256);
        extension[0] = 0x02;
        extension[127] = calculateChecksum(extension);
        largeEdid = largeEdid.concat(extension);
      }

      const parsed = parseEdid(new Uint8ClampedArray(largeEdid));
      expect(parsed.baseBlock.isHeaderValid).toBe(true);
    });

    it('should handle repeated parsing calls', () => {
      const testData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidData = createFullEdidArray(testData);

      let parsed = parseEdid(new Uint8ClampedArray(edidData));
      for (let i = 0; i < 10; i += 1) {
        parsed = parseEdid(new Uint8ClampedArray(edidData));
      }

      expect(parsed.baseBlock.vendorId).toBe('SAM');
      expect(parsed.baseBlock.numberOfExtensions).toBe(1);
    });

    it('should handle EDID data modification after parsing', () => {
      const testData = fixChecksums(FAKE_1080P60);
      const edidData = createFullEdidArray(testData);

      const parsed = parseEdid(new Uint8ClampedArray(edidData));
      const originalEisa = parsed.baseBlock.vendorId;

      edidData[8] = 0xff;
      edidData[9] = 0xff;

      const reparsed = parseEdid(new Uint8ClampedArray(edidData));
      expect(reparsed.baseBlock.vendorId).not.toBe(originalEisa);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid EDID', () => {
      const minimalEdid = [
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x03,
      ].concat(new Array<number>(108).fill(0));
      minimalEdid[126] = 0;
      minimalEdid[127] = calculateChecksum(minimalEdid);

      const parsed = parseEdid(new Uint8ClampedArray(minimalEdid));
      expect(parsed.baseBlock.headerValidity).toBe('OK');
      expect(parsed.baseBlock.numberOfExtensions).toBe(0);
    });

    it('should handle extreme chromaticity values', () => {
      const extremeChromEdid = createFullEdidArray(FAKE_1080P60);
      for (let i = 25; i <= 34; i += 1) {
        extremeChromEdid[i] = 0xff;
      }
      extremeChromEdid[127] = calculateChecksum(extremeChromEdid);

      const parsed = parseEdid(new Uint8ClampedArray(extremeChromEdid));
      const chrom = parsed.baseBlock.chromaticity;
      expect(chrom?.redXCoords).toBeGreaterThanOrEqual(0);
      expect(chrom?.redXCoords).toBeLessThanOrEqual(1);
      expect(chrom?.redYCoords).toBeGreaterThanOrEqual(0);
      expect(chrom?.redYCoords).toBeLessThanOrEqual(1);
    });

    it('should handle extreme timing values', () => {
      const extremeTimingEdid = createFullEdidArray(FAKE_1080P60);
      extremeTimingEdid[54] = 0xff;
      extremeTimingEdid[55] = 0xff;
      extremeTimingEdid[127] = calculateChecksum(extremeTimingEdid);

      const parsed = parseEdid(new Uint8ClampedArray(extremeTimingEdid));
      const dtd = parsed.baseBlock.dtds?.[0];
      expect(dtd?.pixelClockMhz).toBe(655.35);
    });
  });
});
