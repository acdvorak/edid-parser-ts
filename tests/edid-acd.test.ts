/**
 * @license MIT
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type { PartialDeep } from 'type-fest';
import { describe, expect, it } from 'vitest';

import { parseEdid } from '../src/parser/parser-core';
import type { ParsedEdid } from '../src/parser/parser-types';

import {
  APPLE_TB27_BYTES,
  ASUS_PA32UCDM_BYTES,
  BOE_CQ_NE173QHM_NZ1_BYTES,
  BOE_NJ_NE160QDM_NYC_BYTES,
  DELL_ST2320L_BYTES,
  LG_31MU97_BYTES,
  SAMSUNG_ODYSSEY_G75F_BYTES,
  SAMSUNG_S95C_BYTES,
} from './edid-test-data';

describe('EDID Parser - ACD Test Data', () => {
  describe('Samsung S95C', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(SAMSUNG_S95C_BYTES);

      expect(parsed.bytes.byteLength).toBe(512);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        isHeaderValid: true,
        isChecksumValid: true,
        featureSupport: {
          colorGamuts: ['srgb', 'display_p3', 'rec_2020'],
          maxInputSignalBitDepth: 12,
          supportsHDR10: true,
          supportsHDR10Plus: true,
          supportsDolbyVision: false,
          supportsGameMode: true,
          supportsALLM: true,
          minSrrHz: 48,
          maxSrrHz: 144,
          supportsVRR: true,
          minVrrHz: 48,
          maxVrrHz: 144,
          edidVersion: 1.3,
          hdmiVersion: 2.1,
          displayIdVersion: 1.2,
        },
        vendorInfo: {
          vid: 'SAM',
          goodName: 'Samsung',
          shortBrandName: 'Samsung',
        },
        productInfo: {
          productCode: 29605,
          serialNumberInt: 16780800,
          modelName: 'QCQ95S',
          manufactureWeek: 1,
          manufactureYear: 2023,
        },
        basicDisplayParams: {
          physicalWidthInMm: 1420,
          physicalHeightInMm: 800,
          diagonalInches: 64.2,
        },
        nativeResolution: {
          activeHorizontalPixels: 3840,
          activeVerticalLines: 2160,
          physicalWidthInMm: 1872,
          physicalHeightInMm: 1053,
          diagonalInches: 84.6,
          isInterlaced: false,
          refreshRateHz: 60,
        },
        baseBlock: {
          vendorId: 'SAM',
          edidVersion: 1,
          edidRevision: 3,
          edidVersionString: '1.3',
          dtds: [
            {
              horizontalDisplaySizeInMm: 1872,
              verticalDisplaySizeInMm: 1053,
              diagonalDisplaySizeInMm: 2147.8,
              horizontalActivePixels: 3840,
              verticalActivePixels: 2160,
            },
            {
              horizontalDisplaySizeInMm: 1872,
              verticalDisplaySizeInMm: 1053,
              diagonalDisplaySizeInMm: 2147.8,
              horizontalActivePixels: 2560,
              verticalActivePixels: 1440,
            },
          ],
        },
        extensions: [
          {
            extensionType: 'cta-861',
            supportsUnderscan: true,
            supportsBasicAudio: true,
            supportsYCbCr444: true,
            supportsYCbCr422: true,
            isChecksumValid: true,
          },
          {
            extensionType: 'cta-861',
            supportsUnderscan: true,
            supportsBasicAudio: true,
            supportsYCbCr444: true,
            supportsYCbCr422: true,
            isChecksumValid: true,
          },
          {
            // TODO: Add comprehensive parser support for DisplayID 1.3, 2.0,
            // and 2.1.
            extensionType: 'displayid',
            isChecksumValid: true,
          },
        ],
      });
    });
  });

  describe('Apple Thunderbolt 27in', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(APPLE_TB27_BYTES);

      expect(parsed.bytes.byteLength).toBe(256);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        warnings: [],
        isHeaderValid: true,
        isChecksumValid: true,
        featureSupport: {
          colorGamuts: ['srgb'],
          maxInputSignalBitDepth: 8,
          supportsHDR10: false,
          supportsHDR10Plus: false,
          supportsDolbyVision: false,
          supportsGameMode: false,
          supportsALLM: false,
          minSrrHz: 60,
          maxSrrHz: 60,
          supportsVRR: false,
          minVrrHz: undefined,
          maxVrrHz: undefined,
          edidVersion: 1.4,
          hdmiVersion: undefined, // Not applicable; DisplayPort only
        },
        vendorInfo: {
          vid: 'APP',
          goodName: 'Apple',
          shortBrandName: 'Apple',
        },
        productInfo: {
          productCode: 37415,
          serialNumberInt: 437063866,
          modelName: 'Thunderbolt',
          manufactureWeek: 13,
          manufactureYear: 2016,
          serialNumberStr: 'C02RG3PYF2GC',
        },
        basicDisplayParams: {
          physicalWidthInMm: 600,
          physicalHeightInMm: 340,
          diagonalInches: 27.2,
        },
        nativeResolution: {
          activeHorizontalPixels: 2560,
          activeVerticalLines: 1440,
          physicalWidthInMm: 597,
          physicalHeightInMm: 336,
          diagonalInches: 27,
          isInterlaced: false,
          refreshRateHz: 60,
        },
        baseBlock: {
          vendorId: 'APP',
          edidVersion: 1,
          edidRevision: 4,
          edidVersionString: '1.4',
          dtds: [
            {
              horizontalDisplaySizeInMm: 597,
              verticalDisplaySizeInMm: 336,
              diagonalDisplaySizeInMm: 685.1,
              horizontalActivePixels: 2560,
              verticalActivePixels: 1440,
            },
            {
              horizontalDisplaySizeInMm: 597,
              verticalDisplaySizeInMm: 336,
              diagonalDisplaySizeInMm: 685.1,
              horizontalActivePixels: 1280,
              verticalActivePixels: 720,
            },
          ],
        },
        expectedExtensionCount: 1,
        extensions: [
          {
            supportsUnderscan: true,
            supportsBasicAudio: true,
            supportsYCbCr444: false,
            extensionType: 'cta-861',
          },
        ],
      });
    });
  });

  describe('Dell ST2320L', () => {
    it('should parse EDID data', () => {
      const parsed = parseEdid(DELL_ST2320L_BYTES);

      expect(parsed.bytes.byteLength).toBe(256);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        warnings: [],
        isHeaderValid: true,
        isChecksumValid: true,
        featureSupport: {
          colorGamuts: ['srgb'],
          maxInputSignalBitDepth: 8,
          supportsHDR10: false,
          supportsHDR10Plus: false,
          supportsDolbyVision: false,
          supportsGameMode: false,
          supportsALLM: false,
          minSrrHz: 60,
          maxSrrHz: 75,
          supportsVRR: false,
          minVrrHz: undefined,
          maxVrrHz: undefined,
          edidVersion: 1.3,
          hdmiVersion: 1.4,
        },
        vendorInfo: {
          vid: 'DEL',
          goodName: 'Dell',
          shortBrandName: 'Dell',
        },
        productInfo: {
          productCode: 61476,
          serialNumberInt: 1127761737,
          serialNumberStr: 'GRV8V27DC8GI',
          modelName: 'DELL ST2320L',
          manufactureWeek: 28,
          manufactureYear: 2012,
        },
        basicDisplayParams: {
          physicalWidthInMm: 510,
          physicalHeightInMm: 290,
          diagonalInches: 23.1,
        },
        nativeResolution: {
          activeHorizontalPixels: 1920,
          activeVerticalLines: 1080,
          physicalWidthInMm: 509,
          physicalHeightInMm: 286,
          diagonalInches: 23,
          isInterlaced: false,
          refreshRateHz: 60,
        },
        baseBlock: {
          isHeaderValid: true,
          headerValidity: 'OK',
          vendorId: 'DEL',
          edidVersion: 1,
          edidRevision: 3,
          edidVersionString: '1.3',
          numberOfExtensions: 1,
          checksum: 52,
          isChecksumValid: true,
          dtds: [
            {
              horizontalDisplaySizeInMm: 509,
              verticalDisplaySizeInMm: 286,
              diagonalDisplaySizeInMm: 583.8,
              horizontalActivePixels: 1920,
              verticalActivePixels: 1080,
            },
          ],
        },
        expectedExtensionCount: 1,
        extensions: [
          {
            supportsUnderscan: true,
            supportsBasicAudio: true,
            supportsYCbCr444: true,
            supportsYCbCr422: true,
            extensionType: 'cta-861',
            isChecksumValid: true,
          },
        ],
      });
    });
  });

  describe('Asus PA32UCDM - Dolby Vision', () => {
    it('Detects Dolby Vision support', () => {
      const parsed = parseEdid(ASUS_PA32UCDM_BYTES);

      expect(parsed).toMatchObject<
        PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
      >({
        featureSupport: {
          colorGamuts: ['srgb', 'display_p3', 'rec_2020'],
          maxInputSignalBitDepth: 12,
          supportsHDR10: true,
          supportsHDR10Plus: false,
          supportsDolbyVision: true,
          supportsGameMode: false,
          supportsALLM: false,
          minSrrHz: 48,
          maxSrrHz: 120,
          supportsVRR: true,
          minVrrHz: 48,
          maxVrrHz: 120,
          edidVersion: 1.3,
          hdmiVersion: 2.1,
        },
      });
    });
  });

  describe('DisplayID', () => {
    describe('LG 31MU97', () => {
      it('Parses DisplayID 1.1', () => {
        const parsed = parseEdid(LG_31MU97_BYTES);

        expect(parsed).toMatchObject<
          PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
        >({
          productInfo: {
            modelName: '31MU97',
            manufactureWeek: 10,
            manufactureYear: 2017,
          },
          featureSupport: {
            displayIdVersion: 1.1,
            edidVersion: 1.4,
            hdmiVersion: undefined, // Not present
            // TODO(acdvorak): Detect "Display Product Type: DIRECT DRIVE monitor"
          },
        });
      });
    });

    describe('BOE NJ NE160QDM-NYC', () => {
      it('Parses DisplayID 1.2', () => {
        const parsed = parseEdid(BOE_NJ_NE160QDM_NYC_BYTES);

        expect(parsed).toMatchObject<
          PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
        >({
          productInfo: {
            modelName: undefined,
            manufactureWeek: 20,
            manufactureYear: 2022,
            unspecifiedStrings: ['BOE NJ', 'NE160QDM-NYC'],
          },
          featureSupport: {
            displayIdVersion: 1.2,
            edidVersion: 1.4,
            hdmiVersion: 2.0,
          },
        });
      });
    });

    describe('BOE CQ NE173QHM-NZ1', () => {
      it('Parses DisplayID 1.3', () => {
        const parsed = parseEdid(BOE_CQ_NE173QHM_NZ1_BYTES);

        expect(parsed).toMatchObject<
          PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
        >({
          productInfo: {
            modelName: undefined,
            manufactureWeek: 4,
            manufactureYear: 2021,
            unspecifiedStrings: ['BOE CQ', 'NE173QHM-NZ1'],
          },
          featureSupport: {
            displayIdVersion: 1.3,
            edidVersion: 1.4,
            hdmiVersion: 1.4,
          },
        });
      });
    });

    describe('Samsung Odyssey G75F', () => {
      it('Parses DisplayID 2.0', () => {
        const parsed = parseEdid(SAMSUNG_ODYSSEY_G75F_BYTES);

        expect(parsed).toMatchObject<
          PartialDeep<ParsedEdid, { recurseIntoArrays: true }>
        >({
          productInfo: {
            modelName: 'Odyssey G75F',
            manufactureWeek: 31,
            manufactureYear: 2025,
          },
          featureSupport: {
            displayIdVersion: 2.0,
            edidVersion: 1.4,
            hdmiVersion: undefined, // Not present
          },
        });
      });
    });
  });
});
