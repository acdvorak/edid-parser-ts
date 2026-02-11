/**
 * @fileoverview Unit tests for the EDID parser validating header, manufacturer
 * ID, product details, display parameters, chromaticity, timings, and extension
 * blocks.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edid-standalone/edidSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/edid-parser';

import { calculateChecksum } from './edid-test-data';

const EDID_BLOCK_LENGTH = 128;

function buildBaseEdid(
  prefix: number[],
  options?: { extensions?: number; checksum?: number },
): number[] {
  const base = prefix.concat(
    new Array<number>(Math.max(EDID_BLOCK_LENGTH - prefix.length, 0)).fill(0),
  );
  if (options?.extensions !== undefined) {
    base[126] = options.extensions;
  }
  if (options?.checksum !== undefined) {
    base[127] = options.checksum;
  } else {
    base[127] = calculateChecksum(base);
  }
  return base;
}

function buildExtensionBlock(prefix: number[]): number[] {
  const block = prefix.concat(
    new Array<number>(Math.max(EDID_BLOCK_LENGTH - prefix.length, 0)).fill(0),
  );
  block[127] = calculateChecksum(block);
  return block;
}

describe('EDID Parser Core Tests', () => {
  describe('Header Validation', () => {
    it('validates correct EDID header', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.headerValid).toBe(true);
      expect(parsed.warnings.some((w) => w.code === 'invalid_header')).toBe(
        false,
      );
    });

    it('rejects invalid EDID header', () => {
      const base = buildBaseEdid(
        [
          0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.headerValid).toBe(false);
      expect(parsed.warnings.some((w) => w.code === 'invalid_header')).toBe(
        true,
      );
    });
  });

  describe('Manufacturer ID Parsing', () => {
    it('parses Samsung manufacturer ID correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.eisaId).toBe('SAM');
    });

    it('parses Dell manufacturer ID correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x10, 0xac, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.eisaId).toBe('DEL');
    });
  });

  describe('Product Code and Serial', () => {
    it('parses product code correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.productCode).toBe(0x7040);
    });

    it('parses serial number correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.serialNumber).toBe(1);
    });
  });

  describe('Manufacture Date', () => {
    it('parses manufacture week and year correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.manufactureWeek).toBe(25);
      expect(parsed.baseBlock.manufactureYear).toBe(2023);
    });
  });

  describe('EDID Version', () => {
    it('parses EDID version 1.4 correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.edidVersion).toBe(1);
      expect(parsed.baseBlock.edidRevision).toBe(4);
    });
  });

  describe('Basic Display Parameters', () => {
    it('parses basic display parameters correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04, 0x95, 0x3c,
          0x22, 0x78, 0x0e,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      const bdp = parsed.baseBlock.basicDisplayParams;
      expect(bdp?.digitalInput).toBe(true);
      expect(bdp?.maxHorImgSize).toBe(60);
      expect(bdp?.maxVertImgSize).toBe(34);
      expect(bdp?.displayGamma).toBeCloseTo(2.195, 2);
    });
  });

  describe('Chromaticity Coordinates', () => {
    it('parses chromaticity coordinates correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04, 0x95, 0x3c,
          0x22, 0x78, 0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50,
          0x54,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      const chrom = parsed.baseBlock.chromaticity;

      expect(chrom?.redXCoords).toBeCloseTo(0.3301, 3);
      expect(chrom?.redYCoords).toBeCloseTo(0.2979, 3);
      expect(chrom?.greenXCoords).toBeCloseTo(0.5977, 3);
      expect(chrom?.greenYCoords).toBeCloseTo(0.1494, 3);
      expect(chrom?.blueXCoords).toBeCloseTo(0.0605, 3);
      expect(chrom?.blueYCoords).toBeCloseTo(0.3145, 3);
      expect(chrom?.whiteXCoords).toBeCloseTo(0.3281, 3);
      expect(chrom?.whiteYCoords).toBeCloseTo(0.0029, 3);
    });
  });

  describe('Checksum Validation', () => {
    it('detects valid checksum', () => {
      const base = new Array<number>(128).fill(0);
      base[0] = 0x00;
      base[1] = 0xff;
      base[2] = 0xff;
      base[3] = 0xff;
      base[4] = 0xff;
      base[5] = 0xff;
      base[6] = 0xff;
      base[7] = 0x00;
      base[127] = calculateChecksum(base);

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.checksumValid).toBe(true);
    });

    it('detects invalid checksum', () => {
      const base = new Array<number>(128).fill(0);
      base[0] = 0x00;
      base[1] = 0xff;
      base[2] = 0xff;
      base[3] = 0xff;
      base[4] = 0xff;
      base[5] = 0xff;
      base[6] = 0xff;
      base[7] = 0x00;
      base[127] = 5;

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.checksumValid).toBe(false);
      expect(parsed.warnings.some((w) => w.code === 'checksum_failed')).toBe(
        true,
      );
    });
  });

  describe('Detailed Timing Descriptors', () => {
    it('parses DTD correctly based on actual parser behavior', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04, 0x95, 0x3c,
          0x22, 0x78, 0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50,
          0x54, 0x21, 0x08, 0x00, 0xd1, 0xc0, 0xa9, 0xc0, 0x81, 0xc0, 0x01,
          0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x3a,
          0x80, 0x18, 0x71, 0x38, 0x2d, 0x40, 0x58, 0x2c, 0x45, 0x00, 0x58,
          0x54, 0x21, 0x00, 0x00, 0x1e,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      const dtds = parsed.baseBlock.dtds ?? [];
      expect(dtds.length).toBeGreaterThan(0);
      const dtd = dtds[0];
      expect(dtd?.pixelClock).toBeCloseTo(328.26, 1);
      expect(dtd?.horActivePixels).toBe(792);
      expect(dtd?.vertActivePixels).toBe(1325);
    });
  });

  describe('Extensions', () => {
    it('detects no extensions correctly', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      const parsed = parseEdid(new Uint8ClampedArray(base));
      expect(parsed.baseBlock.numberOfExtensions).toBe(0);
    });

    it('parses CTA extension block header fields', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 1 },
      );

      const ext = buildExtensionBlock([0x02, 0x03, 0x04, 0x00]);

      const parsed = parseEdid(new Uint8ClampedArray([...base, ...ext]));
      expect(parsed.extensions.length).toBe(1);
      const extension = parsed.extensions[0];
      expect(extension?.extTag).toBe(0x02);
      expect(extension?.revisionNumber).toBe(0x03);
      expect(extension?.extensionType).toBe('cta-861');
      expect(extension?.checksumValid).toBe(true);
    });
  });

  describe('Warnings', () => {
    it('returns warnings for malformed input without throwing', () => {
      const parsed = parseEdid(new Uint8ClampedArray([0x00, 0xff]));
      const warningCodes = parsed.warnings.map((warning) => warning.code);
      expect(warningCodes).toContain('too_short');
      expect(warningCodes).toContain('length_not_multiple_of_128');
    });
  });
});
