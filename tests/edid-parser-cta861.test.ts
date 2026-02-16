/**
 * @fileoverview Tests for parsing CTA-861 extension blocks, including Video,
 * Audio, Speaker Allocation, and Extended Tag data blocks.
 *
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/test/unit/edidCTA861Spec.js
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
  isAudioBlock,
  isExtendedTagBlock,
  isSpeakerBlock,
  isVideoBlock,
} from '../src/parser/parser-utils';

import {
  calculateChecksum,
  createFullEdidArray,
  FAKE_1080P60,
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

function getDataBlocks(parsed: ParsedEdid, index = 0): AnyDataBlock[] {
  return (parsed.extensions[index]?.dataBlockCollection ?? []).filter(
    (block): block is AnyDataBlock => Boolean(block),
  );
}

function getExtendedTagValue(block: ExtendedTagDataBlock): number | undefined {
  if (typeof block.extendedTag === 'number') {
    return block.extendedTag;
  }
  return block.extendedTag?.value;
}

describe('CTA-861 Extension Parsing', () => {
  describe('Extension Block Header', () => {
    it('should parse CTA extension header fields', () => {
      const ctaEdid = createFullEdidArray(FAKE_1080P60);
      ctaEdid[126] = 1;

      const dataBlocks = [
        0x23, 0x09, 0x07, 0x07, 0x83, 0x01, 0x00, 0x00, 0x65, 0x03, 0x0c, 0x00,
        0x10, 0x00, 0x88, 0x3c, 0x2f, 0x80, 0x90, 0x01,
      ];
      const ctaExtension = buildCtaExtension(dataBlocks);

      ctaEdid[127] = calculateChecksum(ctaEdid);
      const parsed = parseEdid(
        new Uint8ClampedArray(ctaEdid.concat(ctaExtension)),
      );

      const extension = parsed.extensions[0];
      expect(extension?.extTagByte).toBe(0x02);
      expect(extension?.revisionNumber).toBe(0x03);
      expect(extension?.dtdStart).toBe(4 + dataBlocks.length);
      expect(extension?.supportsUnderscan).toBe(true);
      expect(extension?.supportsBasicAudio).toBe(true);
      expect(extension?.supportsYCbCr444).toBe(true);
      expect(extension?.supportsYCbCr422).toBe(true);
    });
  });

  describe('Video Data Block Parsing', () => {
    it('should parse video data block and VIC codes', () => {
      const videoEdid = [
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x1e, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54, 0x21, 0x08,
        0x00, 0xd1, 0xc0, 0xa9, 0xc0, 0x81, 0xc0, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x02, 0x3a, 0x80, 0x18, 0x71, 0x38, 0x2d, 0x40,
        0x58, 0x2c, 0x45, 0x00, 0x58, 0x54, 0x21, 0x00, 0x00, 0x1e, 0x00, 0x00,
        0x00, 0xfd, 0x00, 0x32, 0x4c, 0x1e, 0x53, 0x10, 0x00, 0x0a, 0x20, 0x20,
        0x20, 0x20, 0x20, 0x20, 0x00, 0x00, 0x00, 0xfc, 0x00, 0x54, 0x65, 0x73,
        0x74, 0x20, 0x4d, 0x6f, 0x6e, 0x69, 0x74, 0x6f, 0x72, 0x0a, 0x00, 0x00,
        0x00, 0xff, 0x00, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
        0x30, 0x0a, 0x20, 0x20, 0x01, 0x00,
      ];
      videoEdid[126] = 1;
      videoEdid[127] = calculateChecksum(videoEdid);

      const ctaExtension = buildCtaExtension([
        0x4a, 0x90, 0x04, 0x03, 0x02, 0x01, 0x06, 0x07, 0x11, 0x12, 0x13, 0x84,
        0x85, 0x86, 0x23, 0x09, 0x07, 0x07, 0x83, 0x01, 0x00, 0x00, 0x65, 0x03,
        0x0c, 0x00, 0x10, 0x00,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(videoEdid.concat(ctaExtension)),
      );

      const videoBlock = getDataBlocks(parsed).find(isVideoBlock);
      expect(videoBlock).toBeDefined();
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(0);

      const vics = videoBlock?.shortVideoDescriptors.map((svd) => svd.vic);
      expect(vics).toContain(16);
      expect(vics).toContain(4);
      expect(
        videoBlock?.shortVideoDescriptors.some(
          (svd) => svd.isNativeResolution === true,
        ),
      ).toBe(true);
    });
  });

  describe('Audio Data Block Parsing', () => {
    it('should parse audio data block and LPCM descriptor', () => {
      const audioEdid = [
        0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0x00, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x1e, 0x01, 0x04, 0x95, 0x3c, 0x22, 0x78,
        0x0e, 0x91, 0xa3, 0x54, 0x4c, 0x99, 0x26, 0x0f, 0x50, 0x54, 0x21, 0x08,
        0x00, 0xd1, 0xc0, 0xa9, 0xc0, 0x81, 0xc0, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x02, 0x3a, 0x80, 0x18, 0x71, 0x38, 0x2d, 0x40,
        0x58, 0x2c, 0x45, 0x00, 0x58, 0x54, 0x21, 0x00, 0x00, 0x1e,
      ].concat(new Array<number>(54).fill(0));
      audioEdid[126] = 1;
      audioEdid[127] = calculateChecksum(audioEdid);

      const ctaExtension = buildCtaExtension(
        buildDataBlock(1, [0x09, 0x07, 0x07]),
      );

      const parsed = parseEdid(
        new Uint8ClampedArray(audioEdid.concat(ctaExtension)),
      );

      const audioBlock = getDataBlocks(parsed).find(isAudioBlock);
      expect(audioBlock).toBeDefined();
      expect(audioBlock?.shortAudioDescriptors.length).toBeGreaterThan(0);

      const lpcmDescriptor = audioBlock?.shortAudioDescriptors[0];
      expect(lpcmDescriptor?.standardCodecId).toBe(1);
      expect(lpcmDescriptor?.maxChannelCount).toBe(2);
      expect(lpcmDescriptor?.sampleRatesBitmask).toBeGreaterThan(0);
    });
  });

  describe('Speaker Allocation Data Block', () => {
    it('should parse speaker allocation data block', () => {
      const speakerEdid = new Array<number>(128).fill(0);
      speakerEdid[0] = 0x00;
      speakerEdid[1] = 0xff;
      speakerEdid[2] = 0xff;
      speakerEdid[3] = 0xff;
      speakerEdid[4] = 0xff;
      speakerEdid[5] = 0xff;
      speakerEdid[6] = 0xff;
      speakerEdid[7] = 0x00;
      speakerEdid[126] = 1;
      speakerEdid[127] = calculateChecksum(speakerEdid);

      const ctaExtension = buildCtaExtension([
        0x47, 0x10, 0x04, 0x03, 0x02, 0x01, 0x83, 0x01, 0x00, 0x00, 0x86, 0x03,
        0x0d, 0x07, 0x15,
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(speakerEdid.concat(ctaExtension)),
      );

      const speakerBlock = getDataBlocks(parsed).find(isSpeakerBlock);
      expect(speakerBlock).toBeDefined();
      expect(speakerBlock?.layoutBitmask).toBeDefined();
    });
  });

  describe('Extended Tag Data Blocks', () => {
    it('should parse extended tag data blocks', () => {
      const extendedEdid = new Array<number>(128).fill(0);
      extendedEdid[0] = 0x00;
      extendedEdid[1] = 0xff;
      extendedEdid[2] = 0xff;
      extendedEdid[3] = 0xff;
      extendedEdid[4] = 0xff;
      extendedEdid[5] = 0xff;
      extendedEdid[6] = 0xff;
      extendedEdid[7] = 0x00;
      extendedEdid[126] = 1;
      extendedEdid[127] = calculateChecksum(extendedEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(7, [0x00, 0x0f]),
        ...buildDataBlock(7, [0x05, 0xc0, 0x01]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(extendedEdid.concat(ctaExtension)),
      );

      const extendedBlocks = getDataBlocks(parsed).filter(
        (block) => block.tag.value === 7,
      );
      expect(extendedBlocks.length).toBeGreaterThan(0);

      const videoCapBlock = extendedBlocks.find((block) => {
        return (
          getExtendedTagValue(block as ExtendedTagDataBlock) === 0 &&
          block.tag.value === 7
        );
      });
      expect(videoCapBlock).toBeDefined();

      const colorimetryBlock = extendedBlocks.find((block) => {
        return (
          getExtendedTagValue(block as ExtendedTagDataBlock) === 5 &&
          block.tag.value === 7
        );
      });
      expect(colorimetryBlock).toBeDefined();
    });
  });

  describe('YCbCr 4:2:0 Support', () => {
    it('should parse YCbCr 4:2:0 video data block', () => {
      const ycbcrEdid = new Array<number>(128).fill(0);
      ycbcrEdid[0] = 0x00;
      ycbcrEdid[1] = 0xff;
      ycbcrEdid[2] = 0xff;
      ycbcrEdid[3] = 0xff;
      ycbcrEdid[4] = 0xff;
      ycbcrEdid[5] = 0xff;
      ycbcrEdid[6] = 0xff;
      ycbcrEdid[7] = 0x00;
      ycbcrEdid[126] = 1;
      ycbcrEdid[127] = calculateChecksum(ycbcrEdid);

      const ctaExtension = buildCtaExtension([
        ...buildDataBlock(2, [0x5f, 0x60, 0x61]),
        ...buildDataBlock(7, [0x0e, 0x5f, 0x60, 0x61]),
        ...buildDataBlock(7, [0x0f, 0x80, 0x01]),
      ]);

      const parsed = parseEdid(
        new Uint8ClampedArray(ycbcrEdid.concat(ctaExtension)),
      );

      const ycbcr420Block = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 14);

      expect(ycbcr420Block).toBeDefined();
      expect(ycbcr420Block?.YCbCr420OnlyShortVideoDescriptors).toBeDefined();

      const capabilityMapBlock = getDataBlocks(parsed)
        .filter(isExtendedTagBlock)
        .find((block) => getExtendedTagValue(block) === 15);

      expect(capabilityMapBlock).toBeDefined();
      expect(
        capabilityMapBlock?.YCbCr420CapableShortVideoDescriptors,
      ).toBeDefined();
    });
  });

  describe('CTA Extension Checksum', () => {
    it('should validate extension block checksum', () => {
      const simpleEdid = fixChecksums(FAKE_1080P60);
      simpleEdid.block0[126] = 1;

      const ctaExtension = buildCtaExtension([], {
        flags: 0x00,
        dtdStart: 0x04,
      });
      const fullEdid = createFullEdidArray(simpleEdid).concat(ctaExtension);

      const parsed = parseEdid(new Uint8ClampedArray(fullEdid));
      expect(parsed.extensions[0]?.isChecksumValid).toBe(true);
    });
  });

  describe('Real World CTA Example', () => {
    it('should parse Samsung Q800T CTA extension successfully', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      expect(parsed.baseBlock.numberOfExtensions).toBe(1);
      expect(parsed.extensions[0]?.extTagByte).toBe(0x02);
      expect(getDataBlocks(parsed).length).toBeGreaterThan(0);
    });

    it('should detect modern video capabilities', () => {
      const samsungData = fixChecksums(SAMSUNG_Q800T_8K60_HDMI21_GAMING);
      const parsed = parseEdid(
        new Uint8ClampedArray(createFullEdidArray(samsungData)),
      );

      const videoBlock = getDataBlocks(parsed).find(isVideoBlock);
      expect(videoBlock).toBeDefined();
      expect(videoBlock?.shortVideoDescriptors.length).toBeGreaterThan(10);
    });
  });
});
