/**
 * @fileoverview Unit tests for the EDID parser covering header validation,
 * vendor/product identification, display parameters, chromaticity, timings, and
 * checksum verification.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';

import { calculateChecksum } from './edid-test-data';

const EDID_BLOCK_LENGTH = 128;

function buildBaseEdid(prefix: number[]): number[] {
  const base = prefix.concat(
    new Array<number>(Math.max(EDID_BLOCK_LENGTH - prefix.length, 0)).fill(0),
  );
  base[127] = calculateChecksum(base);
  return base;
}

describe('EDID Parser', () => {
  describe('EDID Header Validation', () => {
    it('should validate correct EDID header', () => {
      const validHeader = [0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00];
      const base = buildBaseEdid(validHeader);
      const parsed = parseEdid(new Uint8ClampedArray(base));

      expect(parsed.baseBlock.isHeaderValid).toBe(true);
      expect(
        parsed.warnings.some((warning) => warning.code === 'invalid_header'),
      ).toBe(false);
    });

    it('should reject invalid EDID header', () => {
      const invalidHeader = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00];
      const base = buildBaseEdid(invalidHeader);
      const parsed = parseEdid(new Uint8ClampedArray(base));

      expect(parsed.baseBlock.isHeaderValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'invalid_header'),
      ).toBe(true);
    });

    it('should reject incomplete header', () => {
      const incompleteHeader = [0x00, 0xff, 0xff];
      const parsed = parseEdid(new Uint8ClampedArray(incompleteHeader));

      expect(parsed.baseBlock.isHeaderValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'too_short'),
      ).toBe(true);
    });
  });

  describe('EISA ID Parsing', () => {
    it('should parse Samsung EISA ID correctly', () => {
      const samsungEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(samsungEdid));
      expect(parsed.baseBlock.vendorId).toBe('SAM');
    });
  });

  describe('Product Information', () => {
    it('should parse product code correctly', () => {
      const productEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x34, 0x12,
        0xbc, 0x9a, 0x78, 0x56,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(productEdid));
      expect(parsed.productInfo.productCode).toBe(0x1234);
    });

    it('should parse serial number correctly', () => {
      const productEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x34, 0x12,
        0xbc, 0x9a, 0x78, 0x56,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(productEdid));
      expect(parsed.productInfo.serialNumberInt).toBe(0x56789abc);
    });
  });

  describe('Manufacture Date', () => {
    it('should parse manufacture week correctly', () => {
      const dateEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x19, 0x21,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(dateEdid));
      expect(parsed.productInfo.manufactureWeek).toBe(25);
    });

    it('should parse manufacture year correctly', () => {
      const dateEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x19, 0x21,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(dateEdid));
      expect(parsed.productInfo.manufactureYear).toBe(2023);
    });
  });

  describe('EDID Version', () => {
    it('should parse EDID version correctly', () => {
      const versionEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(versionEdid));
      expect(parsed.baseBlock.edidVersion).toBe(1);
    });

    it('should parse EDID revision correctly', () => {
      const versionEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(versionEdid));
      expect(parsed.baseBlock.edidRevision).toBe(4);
    });

    it('should preserve EDID v1.19 and warn about unknown minor version', () => {
      const edidV119 = new Uint8ClampedArray([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x30, 0xe4, 0x01, 0x46,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x12, 0x01, 0x13, 0x90, 0x1d, 0x12, 0x78,
        0x0a, 0x1e, 0x85, 0x96, 0x5a, 0x55, 0x8c, 0x26, 0x1f, 0x50, 0x54, 0x00,
        0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0xf4, 0x1a, 0x00, 0x82, 0x50, 0x20,
        0x10, 0x30, 0x30, 0x20, 0x36, 0x00, 0x1e, 0xb3, 0x10, 0x00, 0x00, 0x18,
        0x84, 0x12, 0x00, 0xa0, 0x50, 0x20, 0x17, 0x30, 0x30, 0x20, 0x36, 0x00,
        0x1e, 0xb3, 0x10, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0xfe, 0x00, 0x57,
        0x55, 0x39, 0x37, 0x33, 0x81, 0x31, 0x33, 0x33, 0x57, 0x58, 0x32, 0x0a,
        0x00, 0x00, 0x00, 0xfe, 0x00, 0x08, 0x0e, 0x14, 0x19, 0x33, 0x5d, 0x7f,
        0xff, 0x01, 0x01, 0x0a, 0x20, 0x20, 0x00, 0xc1,
      ]);

      const parsed = parseEdid(edidV119);

      expect(parsed.baseBlock.edidVersion).toBe(1);
      expect(parsed.baseBlock.edidRevision).toBe(19);
      expect(parsed.baseBlock.edidVersionString).toBe('1.19');
      expect(parsed.featureSupport.edidVersion).toBe(1.19);
      expect(
        parsed.warnings.some(
          (warning) => warning.code === 'unknown_edid_minor_version',
        ),
      ).toBe(true);
      expect(
        parsed.warnings.some(
          (warning) =>
            warning.message ===
            'Unknown EDID minor version 19, assuming 1.4 conformance.',
        ),
      ).toBe(true);
    });
  });

  describe('Basic Display Parameters', () => {
    it('should detect digital input', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.isDigital).toBe(true);
    });

    it('should detect VESA DFP compatibility', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.isVesaDfpCompatible).toBe(true);
    });

    it('should parse maximum image size', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.physicalWidthInMm).toBe(600);
      expect(bdp?.physicalHeightInMm).toBe(340);
    });

    it('should calculate gamma correctly', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.displayGamma).toBeCloseTo(2.2, 1);
    });

    it('should parse DPMS support', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.supportsDpmsStandby).toBe(false);
      expect(bdp?.supportsDpmsSuspend).toBe(false);
      expect(bdp?.supportsDpmsActiveOff).toBe(false);
    });

    it('should detect sRGB support', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.isStandardSRgb).toBe(true);
    });

    it('should detect preferred timing', () => {
      const displayEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(displayEdid));
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.isPreferredTiming).toBe(true);
    });
  });

  describe('Chromaticity Coordinates', () => {
    it('should parse chromaticity coordinates', () => {
      const chromEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(chromEdid));
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

  describe('Established Timings', () => {
    it('should parse established timing bitmap', () => {
      const timingEdid = buildBaseEdid([
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54, 0x21, 0x08,
        0x00,
      ]);

      const parsed = parseEdid(new Uint8ClampedArray(timingEdid));
      expect(parsed.baseBlock.timingBitmap).toBe(0x80000);
    });
  });

  describe('Checksum Validation', () => {
    it('should calculate checksum correctly', () => {
      const testEdid = new Array<number>(128).fill(0);
      testEdid[0] = 0x00;
      testEdid[1] = 0xff;
      testEdid[2] = 0xff;
      testEdid[3] = 0xff;
      testEdid[4] = 0xff;
      testEdid[5] = 0xff;
      testEdid[6] = 0xff;
      testEdid[7] = 0x00;
      testEdid[8] = 0x01;
      testEdid[127] = calculateChecksum(testEdid);

      const parsed = parseEdid(new Uint8ClampedArray(testEdid));
      expect(parsed.baseBlock.checksum).toBe(testEdid[127]);
      expect(parsed.baseBlock.isChecksumValid).toBe(true);
    });

    it('should validate correct checksum', () => {
      const testEdid = new Array<number>(128).fill(0);
      testEdid[0] = 0x00;
      testEdid[1] = 0xff;
      testEdid[2] = 0xff;
      testEdid[3] = 0xff;
      testEdid[4] = 0xff;
      testEdid[5] = 0xff;
      testEdid[6] = 0xff;
      testEdid[7] = 0x00;
      testEdid[8] = 0x01;
      testEdid[127] = calculateChecksum(testEdid);

      const parsed = parseEdid(new Uint8ClampedArray(testEdid));
      expect(parsed.baseBlock.isChecksumValid).toBe(true);
    });

    it('should detect invalid checksum', () => {
      const testEdid = new Array<number>(128).fill(0);
      testEdid[0] = 0x00;
      testEdid[1] = 0xff;
      testEdid[2] = 0xff;
      testEdid[3] = 0xff;
      testEdid[4] = 0xff;
      testEdid[5] = 0xff;
      testEdid[6] = 0xff;
      testEdid[7] = 0x00;
      testEdid[8] = 0x01;
      testEdid[127] = 0xff;

      const parsed = parseEdid(new Uint8ClampedArray(testEdid));
      expect(parsed.baseBlock.isChecksumValid).toBe(false);
      expect(
        parsed.warnings.some((warning) => warning.code === 'checksum_failed'),
      ).toBe(true);
    });
  });

  describe('Number of Extensions', () => {
    it('should parse number of extensions correctly', () => {
      const extEdid = new Array<number>(128).fill(0);
      extEdid[0] = 0x00;
      extEdid[1] = 0xff;
      extEdid[2] = 0xff;
      extEdid[3] = 0xff;
      extEdid[4] = 0xff;
      extEdid[5] = 0xff;
      extEdid[6] = 0xff;
      extEdid[7] = 0x00;
      extEdid[126] = 0x02;
      extEdid[127] = calculateChecksum(extEdid);

      const parsed = parseEdid(new Uint8ClampedArray(extEdid));
      expect(parsed.baseBlock.numberOfExtensions).toBe(2);
      expect(parsed.expectedExtensionCount).toBe(2);
    });
  });

  describe('Full EDID Parsing', () => {
    it('should parse complete EDID successfully', () => {
      const fullEdid = [
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40, 0x70,
        0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54, 0x21, 0x08,
        0x00, 0xd1, 0xc0, 0xa9, 0xc0, 0x81, 0xc0, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x02, 0x3a, 0x80, 0x18, 0x71, 0x38, 0x2d, 0x40,
        0x58, 0x2c, 0x45, 0x00, 0x58, 0x54, 0x21, 0x00, 0x00, 0x1e, 0x00, 0x00,
        0x00, 0xfd, 0x00, 0x32, 0x78, 0x1e, 0x87, 0x1e, 0x00, 0x0a, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00, 0xfc, 0x00, 0x53, 0x41, 0x4d,
        0x53, 0x55, 0x4e, 0x47, 0x0a, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00, 0x00,
        0x00, 0xff, 0x00, 0x48, 0x4e, 0x41, 0x51, 0x31, 0x30, 0x32, 0x39, 0x34,
        0x35, 0x0a, 0x20, 0x20, 0x00, 0x00,
      ];

      const checksum = calculateChecksum(fullEdid);
      const fullEdidWithChecksum = fullEdid.slice();
      fullEdidWithChecksum[127] = checksum;

      const parsed = parseEdid(new Uint8ClampedArray(fullEdidWithChecksum));
      expect(parsed.baseBlock.headerValidity).toBe('OK');
      expect(parsed.baseBlock.vendorId).toBe('SAM');
      expect(parsed.productInfo.productCode).toBe(0x7040);
      expect(parsed.productInfo.serialNumberInt).toBe(1);
      expect(parsed.baseBlock.edidVersionString).toBe('1.4');
      expect(parsed.baseBlock.numberOfExtensions).toBe(0);
    });

    it('should parse DTDs correctly', () => {
      const fullEdid = [
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40, 0x70,
        0x01, 0x00, 0x00, 0x00, 0x19, 0x21, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54, 0x21, 0x08,
        0x00, 0xd1, 0xc0, 0xa9, 0xc0, 0x81, 0xc0, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x02, 0x3a, 0x80, 0x18, 0x71, 0x38, 0x2d, 0x40,
        0x58, 0x2c, 0x45, 0x00, 0x58, 0x54, 0x21, 0x00, 0x00, 0x1e, 0x00, 0x00,
        0x00, 0xfd, 0x00, 0x32, 0x78, 0x1e, 0x87, 0x1e, 0x00, 0x0a, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00, 0xfc, 0x00, 0x53, 0x41, 0x4d,
        0x53, 0x55, 0x4e, 0x47, 0x0a, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00, 0x00,
        0x00, 0xff, 0x00, 0x48, 0x4e, 0x41, 0x51, 0x31, 0x30, 0x32, 0x39, 0x34,
        0x35, 0x0a, 0x20, 0x20, 0x00, 0x00,
      ];

      const fullEdidWithChecksum = fullEdid.slice();
      fullEdidWithChecksum[127] = calculateChecksum(fullEdidWithChecksum);

      const parsed = parseEdid(new Uint8ClampedArray(fullEdidWithChecksum));
      expect(parsed.baseBlock.dtds?.length).toBeGreaterThan(0);

      const dtd = parsed.baseBlock.dtds?.[0];
      expect(dtd?.pixelClockMhz).toBeGreaterThan(0);
      expect(dtd?.horizontalActivePixels).toBeGreaterThan(0);
      expect(dtd?.verticalActivePixels).toBeGreaterThan(0);
    });
  });
});
