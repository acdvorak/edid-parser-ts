/**
 * @fileoverview Performance tests for the EDID parser, including parsing speed,
 * memory usage, and regression testing.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidPerformanceSpec.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';

import {
  createFullEdidArray,
  DELL_P2415Q_4K_HDMI14_PRO,
  FAKE_1080P60,
  FAKE_ACER_8K120_GAMING,
  fixChecksums,
  LG_C9_4K60_HDMI21_GAMING,
  SAMSUNG_Q800T_8K60_HDMI21_GAMING,
} from './edid-test-data';

describe('EDID Parser Performance Tests', () => {
  describe('Parsing Performance', () => {
    it('should parse basic EDID within reasonable time', () => {
      const basicData = fixChecksums(FAKE_1080P60);
      const edidArray = createFullEdidArray(basicData);

      const startTime = Date.now();
      parseEdid(new Uint8ClampedArray(edidArray));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should parse complex modern EDID within reasonable time', () => {
      const complexData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(complexData);

      const startTime = Date.now();
      parseEdid(new Uint8ClampedArray(edidArray));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle multiple parsing iterations efficiently', () => {
      const testDisplays = [
        FAKE_1080P60,
        SAMSUNG_Q800T_8K60_HDMI21_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
        FAKE_ACER_8K120_GAMING,
      ];

      const startTime = Date.now();

      for (let iteration = 0; iteration < 5; iteration += 1) {
        for (const display of testDisplays) {
          const displayData = fixChecksums(display);
          const edidArray = createFullEdidArray(displayData);
          parseEdid(new Uint8ClampedArray(edidArray));
        }
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Memory Usage', () => {
    it('should not accumulate excessive data between parses', () => {
      const testData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(testData);

      let parsed = parseEdid(new Uint8ClampedArray(edidArray));
      for (let i = 0; i < 50; i += 1) {
        parsed = parseEdid(new Uint8ClampedArray(edidArray));
        expect(parsed.baseBlock.headerValidity).toBe('OK');
        expect(parsed.baseBlock.numberOfExtensions).toBe(1);
      }

      expect(
        parsed.extensions[0]?.dataBlockCollection?.length ?? 0,
      ).toBeGreaterThan(0);
    });

    it('should handle large EDID data efficiently', () => {
      const largeEdid = new Array<number>(256 * 128).fill(0);
      largeEdid[0] = 0x00;
      largeEdid[1] = 0xff;
      largeEdid[2] = 0xff;
      largeEdid[3] = 0xff;
      largeEdid[4] = 0xff;
      largeEdid[5] = 0xff;
      largeEdid[6] = 0xff;
      largeEdid[7] = 0x00;
      largeEdid[126] = 254;

      for (let block = 1; block <= 254; block += 1) {
        const offset = block * 128;
        largeEdid[offset] = 0x02;
        largeEdid[offset + 1] = 0x03;
        largeEdid[offset + 2] = 0x04;
        largeEdid[offset + 3] = 0x00;
      }

      for (let block = 0; block <= 254; block += 1) {
        const offset = block * 128;
        let sum = 0;
        for (let i = 0; i < 127; i += 1) {
          sum += largeEdid[offset + i] ?? 0;
        }
        largeEdid[offset + 127] = (256 - (sum % 256)) % 256;
      }

      const startTime = Date.now();
      const parsed = parseEdid(new Uint8ClampedArray(largeEdid));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
      expect(parsed.baseBlock.numberOfExtensions).toBe(254);
    });
  });

  describe('Regression Testing', () => {
    it('should maintain consistent parsing results', () => {
      const testData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(testData);

      const firstParse = parseEdid(new Uint8ClampedArray(edidArray));
      const firstSummary = {
        vendorId: firstParse.baseBlock.vendorId,
        productCode: firstParse.productInfo.productCode,
        extensionCount: firstParse.baseBlock.numberOfExtensions,
        dataBlockCount:
          firstParse.extensions[0]?.dataBlockCollection?.length ?? 0,
      };

      for (let i = 0; i < 5; i += 1) {
        const parsed = parseEdid(new Uint8ClampedArray(edidArray));
        expect(parsed.baseBlock.vendorId).toBe(firstSummary.vendorId);
        expect(parsed.productInfo.productCode).toBe(firstSummary.productCode);
        expect(parsed.baseBlock.numberOfExtensions).toBe(
          firstSummary.extensionCount,
        );
        expect(parsed.extensions[0]?.dataBlockCollection?.length ?? 0).toBe(
          firstSummary.dataBlockCount,
        );
      }
    });

    it('should handle all test samples without errors', () => {
      const allTestSamples = [
        FAKE_1080P60,
        SAMSUNG_Q800T_8K60_HDMI21_GAMING,
        LG_C9_4K60_HDMI21_GAMING,
        FAKE_ACER_8K120_GAMING,
        DELL_P2415Q_4K_HDMI14_PRO,
      ];

      const successfulParses = allTestSamples.filter((sample) => {
        const testData = fixChecksums(sample);
        const edidArray = createFullEdidArray(testData);
        const parsed = parseEdid(new Uint8ClampedArray(edidArray));
        return parsed.baseBlock.headerValidity === 'OK';
      }).length;

      const successRate = successfulParses / allTestSamples.length;
      expect(successRate).toBe(1);
    });
  });

  describe('Benchmarking', () => {
    it('should track parsing performance improvements', () => {
      const testData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const edidArray = createFullEdidArray(testData);

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i += 1) {
        const startTime = Date.now();
        parseEdid(new Uint8ClampedArray(edidArray));
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const sum = times.reduce((a, b) => a + b, 0);
      const average = sum / times.length;
      const max = Math.max(...times);

      expect(average).toBeLessThan(500);
      expect(max).toBeLessThan(2000);
    });
  });
});
