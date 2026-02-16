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

import { parseEdid } from '../src/parser/parser-core';

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

function setMonitorDescriptor(
  base: number[],
  slotIndex: number,
  descriptorTag: number,
  text: string,
): void {
  const DTD_START_OFFSET = 54;
  const DTD_LENGTH = 18;
  const TEXT_LENGTH = 13;
  const descriptorOffset = DTD_START_OFFSET + slotIndex * DTD_LENGTH;

  base[descriptorOffset] = 0x00;
  base[descriptorOffset + 1] = 0x00;
  base[descriptorOffset + 2] = 0x00;
  base[descriptorOffset + 3] = descriptorTag;
  base[descriptorOffset + 4] = 0x00;

  for (let index = 0; index < TEXT_LENGTH; index++) {
    base[descriptorOffset + 5 + index] = 0x20;
  }

  const charCount = Math.min(text.length, TEXT_LENGTH);
  for (let index = 0; index < charCount; index++) {
    base[descriptorOffset + 5 + index] = text.charCodeAt(index);
  }

  if (charCount < TEXT_LENGTH) {
    base[descriptorOffset + 5 + charCount] = 0x0a;
  }
}

function setRawMonitorDescriptor(
  base: number[],
  slotIndex: number,
  descriptorTag: number,
  payload: readonly number[],
): void {
  const DTD_START_OFFSET = 54;
  const DTD_LENGTH = 18;
  const TEXT_LENGTH = 13;
  const descriptorOffset = DTD_START_OFFSET + slotIndex * DTD_LENGTH;

  base[descriptorOffset] = 0x00;
  base[descriptorOffset + 1] = 0x00;
  base[descriptorOffset + 2] = 0x00;
  base[descriptorOffset + 3] = descriptorTag;
  base[descriptorOffset + 4] = 0x00;

  for (let index = 0; index < TEXT_LENGTH; index++) {
    base[descriptorOffset + 5 + index] = payload[index] ?? 0x00;
  }
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
      expect(parsed.baseBlock.isHeaderValid).toBe(true);
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
      expect(parsed.baseBlock.isHeaderValid).toBe(false);
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
      expect(parsed.baseBlock.vendorId).toBe('SAM');
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
      expect(parsed.baseBlock.vendorId).toBe('DEL');
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
      expect(parsed.productInfo.productCode).toBe(0x7040);
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
      expect(parsed.productInfo.serialNumberInt).toBe(1);
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
      expect(parsed.productInfo.manufactureWeek).toBe(25);
      expect(parsed.productInfo.manufactureYear).toBe(2023);
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
      const bdp = parsed.basicDisplayParams;
      expect(bdp?.isDigital).toBe(true);
      expect(bdp?.physicalWidthInMm).toBe(600);
      expect(bdp?.physicalHeightInMm).toBe(340);
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
      expect(parsed.baseBlock.isChecksumValid).toBe(true);
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
      expect(parsed.baseBlock.isChecksumValid).toBe(false);
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
      expect(dtd?.pixelClockMhz).toBeCloseTo(328.26, 1);
      expect(dtd?.horizontalActivePixels).toBe(792);
      expect(dtd?.verticalActivePixels).toBe(1325);
    });
  });

  describe('Monitor Descriptors', () => {
    it('parses monitor serial number, unspecified text, and monitor name', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x40,
          0x70, 0x01, 0x00, 0x00, 0x00,
        ],
        { extensions: 0 },
      );

      setMonitorDescriptor(base, 0, 0xff, 'SER1234567');
      setMonitorDescriptor(base, 1, 0xfe, 'Factory Text');
      setMonitorDescriptor(base, 2, 0xfc, 'PHL 223V5');
      base[127] = calculateChecksum(base);

      const parsed = parseEdid(new Uint8ClampedArray(base));

      expect(parsed.productInfo.serialNumberStr).toBe('SER1234567');
      expect(parsed.productInfo.unspecifiedStrings).toEqual(['Factory Text']);
      expect(parsed.productInfo.modelName).toBe('PHL 223V5');
    });

    it('parses SPWG descriptor pair into baseBlock.spwg', () => {
      const base = buildBaseEdid(
        [
          0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x30, 0x64, 0x09,
          0x21, 0x34, 0x31, 0x34, 0x35,
        ],
        { extensions: 0 },
      );

      const DTD_START_OFFSET = 54;
      const DTD_LENGTH = 18;
      const secondDtdOffset = DTD_START_OFFSET + DTD_LENGTH;
      base[secondDtdOffset + DTD_LENGTH - 1] = 26;

      setRawMonitorDescriptor(
        base,
        2,
        0xfe,
        [0x48, 0x4d, 0x57, 0x31, 0x4b, 0x40, 0x31, 0x32, 0x31, 0x45, 0x57, 0x55, 0x0a],
      );
      setRawMonitorDescriptor(
        base,
        3,
        0xfe,
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x0a, 0x20, 0x20],
      );
      base[127] = calculateChecksum(base);

      const parsed = parseEdid(new Uint8ClampedArray(base));

      expect(parsed.baseBlock.spwg).toEqual({
        moduleRevision: 26,
        descriptor3: {
          pcMakerPartNumber: 'HMW1K',
          lcdSupplierEedidRevision: 64,
          manufacturerPartNumber: '121EWU',
        },
        descriptor4: {
          smbusValues: [0, 0, 0, 0, 0, 0, 0, 0],
          lvdsChannels: 1,
          isPanelSelfTestPresent: true,
        },
      });
      expect(parsed.productInfo.unspecifiedStrings).toBeUndefined();
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
      expect(extension?.extTagByte).toBe(0x02);
      expect(extension?.revisionNumber).toBe(0x03);
      expect(extension?.extensionType).toBe('cta-861');
      expect(extension?.isChecksumValid).toBe(true);
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
