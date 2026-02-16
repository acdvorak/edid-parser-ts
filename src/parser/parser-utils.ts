/**
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/app/js/edid.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type {
  AnyDataBlock,
  AudioDataBlock,
  DataBlockTypeMap,
  ExtendedDataBlockTypeMap,
  ExtendedTagDataBlock,
  IeeeOuiTypeMap,
  SpeakerDataBlock,
  VendorDataBlock,
  VideoDataBlock,
  XyPixelRatio,
} from './parser-types';

export const EDID_BLOCK_LENGTH = 128;

export const DATA_BLOCK_TYPE: DataBlockTypeMap = {
  RESERVED: {
    string: 'RESERVED',
    value: 0,
  },
  AUDIO: {
    string: 'AUDIO',
    value: 1,
  },
  VIDEO: {
    string: 'VIDEO',
    value: 2,
  },
  VENDOR_SPECIFIC: {
    string: 'VENDOR SPECIFIC',
    value: 3,
  },
  SPEAKER_ALLOCATION: {
    string: 'SPEAKER ALLOCATION',
    value: 4,
  },
  EXTENDED_TAG: {
    string: 'EXTENDED TAG',
    value: 7,
  },
};

export const EXTENDED_DATA_BLOCK_TYPE: ExtendedDataBlockTypeMap = {
  VIDEO_CAPABILITY: { string: 'VIDEO CAPABILITY', value: 0 },
  VENDOR_SPECIFIC_VIDEO: { string: 'VENDOR SPECIFIC VIDEO', value: 1 },
  VESA_VIDEO_DISPLAY_DEVICE: { string: 'VESA VIDEO DISPLAY DEVICE', value: 2 },
  VESA_VIDEO_TIMING_BLOCK: { string: 'VESA VIDEO TIMING BLOCK', value: 3 },
  RESERVED_HDMI_VIDEO: { string: 'RESERVED HDMI VIDEO', value: 4 },
  COLORIMETRY: { string: 'COLORIMETRY', value: 5 },
  HDR_STATIC_METADATA: { string: 'HDR STATIC METADATA', value: 6 },
  HDR_DYNAMIC_METADATA: { string: 'HDR DYNAMIC METADATA', value: 7 },
  NATIVE_VIDEO_RESOLUTION: { string: 'NATIVE VIDEO RESOLUTION', value: 8 },
  VIDEO_FORMAT_PREFERENCE: { string: 'VIDEO FORMAT PREFERENCE', value: 13 },
  YCBCR420_VIDEO: { string: 'YCBCR420 VIDEO DATA', value: 14 },
  YCBCR420_CAPABILITY_MAP: { string: 'YCBCR420_CAPABILITY_MAP', value: 15 },
  MISC_AUDIO_FIELDS: { string: 'MISC AUDIO FIELDS', value: 16 },
  VENDOR_SPECIFIC_AUDIO: { string: 'VENDOR SPECIFIC AUDIO', value: 17 },
  HDMI_AUDIO: { string: 'HDMI AUDIO', value: 18 },
  ROOM_CONFIGURATION: { string: 'ROOM CONFIGURATION', value: 19 },
  SPEAKER_LOCATION: { string: 'SPEAKER LOCATION', value: 20 },
  INFOFRAME_DATA: { string: 'INFOFRAME DATA', value: 32 },
  PRODUCT_INFORMATION: { string: 'PRODUCT INFORMATION', value: 33 },
  HDMI_FORUM_SCDB: { string: 'HDMI FORUM SCDB', value: 0x79 },
};

export const XY_PIXEL_RATIO_ENUM = [
  { string: '16:10' },
  { string: '4:3' },
  { string: '5:4' },
  { string: '16:9' },
] as const satisfies readonly XyPixelRatio[];

export const SYNC_TYPE_ENUM = {
  ANALOG_COMPOSITE: 0x00,
  BIPOLAR_ANALOG_COMPOSITE: 0x01,
  DIGITAL_COMPOSITE: 0x02,
  DIGITAL_SEPARATE: 0x03,
} as const satisfies Record<Uppercase<string>, number>;

export const IEEE_OUI_TYPE: IeeeOuiTypeMap = {
  HDMI14: { string: 'HDMI14', value: 0x000c03 },
  HDMI20: { string: 'HDMI20', value: 0xc45dd8 },
  HDMI_FORUM: { string: 'HDMI FORUM', value: 0xc45dd8 },
  HDR10_PLUS: { string: 'HDR10 PLUS', value: 0x90848b },
  DOLBY_VISION: { string: 'DOLBY VISION', value: 0x00d046 },
};

export function isAudioBlock(
  block: AnyDataBlock | null | undefined,
): block is AudioDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.AUDIO.value;
}

export function isVideoBlock(
  block: AnyDataBlock | null | undefined,
): block is VideoDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VIDEO.value;
}

export function isVendorBlock(
  block: AnyDataBlock | null | undefined,
): block is VendorDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VENDOR_SPECIFIC.value;
}

export function isSpeakerBlock(
  block: AnyDataBlock | null | undefined,
): block is SpeakerDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.SPEAKER_ALLOCATION.value;
}

export function isExtendedTagBlock(
  block: AnyDataBlock | null | undefined,
): block is ExtendedTagDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.EXTENDED_TAG.value;
}

export function computeDiagonalMm(
  widthInMm: number,
  heightInMm: number,
): number;
export function computeDiagonalMm(
  widthInMm: number | null | undefined,
  heightInMm: number | null | undefined,
): number | undefined;
export function computeDiagonalMm(
  widthInMm: number | null | undefined,
  heightInMm: number | null | undefined,
): number | undefined {
  if (
    widthInMm == null ||
    heightInMm == null ||
    !Number.isFinite(widthInMm) ||
    !Number.isFinite(heightInMm)
  ) {
    return undefined;
  }

  const diagonalInMm = Math.hypot(widthInMm, heightInMm);

  return Math.round(diagonalInMm * 10) / 10;
}

export function computeDiagonalInches(
  widthInMm: number,
  heightInMm: number,
): number;
export function computeDiagonalInches(
  widthInMm: number | null | undefined,
  heightInMm: number | null | undefined,
): number | undefined;
export function computeDiagonalInches(
  widthInMm: number | null | undefined,
  heightInMm: number | null | undefined,
): number | undefined {
  if (
    widthInMm == null ||
    heightInMm == null ||
    !Number.isFinite(widthInMm) ||
    !Number.isFinite(heightInMm)
  ) {
    return undefined;
  }

  const MM_PER_INCH = 25.4;
  const diagonalInMm = Math.hypot(widthInMm, heightInMm);
  const diagonalInInches = diagonalInMm / MM_PER_INCH;

  return Math.round(diagonalInInches * 10) / 10;
}
