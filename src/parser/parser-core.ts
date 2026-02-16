/**
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/app/js/edid.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type { MergedVendorId } from '../../gen/vids/merged-vid-types';
import { isTruthy } from '../util/truthy';
import { getVendorInfo } from '../vids/vendor-funcs';

import type {
  AnyDataBlock,
  AudioDataBlock,
  BaseExtensionBlock,
  BasicDisplayParams,
  ChromaticityCoordinates,
  ColorGamut,
  DisplayIdVersion,
  Dtd,
  EdidVersion,
  EotfLabel,
  ExtendedTagDataBlock,
  FeatureSupport,
  HdmiVersion,
  InputSignalBitDepth,
  NativeResolution,
  ParsedBaseEdidBlock,
  ParsedEdid,
  ParsedEdidWarning,
  ParsedEdidWarningCode,
  ParsedExtensionBlock,
  ProductInfo,
  ShortAudioDescriptor,
  ShortVideoDescriptor,
  SpeakerDataBlock,
  SpwgData,
  StandardDisplayMode,
  StaticMetaDescLabel,
  UnknownExtendedDataBlockTypeValue,
  VendorDataBlock,
  VideoDataBlock,
  VideoFormatPreference,
  XyPixelRatio,
} from './parser-types';
import {
  computeDiagonalInches,
  computeDiagonalMm,
  DATA_BLOCK_TYPE,
  EDID_BLOCK_LENGTH,
  EXTENDED_DATA_BLOCK_TYPE,
  IEEE_OUI_TYPE,
  isExtendedTagBlock,
  isVendorBlock,
} from './parser-utils';

////////////////////////////////////////////////////////////////////////////////

// #region - Unused

/* eslint-disable @typescript-eslint/no-unused-vars */

const DIGITAL_COLOR_SPACE = [
  'RGB 4:4:4',
  'RGB 4:4:4 + YCrCb 4:4:4',
  'RGB 4:4:4 + YCrCb 4:2:2',
  'RGB 4:4:4 + YCrCb 4:4:4 + YCrCb 4:2:2',
] as const;

const XY_PIXEL_RATIO_ENUM = [
  { string: '16:10' },
  { string: '4:3' },
  { string: '5:4' },
  { string: '16:9' },
] as const satisfies readonly XyPixelRatio[];

const SHORT_AUDIO_DESCRIPTORS = [
  'RESERVED',
  'LPCM',
  'AC-3',
  'MPEG-1',
  'MP3',
  'MPEG2',
  'AAC LC',
  'DTS',
  'ATRAC',
  'DSD',
  'E-AC-3',
  'DTS-HD',
  'MLP',
  'DST',
  'WMA Pro',
] as const;

const SAD_SAMPLE_RATES = [
  '32 kHz',
  '44.1 kHz',
  '48 kHz',
  '88.2 kHz',
  '96 kHz',
  '176.4 kHz',
  '192 kHz',
] as const;

const SAD_BIT_DEPTHS = ['16 bit', '20 bit', '24 bit'] as const;

const SPEAKER_ALLOCATION = [
  'Front Left/Front Right (FL/FR)',
  'Low Frequency Effort (LFE)',
  'Front Center (FC)',
  'Rear Left/Rear Right (RL/RR)',
  'Rear Center (RC)',
  'Front Left Center/Front Right Center (FLC/FRC)',
  'Rear Left Center/Rear Right Center (RLC/RRC)',
  'Front Left Wide/Front Right Wide (FLW/FRW)',
  'Front Left High/Frong Right High (FLH/FRH)',
  'Top Center (TC)',
  'Front Center High (FCH)',
] as const;

/* eslint-enable @typescript-eslint/no-unused-vars */

// #endregion - Unused

////////////////////////////////////////////////////////////////////////////////

// #region - Constants

const SYNC_TYPE_ENUM = {
  ANALOG_COMPOSITE: 0x00,
  BIPOLAR_ANALOG_COMPOSITE: 0x01,
  DIGITAL_COMPOSITE: 0x02,
  DIGITAL_SEPARATE: 0x03,
} as const;

const OVERSCAN_BEHAVIOR = [
  'No data',
  'Always overscanned',
  'Always underscanned',
  'Supports both overscan and underscan',
] as const;

const AUDIO_FORMAT_ARRAY = [1, 8, 13, 14, 15] as const;

const EOTF_LABELS = [
  'Traditional gamma - SDR luminance range',
  'Traditional gamma - HDR luminance range',
  'SMPTE ST2084 (PQ)',
  'Hybrid Log-Gamma (HLG)',
] as const satisfies EotfLabel[];

const STATIC_METADATA_DESCRIPTORS = [
  'Static Metadata Type 1',
] as const satisfies StaticMetaDescLabel[];

const CANONICAL_GAMUTS: ReadonlyArray<{
  gamut: ColorGamut;
  redX: number;
  redY: number;
  greenX: number;
  greenY: number;
  blueX: number;
  blueY: number;
}> = [
  {
    gamut: 'srgb',
    redX: 0.64,
    redY: 0.33,
    greenX: 0.3,
    greenY: 0.6,
    blueX: 0.15,
    blueY: 0.06,
  },
  {
    gamut: 'display_p3',
    redX: 0.68,
    redY: 0.32,
    greenX: 0.265,
    greenY: 0.69,
    blueX: 0.15,
    blueY: 0.06,
  },
  {
    gamut: 'adobe_rgb',
    redX: 0.64,
    redY: 0.33,
    greenX: 0.21,
    greenY: 0.71,
    blueX: 0.15,
    blueY: 0.06,
  },
  {
    gamut: 'rec_2020',
    redX: 0.708,
    redY: 0.292,
    greenX: 0.17,
    greenY: 0.797,
    blueX: 0.131,
    blueY: 0.046,
  },
] as const;

// #endregion - Constants

////////////////////////////////////////////////////////////////////////////////

// #region - Utils

function addWarning(
  warnings: ParsedEdidWarning[],
  warning: ParsedEdidWarning,
): void {
  warnings.push(warning);
}

function warn(
  warnings: ParsedEdidWarning[],
  code: ParsedEdidWarningCode,
  message: string,
  blockIndex?: number,
  offset?: number,
  detail?: unknown,
): void {
  addWarning(warnings, { code, message, blockIndex, offset, detail });
}

function readU8(
  ctx: ReadContext,
  absoluteOffset: number,
  blockIndex?: number,
  relativeOffset?: number,
): number | undefined {
  if (absoluteOffset < 0 || absoluteOffset >= ctx.bytes.length) {
    warn(
      ctx.warnings,
      'out_of_range_read',
      'Attempted to read beyond available EDID bytes.',
      blockIndex,
      relativeOffset ?? absoluteOffset,
      {
        absoluteOffset,
        length: ctx.bytes.length,
      },
    );
    return undefined;
  }
  return ctx.bytes[absoluteOffset];
}

function createBlockReader(
  ctx: ReadContext,
  blockIndex: number,
  blockOffset: number,
): BlockReader {
  return {
    blockIndex,
    blockOffset,
    u8: (offset: number): number | undefined =>
      readU8(ctx, blockOffset + offset, blockIndex, offset),
    u8OrZero: (offset: number): number =>
      readU8(ctx, blockOffset + offset, blockIndex, offset) ?? 0,
  };
}

function intToAscii(intCode: number): string {
  const abc = '0ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return abc[intCode] ?? '';
}

function validateHeader(reader: BlockReader): boolean {
  const header = [
    reader.u8(0),
    reader.u8(1),
    reader.u8(2),
    reader.u8(3),
    reader.u8(4),
    reader.u8(5),
    reader.u8(6),
    reader.u8(7),
  ];
  if (header.some((value) => value === undefined)) {
    return false;
  }
  return (
    header[0] === 0x00 &&
    header[1] === 0xff &&
    header[2] === 0xff &&
    header[3] === 0xff &&
    header[4] === 0xff &&
    header[5] === 0xff &&
    header[6] === 0xff &&
    header[7] === 0x00
  );
}

// #endregion - Utils

////////////////////////////////////////////////////////////////////////////////

// #region - Checksums

function getChecksum(reader: BlockReader): number {
  const CHECKSUM = 127;
  return reader.u8OrZero(CHECKSUM);
}

function calcChecksum(
  bytes: Uint8ClampedArray,
  block: number,
): number | undefined {
  const startAddress = block * EDID_BLOCK_LENGTH;
  const endAddress = startAddress + EDID_BLOCK_LENGTH - 1;
  if (bytes.length < endAddress + 1) {
    return undefined;
  }
  let checksum = 0;
  for (let index = startAddress; index < endAddress; index++) {
    checksum += bytes[index] ?? 0;
  }
  return 256 - (checksum % 256);
}

function validChecksum(
  ctx: ReadContext,
  block: number,
  blockIndexForWarning: number,
): boolean | undefined {
  const checksumOffset = (block + 1) * EDID_BLOCK_LENGTH - 1;
  const checksum = readU8(ctx, checksumOffset, blockIndexForWarning, 127);
  if (checksum === undefined) {
    return undefined;
  }
  const calculatedChecksum = calcChecksum(ctx.bytes, block);
  if (calculatedChecksum === undefined) {
    return undefined;
  }
  return checksum === calculatedChecksum;
}

// #endregion - Checksums

////////////////////////////////////////////////////////////////////////////////

// #region - Parsing

interface ReadContext {
  bytes: Uint8ClampedArray;
  warnings: ParsedEdidWarning[];
}

interface BlockReader {
  blockIndex: number;
  blockOffset: number;
  u8: (offset: number) => number | undefined;
  u8OrZero: (offset: number) => number;
}

interface ExtensionParseContext {
  lastVideoBlock?: VideoDataBlock;
}

interface ParsedMonitorDescriptors {
  monitorSerialNumber: string | null;
  modelName: string | null;
  unspecifiedStrings: string[];
  spwg: SpwgData | null;
}

function getEdidVersion(reader: BlockReader): number {
  const EDID_VERSION = 18;
  return reader.u8OrZero(EDID_VERSION);
}

function getEdidRevision(reader: BlockReader): number {
  const EDID_REVISION = 19;
  return reader.u8OrZero(EDID_REVISION);
}

/**
 * Parses the 3-letter vendor/manufacturer ID.
 *
 * EISA ID = Extended Industry Standard Architecture Identifier.
 *
 * @example
 * "LGS" // LG
 * "SAM" // Samsung
 * "SNY" // Sony
 */
function getVendorId(reader: BlockReader): MergedVendorId {
  const FIVE_BIT_LETTER_MASK = 0x1f;
  const EISA_ID_BYTE1 = 8;
  const EISA_ID_BYTE2 = 9;
  const EISA_LETTER1_OFF = 2;
  const EISA_LETTER2_OFF = 5;
  const LETTER2_TOP_BYTES = 3;
  const LETTER2_TOP_MASK = 0x03;
  const LETTER2_BOT_MASK = 0x07;

  const byte1 = reader.u8OrZero(EISA_ID_BYTE1);
  const byte2 = reader.u8OrZero(EISA_ID_BYTE2);

  const firstLetter = (byte1 >> EISA_LETTER1_OFF) & FIVE_BIT_LETTER_MASK;
  const secondLetterTop = byte1 & LETTER2_TOP_MASK;
  const secondLetterBottom = (byte2 >> EISA_LETTER2_OFF) & LETTER2_BOT_MASK;
  const secondLetter =
    (secondLetterTop << LETTER2_TOP_BYTES) | secondLetterBottom;
  const thirdLetter = byte2 & FIVE_BIT_LETTER_MASK;

  const vid: string =
    intToAscii(firstLetter) +
    intToAscii(secondLetter) +
    intToAscii(thirdLetter);

  return vid as MergedVendorId;
}

function getProductCode(reader: BlockReader): number {
  const PRODUCT_CODE1 = 10;
  const PRODUCT_CODE2 = 11;

  return (reader.u8OrZero(PRODUCT_CODE2) << 8) | reader.u8OrZero(PRODUCT_CODE1);
}

function getSerialNumberInt(reader: BlockReader): number {
  const SERIAL_NUMBER1 = 12;
  const SERIAL_NUMBER2 = 13;
  const SERIAL_NUMBER3 = 14;
  const SERIAL_NUMBER4 = 15;

  return (
    (reader.u8OrZero(SERIAL_NUMBER4) << 24) |
    (reader.u8OrZero(SERIAL_NUMBER3) << 16) |
    (reader.u8OrZero(SERIAL_NUMBER2) << 8) |
    reader.u8OrZero(SERIAL_NUMBER1)
  );
}

function getManufactureWeek(reader: BlockReader): number {
  const MANUFACTURE_WEEK = 16;
  return reader.u8OrZero(MANUFACTURE_WEEK);
}

function getManufactureYear(reader: BlockReader): number {
  const MANUFACTURE_YEAR = 17;
  return reader.u8OrZero(MANUFACTURE_YEAR) + 1990;
}

function getBasicDisplayParams(reader: BlockReader): BasicDisplayParams {
  const bdp: BasicDisplayParams = {};

  const VIDEO_IN_PARAMS_BITMAP = 20;
  const DIGITAL_INPUT = 0x80;
  const videoInParams = reader.u8OrZero(VIDEO_IN_PARAMS_BITMAP);
  if (videoInParams & DIGITAL_INPUT) {
    const VESA_DFP_COMPATIBLE = 0x01;
    bdp.isDigital = true;
    if (videoInParams & VESA_DFP_COMPATIBLE) {
      bdp.isVesaDfpCompatible = true;
    } else {
      bdp.isVesaDfpCompatible = false;
    }
  } else {
    bdp.isDigital = false;

    const WHITE_SYNC_LVLS_OFF = 5;
    const WHITE_SYNC_LVLS_MASK = 0x03;
    bdp.whiteSyncLevels =
      (videoInParams >> WHITE_SYNC_LVLS_OFF) & WHITE_SYNC_LVLS_MASK;

    const BLANK_TO_BLACK_OFF = 4;
    const BLANK_TO_BLACK_MASK = 0x01;
    bdp.isBlankToBlack =
      (videoInParams >> BLANK_TO_BLACK_OFF) & BLANK_TO_BLACK_MASK
        ? true
        : false;

    const SEPARATE_SYNC_OFF = 3;
    const SEPARATE_SYNC_MASK = 0x01;
    bdp.isSeparateSyncSupported =
      (videoInParams >> SEPARATE_SYNC_OFF) & SEPARATE_SYNC_MASK ? true : false;

    const COMPOSITE_SYNC_OFF = 2;
    const COMPOSITE_SYNC_MASK = 0x01;
    bdp.isCompositeSyncSupported =
      (videoInParams >> COMPOSITE_SYNC_OFF) & COMPOSITE_SYNC_MASK
        ? true
        : false;

    const SYNC_ON_GREEN_OFF = 1;
    const SYNC_ON_GREEN_MASK = 0x01;
    bdp.isSyncOnGreen =
      (videoInParams >> SYNC_ON_GREEN_OFF) & SYNC_ON_GREEN_MASK ? true : false;

    const VSYNC_SERRATED_MASK = 0x01;
    bdp.isVsyncSerrated = videoInParams & VSYNC_SERRATED_MASK ? true : false;
  }

  const MAX_HOR_IMG_SIZE = 21;
  bdp.physicalWidthInMm = reader.u8OrZero(MAX_HOR_IMG_SIZE) * 10;

  const MAX_VERT_IMG_SIZE = 22;
  bdp.physicalHeightInMm = reader.u8OrZero(MAX_VERT_IMG_SIZE) * 10;

  bdp.diagonalInches = computeDiagonalInches(
    bdp.physicalWidthInMm,
    bdp.physicalHeightInMm,
  );

  const DISPLAY_GAMMA = 23;
  bdp.displayGamma = reader.u8OrZero(DISPLAY_GAMMA) * (2.54 / 255) + 1;

  const SUPPORTED_FEATURES_BITMAP = 24;
  const supportedFeatures = reader.u8OrZero(SUPPORTED_FEATURES_BITMAP);
  const DPMS_STANDBY = 0x80;
  bdp.supportsDpmsStandby = supportedFeatures & DPMS_STANDBY ? true : false;
  const DPMS_SUSPEND = 0x40;
  bdp.supportsDpmsSuspend = supportedFeatures & DPMS_SUSPEND ? true : false;
  const DPMS_ACTIVE_OFF = 0x20;
  bdp.supportsDpmsActiveOff =
    supportedFeatures & DPMS_ACTIVE_OFF ? true : false;
  const DISPLAY_TYPE_OFF = 3;
  const DISPLAY_TYPE_MASK = 0x03;
  bdp.displayTypeCode =
    (supportedFeatures >> DISPLAY_TYPE_OFF) & DISPLAY_TYPE_MASK;

  const STANDARD_SRGB = 0x04;
  bdp.isStandardSRgb = supportedFeatures & STANDARD_SRGB ? true : false;
  const PREFERRED_TIMING = 0x02;
  bdp.isPreferredTiming = supportedFeatures & PREFERRED_TIMING ? true : false;
  const GTF_SUPPORTED = 0x01;
  bdp.isGtfSupported = supportedFeatures & GTF_SUPPORTED ? true : false;

  return bdp;
}

function getChromaticityCoordinates(
  reader: BlockReader,
): ChromaticityCoordinates {
  const chromaticity: ChromaticityCoordinates = {};
  const TWO_BIT_MASK = 0x03;
  const TWO_BIT_OFF = 2;
  const FOUR_BIT_OFF = 4;
  const SIX_BIT_OFF = 6;

  const RED_GREEN_LSB = 25;
  const RED_X_MSB = 27;
  const redGreenLsb = reader.u8OrZero(RED_GREEN_LSB);
  chromaticity.redX =
    (reader.u8OrZero(RED_X_MSB) << TWO_BIT_OFF) |
    ((redGreenLsb >> SIX_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.redXCoords = chromaticity.redX / 1024;

  const RED_Y_MSB = 28;
  chromaticity.redY =
    (reader.u8OrZero(RED_Y_MSB) << TWO_BIT_OFF) |
    ((redGreenLsb >> FOUR_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.redYCoords = chromaticity.redY / 1024;

  const GREEN_X_MSB = 29;
  chromaticity.greenX =
    (reader.u8OrZero(GREEN_X_MSB) << TWO_BIT_OFF) |
    ((redGreenLsb >> TWO_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.greenXCoords = chromaticity.greenX / 1024;

  const GREEN_Y_MSB = 30;
  chromaticity.greenY =
    (reader.u8OrZero(GREEN_Y_MSB) << TWO_BIT_OFF) |
    (redGreenLsb & TWO_BIT_MASK);
  chromaticity.greenYCoords = chromaticity.greenY / 1024;

  const BLUE_WHITE_LSB = 26;
  const BLUE_X_MSB = 31;
  const blueWhiteLsb = reader.u8OrZero(BLUE_WHITE_LSB);
  chromaticity.blueX =
    (reader.u8OrZero(BLUE_X_MSB) << TWO_BIT_OFF) |
    ((blueWhiteLsb >> SIX_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.blueXCoords = chromaticity.blueX / 1024;

  const BLUE_Y_MSB = 32;
  chromaticity.blueY =
    (reader.u8OrZero(BLUE_Y_MSB) << TWO_BIT_OFF) |
    ((blueWhiteLsb >> FOUR_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.blueYCoords = chromaticity.blueY / 1024;

  const WHITE_X_MSB = 33;
  chromaticity.whiteX =
    (reader.u8OrZero(WHITE_X_MSB) << TWO_BIT_OFF) |
    ((blueWhiteLsb >> TWO_BIT_OFF) & TWO_BIT_MASK);
  chromaticity.whiteXCoords = chromaticity.whiteX / 1024;

  const WHITE_Y_MSB = 34;
  chromaticity.whiteY =
    (reader.u8OrZero(WHITE_Y_MSB) << TWO_BIT_OFF) |
    (blueWhiteLsb & TWO_BIT_MASK);
  chromaticity.whiteYCoords = chromaticity.whiteY / 1024;

  return chromaticity;
}

function getTimingBitmap(reader: BlockReader): number {
  const TIMING_BITMAP1 = 35;
  const TIMING_BITMAP2 = 36;
  const TIMING_BITMAP3 = 37;

  return (
    (reader.u8OrZero(TIMING_BITMAP1) << 16) |
    (reader.u8OrZero(TIMING_BITMAP2) << 8) |
    reader.u8OrZero(TIMING_BITMAP3)
  );
}

function getStandardDisplayModes(reader: BlockReader): StandardDisplayMode[] {
  const STD_DISPLAY_MODES_START = 38;
  const STD_DISPLAY_MODES_END = 53;

  const stdDispModesArray: StandardDisplayMode[] = [];
  let arrayCounter = 0;
  let index = STD_DISPLAY_MODES_START;
  while (index < STD_DISPLAY_MODES_END) {
    const byte1 = reader.u8(index);
    const byte2 = reader.u8(index + 1);
    if (byte1 === undefined || byte2 === undefined) {
      break;
    }
    if (byte1 !== 0x01 && byte2 !== 0x01) {
      const standardDisplayModes: StandardDisplayMode = {};
      standardDisplayModes.xResolutionPx = (byte1 + 31) * 8;

      const XY_PIXEL_RATIO_OFF = 6;
      const XY_PIXEL_RATIO_MASK = 0x03;
      standardDisplayModes.xyPixelRatio =
        (byte2 >> XY_PIXEL_RATIO_OFF) & XY_PIXEL_RATIO_MASK;

      const VERTICAL_FREQUENCY_MASK = 0x3f;
      standardDisplayModes.vertFreqHz = (byte2 & VERTICAL_FREQUENCY_MASK) + 60;

      stdDispModesArray[arrayCounter] = standardDisplayModes;
      arrayCounter++;
    }
    index += 2;
  }
  return stdDispModesArray;
}

function parseMonitorDescriptorText(
  reader: BlockReader,
  descriptorOffset: number,
): Uint8Array {
  const TEXT_OFFSET = 5;
  const TEXT_LENGTH = 13;
  const LINE_FEED = 0x0a;
  const NUL = 0x00;
  const SPACE = 0x20;
  const chars: number[] = [];

  for (let index = 0; index < TEXT_LENGTH; index++) {
    const byte = reader.u8OrZero(descriptorOffset + TEXT_OFFSET + index);
    if (byte === LINE_FEED || byte === NUL) {
      break;
    }
    chars.push(byte);
  }

  while (chars.length > 0 && chars[chars.length - 1] === SPACE) {
    chars.pop();
  }

  return new Uint8Array(chars);
}

function sanitizeMonitorDescriptorText(bytes: Uint8Array): string[] {
  const ASCII_PRINTABLE_LOW = 0x20;
  const ASCII_PRINTABLE_HIGH = 0x7e;
  const SPACE = 0x20;
  const LOWERCASE_X = 0x78;
  const MULTIPLICATION_SIGN = 0xd7;

  const parts: string[] = [];
  const chars: number[] = [];

  const pushPart = (): void => {
    while (chars.length > 0 && chars[chars.length - 1] === SPACE) {
      chars.pop();
    }
    if (chars.length === 0) {
      return;
    }

    let text = '';
    for (const charCode of chars) {
      text += String.fromCharCode(charCode);
    }
    parts.push(text);
    chars.length = 0;
  };

  for (const byte of bytes) {
    if (byte === MULTIPLICATION_SIGN) {
      chars.push(LOWERCASE_X);
      continue;
    }

    if (byte < ASCII_PRINTABLE_LOW || byte > ASCII_PRINTABLE_HIGH) {
      pushPart();
      continue;
    }

    if (
      byte === SPACE &&
      (chars.length === 0 || chars[chars.length - 1] === SPACE)
    ) {
      continue;
    }

    chars.push(byte);
  }

  pushPart();

  return parts
    .map((part) => {
      return (
        part
          // Remove Less Than sign and everything before it.
          //
          // "0<56HGA-EA3" -> "56HGA-EA3"
          //
          // From "submodules/linuxhw-edid/Digital/Lenovo/LEN9051/089ADA54309F"
          .replace(/^.*</, '')
          // Remove caret and everything after it.
          //
          // "AUO^" -> "AUO"
          //
          // From "submodules/linuxhw-edid/Digital/AU Optronics/AUO4100/2EDA34E7BB6A"
          .replace(/\^.*$/, '')
          // Remove trailing asterisk.
          //
          // "KDC*" -> "KDC"
          // "M101NWT2 R3 *" -> "M101NWT2 R3 "
          //
          // From "submodules/linuxhw-edid/Digital/Others/KDC0000/09A0832808EF"
          // From "submodules/linuxhw-edid/Digital/InfoVision/IVO03F4/EC8C7DE91CE7"
          .replace(/\*+$/, '')
          // Replace asterisk with 'x' in screen resolution string.
          //
          // "1920*1080" -> "1920x1080"
          //
          // From "submodules/linuxhw-edid/Digital/Others/CS_5211/4B3F529491E8"
          .replace(/\b(\d+)\*(\d+)\b/g, '$1x$2')
          // Trim
          .trim()
      );
    })
    .filter((part: string): boolean => {
      const isAtLeast3Chars = part.length >= 3;
      const startsWithAlphaNum = /^[a-zA-Z0-9]/.test(part);

      // All of these must be true.
      const meetsAllPositiveCriteria = [
        isAtLeast3Chars,
        startsWithAlphaNum,
      ].every(Boolean);

      // I have not seen any valid strings that contain pipes, backslashes, or
      // backticks.
      const containsWeirdChars = /[|\\`]/.test(part);

      // All of these must be false.
      const meetsAllNegativeCriteria = ![containsWeirdChars].some(Boolean);

      return meetsAllPositiveCriteria && meetsAllNegativeCriteria;
    })
    .filter(isTruthy);
}

function parseMonitorDescriptorPayload(
  reader: BlockReader,
  descriptorOffset: number,
): Uint8Array {
  const TEXT_OFFSET = 5;
  const TEXT_LENGTH = 13;
  const payload = new Uint8Array(TEXT_LENGTH);

  for (let index = 0; index < TEXT_LENGTH; index++) {
    payload[index] = reader.u8OrZero(descriptorOffset + TEXT_OFFSET + index);
  }

  return payload;
}

function decodeSpwgPartNumber(
  bytes: Uint8Array,
  startInclusive: number,
  endExclusive: number,
): string {
  const LINE_FEED = 0x0a;
  const NUL = 0x00;
  const SPACE = 0x20;

  let end = endExclusive;
  while (end > startInclusive) {
    const byte = bytes[end - 1] ?? NUL;
    if (byte === SPACE || byte === NUL || byte === LINE_FEED) {
      end -= 1;
      continue;
    }
    break;
  }

  let text = '';
  for (let index = startInclusive; index < end; index++) {
    const byte = bytes[index] ?? NUL;
    if (byte === LINE_FEED || byte === NUL) {
      break;
    }
    if (byte >= 0x20 && byte <= 0x7e) {
      text += String.fromCharCode(byte);
    }
  }

  return text;
}

function isSpwgDescriptor4Payload(payload: Uint8Array): boolean {
  const LINE_FEED = 0x0a;
  const LVDS_CHANNELS_OFFSET = 8;
  const PANEL_SELF_TEST_OFFSET = 9;
  const TERMINATOR_OFFSET = 10;

  const lvdsChannels = payload[LVDS_CHANNELS_OFFSET] ?? 0;
  if (lvdsChannels !== 1 && lvdsChannels !== 2) {
    return false;
  }

  const panelSelfTestFlags = payload[PANEL_SELF_TEST_OFFSET] ?? 0;
  if ((panelSelfTestFlags & 0xfe) !== 0) {
    return false;
  }

  if ((payload[TERMINATOR_OFFSET] ?? 0) !== LINE_FEED) {
    return false;
  }

  let hasNonPrintableSmbusByte = false;
  for (let index = 0; index < 8; index++) {
    const byte = payload[index] ?? 0;
    if (byte < 0x20 || byte > 0x7e) {
      hasNonPrintableSmbusByte = true;
      break;
    }
  }

  return hasNonPrintableSmbusByte;
}

function tryParseSpwgDescriptorPair(
  reader: BlockReader,
  descriptorOffset: number,
  endOffset: number,
): SpwgData | undefined {
  const UNSPECIFIED_TEXT = 0xfe;
  const nextDescriptorOffset = descriptorOffset + DTD_LENGTH;
  if (nextDescriptorOffset >= endOffset) {
    return undefined;
  }

  const nextByte0 = reader.u8(nextDescriptorOffset);
  const nextByte1 = reader.u8(nextDescriptorOffset + 1);
  const nextByte2 = reader.u8(nextDescriptorOffset + 2);
  const nextDescriptorTag = reader.u8(nextDescriptorOffset + 3);
  const nextByte4 = reader.u8(nextDescriptorOffset + 4);
  if (
    nextByte0 !== 0x00 ||
    nextByte1 !== 0x00 ||
    nextByte2 !== 0x00 ||
    nextDescriptorTag !== UNSPECIFIED_TEXT ||
    nextByte4 !== 0x00
  ) {
    return undefined;
  }

  const descriptor3Payload = parseMonitorDescriptorPayload(
    reader,
    descriptorOffset,
  );
  const descriptor4Payload = parseMonitorDescriptorPayload(
    reader,
    nextDescriptorOffset,
  );
  if (!isSpwgDescriptor4Payload(descriptor4Payload)) {
    return undefined;
  }

  const pcMakerPartNumber = decodeSpwgPartNumber(descriptor3Payload, 0, 5);
  const manufacturerPartNumber = decodeSpwgPartNumber(
    descriptor3Payload,
    6,
    13,
  );
  if (pcMakerPartNumber.length === 0 || manufacturerPartNumber.length === 0) {
    return undefined;
  }

  const moduleRevision = reader.u8(descriptorOffset - 1);
  if (moduleRevision === undefined) {
    return undefined;
  }

  const smbusValues: number[] = [];
  for (let index = 0; index < 8; index++) {
    smbusValues.push(descriptor4Payload[index] ?? 0);
  }

  return {
    moduleRevision,
    descriptor3: {
      pcMakerPartNumber,
      lcdSupplierEedidRevision: descriptor3Payload[5] ?? 0,
      manufacturerPartNumber,
    },
    descriptor4: {
      smbusValues,
      lvdsChannels: descriptor4Payload[8] ?? 0,
      isPanelSelfTestPresent: ((descriptor4Payload[9] ?? 0) & 0x01) === 0x01,
    },
  };
}

function getMonitorDescriptors(
  reader: BlockReader,
  startOffset: number,
  endOffset: number,
): ParsedMonitorDescriptors {
  const monitorDescriptors: ParsedMonitorDescriptors = {
    monitorSerialNumber: null,
    modelName: null,
    unspecifiedStrings: [],
    spwg: null,
  };

  const SERIAL_NUMBER = 0xff;
  const UNSPECIFIED_TEXT = 0xfe;
  const MONITOR_NAME = 0xfc;

  for (let descriptorOffset = startOffset; descriptorOffset < endOffset; ) {
    const byte0 = reader.u8(descriptorOffset);
    const byte1 = reader.u8(descriptorOffset + 1);
    const byte2 = reader.u8(descriptorOffset + 2);
    const descriptorTag = reader.u8(descriptorOffset + 3);
    const byte4 = reader.u8(descriptorOffset + 4);
    if (
      byte0 === undefined ||
      byte1 === undefined ||
      byte2 === undefined ||
      descriptorTag === undefined ||
      byte4 === undefined
    ) {
      break;
    }

    const isMonitorDescriptor =
      byte0 === 0x00 && byte1 === 0x00 && byte2 === 0x00 && byte4 === 0x00;
    if (
      isMonitorDescriptor &&
      (descriptorTag === SERIAL_NUMBER ||
        descriptorTag === UNSPECIFIED_TEXT ||
        descriptorTag === MONITOR_NAME)
    ) {
      if (
        descriptorTag === UNSPECIFIED_TEXT &&
        monitorDescriptors.spwg === null
      ) {
        const spwg = tryParseSpwgDescriptorPair(
          reader,
          descriptorOffset,
          endOffset,
        );
        if (spwg) {
          monitorDescriptors.spwg = spwg;
          descriptorOffset += DTD_LENGTH * 2;
          continue;
        }
      }

      const bytes = parseMonitorDescriptorText(reader, descriptorOffset);
      const textParts = sanitizeMonitorDescriptorText(bytes);
      if (textParts.length > 0) {
        if (descriptorTag === SERIAL_NUMBER) {
          monitorDescriptors.monitorSerialNumber = textParts.join(' ');
        } else if (descriptorTag === UNSPECIFIED_TEXT) {
          monitorDescriptors.unspecifiedStrings.push(...textParts);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (descriptorTag === MONITOR_NAME) {
          monitorDescriptors.modelName = textParts.join(' ');
        }
      }
    }

    descriptorOffset += DTD_LENGTH;
  }

  return monitorDescriptors;
}

function parseDtd(reader: BlockReader, dtdOffset: number): Dtd | undefined {
  const pixelClockLo = reader.u8(dtdOffset);
  const pixelClockHi = reader.u8(dtdOffset + 1);
  if (pixelClockLo === undefined || pixelClockHi === undefined) {
    return undefined;
  }

  const dtd: Dtd = {};
  dtd.pixelClockMhz = ((pixelClockHi << 8) | pixelClockLo) / 100;

  const HOR_ACTIVE_OFF = 4;
  const HOR_ACTIVE_PIX_MASK = 0x0f;
  dtd.horizontalActivePixels =
    (((reader.u8OrZero(dtdOffset + 4) >> HOR_ACTIVE_OFF) &
      HOR_ACTIVE_PIX_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 2);

  const HOR_BLANK_MASK = 0x0f;
  dtd.horizontalBlankLineCount =
    ((reader.u8OrZero(dtdOffset + 4) & HOR_BLANK_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 3);

  const VERT_ACTIVE_OFF = 4;
  const VERT_ACTIVE_MASK = 0x0f;
  dtd.verticalActivePixels =
    (((reader.u8OrZero(dtdOffset + 7) >> VERT_ACTIVE_OFF) & VERT_ACTIVE_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 5);

  const VERT_BLANK_MASK = 0x0f;
  dtd.verticalBlankLineCount =
    ((reader.u8OrZero(dtdOffset + 7) & VERT_BLANK_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 6);

  const HOR_SYNC_OFF_OFF = 6;
  const HOR_SYNC_OFF_MASK = 0x03;
  dtd.horizontalSyncOffsetPixels =
    (((reader.u8OrZero(dtdOffset + 11) >> HOR_SYNC_OFF_OFF) &
      HOR_SYNC_OFF_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 8);

  const HOR_SYNC_PULSE_OFF = 4;
  const HOR_SYNC_PULSE_MASK = 0x03;
  dtd.horizontalSyncPulsePixels =
    (((reader.u8OrZero(dtdOffset + 11) >> HOR_SYNC_PULSE_OFF) &
      HOR_SYNC_PULSE_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 9);

  const VERT_SYNC_OFF_TOP_OFF = 2;
  const VERT_SYNC_OFF_TOP_MASK = 0x03;
  const VERT_SYNC_OFF_BOT_OFF = 4;
  const VERT_SYNC_OFF_BOT_MASK = 0x0f;
  dtd.verticalSyncOffset =
    (((reader.u8OrZero(dtdOffset + 11) >> VERT_SYNC_OFF_TOP_OFF) &
      VERT_SYNC_OFF_TOP_MASK) <<
      4) |
    ((reader.u8OrZero(dtdOffset + 10) >> VERT_SYNC_OFF_BOT_OFF) &
      VERT_SYNC_OFF_BOT_MASK);

  const VERT_SYNC_PULSE_TOP_MASK = 0x03;
  const VERT_SYNC_PULSE_BOT_MASK = 0x0f;
  dtd.verticalSyncPulseLineCount =
    ((reader.u8OrZero(dtdOffset + 11) & VERT_SYNC_PULSE_TOP_MASK) << 4) |
    (reader.u8OrZero(dtdOffset + 10) & VERT_SYNC_PULSE_BOT_MASK);

  const HOR_DISPLAY_TOP_OFF = 4;
  const HOR_DISPLAY_TOP_MASK = 0x0f;
  dtd.horizontalDisplaySizeInMm =
    (((reader.u8OrZero(dtdOffset + 14) >> HOR_DISPLAY_TOP_OFF) &
      HOR_DISPLAY_TOP_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 12);

  const VERT_DISPLAY_TOP_MASK = 0x0f;
  dtd.verticalDisplaySizeInMm =
    ((reader.u8OrZero(dtdOffset + 14) & VERT_DISPLAY_TOP_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 13);

  dtd.diagonalDisplaySizeInMm = computeDiagonalMm(
    dtd.horizontalDisplaySizeInMm,
    dtd.verticalDisplaySizeInMm,
  );

  dtd.horizontalBorderPixels = reader.u8OrZero(dtdOffset + 15);
  dtd.verticalBorderLines = reader.u8OrZero(dtdOffset + 16);

  const INTERLACED_MASK = 0x80;
  dtd.isInterlaced =
    reader.u8OrZero(dtdOffset + 17) & INTERLACED_MASK ? true : false;

  const STEREO_MODE_OFFSET = 5;
  const STEREO_MODE_MASK = 0x03;
  dtd.stereoModeCode =
    (reader.u8OrZero(dtdOffset + 17) >> STEREO_MODE_OFFSET) & STEREO_MODE_MASK;

  const SYNC_TYPE_OFFSET = 3;
  const SYNC_TYPE_MASK = 0x03;
  dtd.syncTypeCode =
    (reader.u8OrZero(dtdOffset + 17) >> SYNC_TYPE_OFFSET) & SYNC_TYPE_MASK;

  if (dtd.syncTypeCode === SYNC_TYPE_ENUM.DIGITAL_SEPARATE) {
    const VSYNC_POLARITY_MASK = 0x04;
    dtd.vSyncPolarity =
      reader.u8OrZero(dtdOffset + 17) & VSYNC_POLARITY_MASK ? true : false;
  } else {
    const VSYNC_SERRATED_MASK = 0x04;
    dtd.vSyncSerrated =
      reader.u8OrZero(dtdOffset + 17) & VSYNC_SERRATED_MASK ? true : false;
  }

  if (
    dtd.syncTypeCode === SYNC_TYPE_ENUM.ANALOG_COMPOSITE ||
    dtd.syncTypeCode === SYNC_TYPE_ENUM.BIPOLAR_ANALOG_COMPOSITE
  ) {
    const SYNC_ALL_RGB_MASK = 0x02;
    dtd.syncAllRGBLines =
      reader.u8OrZero(dtdOffset + 17) & SYNC_ALL_RGB_MASK ? true : false;
  } else {
    const HSYNC_POLARY_MASK = 0x02;
    dtd.hSyncPolarity =
      reader.u8OrZero(dtdOffset + 17) & HSYNC_POLARY_MASK ? true : false;
  }

  const TWO_WAY_STEREO_MASK = 0x01;
  dtd.twoWayStereo =
    reader.u8OrZero(dtdOffset + 17) & TWO_WAY_STEREO_MASK ? true : false;

  return dtd;
}

const DTD_LENGTH = 18;

function getDtds(
  reader: BlockReader,
  startOffset: number,
  endOffset: number,
): Dtd[] {
  const dtdArray: Dtd[] = [];
  let dtdIndex = startOffset;

  while (dtdIndex < endOffset) {
    const lo = reader.u8(dtdIndex);
    const hi = reader.u8(dtdIndex + 1);
    if (lo === undefined || hi === undefined) {
      break;
    }
    if (lo === 0 && hi === 0) {
      break;
    }
    const dtd = parseDtd(reader, dtdIndex);
    if (dtd) {
      dtdArray.push(dtd);
    }
    dtdIndex += DTD_LENGTH;
  }
  return dtdArray;
}

function getNumberExtensions(reader: BlockReader): number {
  const NUMBER_OF_EXTENSIONS = 126;
  return reader.u8OrZero(NUMBER_OF_EXTENSIONS);
}

function parseAudioDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
): AudioDataBlock {
  const audioBlock: AudioDataBlock = {
    tag: DATA_BLOCK_TYPE.AUDIO,
    dataLength: blockLength,
    shortAudioDescriptors: [],
  };

  const SHORT_AUDIO_DESC_LENGTH = 3;
  const numberShortAudioDescriptors = blockLength / SHORT_AUDIO_DESC_LENGTH;
  let shortAudDescIndex = 0;
  let index = startAddress;

  const SHORT_AUDIO_DESC_MASK = 0x0f;
  const SHORT_AUDIO_DESC_OFF = 3;
  const MAX_CHANNELS_MASK = 0x07;
  const SAMPLE_RATE_MASK = 0x7f;

  while (shortAudDescIndex < numberShortAudioDescriptors) {
    const shortAudDesc: ShortAudioDescriptor = {};
    const byte0 = reader.u8OrZero(index);
    const byte1 = reader.u8OrZero(index + 1);
    const byte2 = reader.u8OrZero(index + 2);

    shortAudDesc.standardCodecId =
      (byte0 >> SHORT_AUDIO_DESC_OFF) & SHORT_AUDIO_DESC_MASK;
    shortAudDesc.maxChannelCount = (byte0 & MAX_CHANNELS_MASK) + 1;
    shortAudDesc.sampleRatesBitmask = byte1 & SAMPLE_RATE_MASK;

    const audioFormat0 = AUDIO_FORMAT_ARRAY[0];
    const audioFormat1 = AUDIO_FORMAT_ARRAY[1];
    const audioFormat2 = AUDIO_FORMAT_ARRAY[2];
    const audioFormat3 = AUDIO_FORMAT_ARRAY[3];
    const audioFormat4 = AUDIO_FORMAT_ARRAY[4];
    const format = shortAudDesc.standardCodecId ?? 0;

    if (format <= audioFormat0) {
      const BIT_DEPTH_MASK = 0x07;
      shortAudDesc.bitDepthBitmask = byte2 & BIT_DEPTH_MASK;
    } else if (format <= audioFormat1) {
      const MAX_BIT_RATE_MASK = 0xff;
      shortAudDesc.bitRateKbps = (byte2 & MAX_BIT_RATE_MASK) * 8;
    } else if (format <= audioFormat2) {
      const AUDIO_FORMAT_CODE_MASK = 0xff;
      shortAudDesc.audioFormatCode = byte2 & AUDIO_FORMAT_CODE_MASK;
    } else if (format <= audioFormat3) {
      const PROFILE_MASK = 0x07;
      shortAudDesc.codecProfileOrLevel = byte2 & PROFILE_MASK;
    } else if (format <= audioFormat4) {
      const FORMAT_CODE_EXT_OFF = 3;
      const FORMAT_CODE_EXT_MASK = 0x1f;
      shortAudDesc.extendedCodecId =
        (byte2 >> FORMAT_CODE_EXT_OFF) & FORMAT_CODE_EXT_MASK;
    }

    audioBlock.shortAudioDescriptors[shortAudDescIndex] = shortAudDesc;
    index += SHORT_AUDIO_DESC_LENGTH;
    shortAudDescIndex++;
  }

  return audioBlock;
}

function parseVideoDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  context: ExtensionParseContext,
): VideoDataBlock {
  const videoBlock: VideoDataBlock = {
    tag: DATA_BLOCK_TYPE.VIDEO,
    dataLength: blockLength,
    shortVideoDescriptors: [],
  };

  let index = 0;

  const NATIVE_RESOLUTION_MASK = 0x80;
  const CEA861F_VIC_MASK = 0x40;
  const LOW_VIC_MASK = 0x3f;
  const HIGH_VIC_MASK = 0xff;

  while (index < blockLength) {
    const dataByte = reader.u8(startAddress + index);
    if (dataByte === undefined) {
      break;
    }
    const shortVideoDescriptor: ShortVideoDescriptor = { vic: 0 };
    if ((dataByte & CEA861F_VIC_MASK) > 0) {
      shortVideoDescriptor.vic = dataByte & HIGH_VIC_MASK;
      shortVideoDescriptor.isNativeResolution = false;
    } else {
      shortVideoDescriptor.vic = dataByte & LOW_VIC_MASK;
      shortVideoDescriptor.isNativeResolution =
        dataByte & NATIVE_RESOLUTION_MASK ? true : false;
    }
    videoBlock.shortVideoDescriptors[index] = shortVideoDescriptor;
    index++;
  }

  context.lastVideoBlock = videoBlock;
  return videoBlock;
}

function parseVendorDataBlockHDMI14(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  vendorBlock: VendorDataBlock,
): VendorDataBlock {
  const vsdbAddress = startAddress - 1;

  const PHYSICAL_ADDRESS_1 = 4;
  const PHYSICAL_ADDRESS_2 = 5;
  vendorBlock.physicalAddress =
    (reader.u8OrZero(vsdbAddress + PHYSICAL_ADDRESS_1) << 8) |
    reader.u8OrZero(vsdbAddress + PHYSICAL_ADDRESS_2);

  const AI_DC_DUAL_ADDRESS = 6;
  if (blockLength >= AI_DC_DUAL_ADDRESS) {
    const SUPPORT_AI_MASK = 0x80;
    vendorBlock.supportsAI =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & SUPPORT_AI_MASK
        ? true
        : false;

    const DEEP_COLOR_48_MASK = 0x40;
    vendorBlock.supportsDeepColor48 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_48_MASK
        ? true
        : false;
    const DEEP_COLOR_36_MASK = 0x20;
    vendorBlock.supportsDeepColor36 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_36_MASK
        ? true
        : false;
    const DEEP_COLOR_30_MASK = 0x10;
    vendorBlock.supportsDeepColor30 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_30_MASK
        ? true
        : false;
    const DEEP_COLOR_Y444_MASK = 0x08;
    vendorBlock.supportsDeepColorY444 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_Y444_MASK
        ? true
        : false;
    const DUAL_DVI_MASK = 0x01;
    vendorBlock.supportsDualLinkDvi =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DUAL_DVI_MASK
        ? true
        : false;
  }

  const MAX_TMDS_CLOCK_ADDRESS = 7;
  if (blockLength >= MAX_TMDS_CLOCK_ADDRESS) {
    vendorBlock.hdmi14MaxTmdsRateMhz =
      reader.u8OrZero(vsdbAddress + MAX_TMDS_CLOCK_ADDRESS) * 5;
  }

  const LATENCY_PRESENT_ADDRESS = 8;
  if (blockLength >= LATENCY_PRESENT_ADDRESS) {
    const latencyFlags = reader.u8OrZero(vsdbAddress + LATENCY_PRESENT_ADDRESS);
    const LATENCY_FIELDS_PRESENT_MASK = 0x80;
    vendorBlock.areProgressiveLatencyFieldsPresent =
      latencyFlags & LATENCY_FIELDS_PRESENT_MASK ? true : false;

    const I_LATENCY_FIELDS_PRESENT_MASK = 0x40;
    vendorBlock.areInterlacedLatencyFieldsPresent =
      vendorBlock.areProgressiveLatencyFieldsPresent &&
      latencyFlags & I_LATENCY_FIELDS_PRESENT_MASK
        ? true
        : false;

    const HDMI_VIDEO_PRESENT_MASK = 0x20;
    const CONTENT_TYPE_GAME_MASK = 0x08;
    if (
      latencyFlags & HDMI_VIDEO_PRESENT_MASK &&
      latencyFlags & CONTENT_TYPE_GAME_MASK
    ) {
      vendorBlock.supportsGameContentType = true;
    }
  }

  const AUDIO_LATENCY_ADDRESS = 10;
  if (
    vendorBlock.areProgressiveLatencyFieldsPresent &&
    blockLength >= AUDIO_LATENCY_ADDRESS
  ) {
    const VIDEO_LATENCY_ADDRESS = 9;
    vendorBlock.progressiveVideoLatencyMs =
      (reader.u8OrZero(vsdbAddress + VIDEO_LATENCY_ADDRESS) - 1) * 2;
    vendorBlock.progressiveAudioLatencyMs =
      (reader.u8OrZero(vsdbAddress + AUDIO_LATENCY_ADDRESS) - 1) * 2;
  }

  const I_VIDEO_LATENCY_ADDRESS = 11;
  const I_AUDIO_LATENCY_ADDRESS = 12;
  if (
    vendorBlock.areInterlacedLatencyFieldsPresent &&
    blockLength >= I_AUDIO_LATENCY_ADDRESS
  ) {
    vendorBlock.interlacedVideoLatencyMs =
      (reader.u8OrZero(vsdbAddress + I_VIDEO_LATENCY_ADDRESS) - 1) * 2;
    vendorBlock.interlacedAudioLatencyMs =
      (reader.u8OrZero(vsdbAddress + I_AUDIO_LATENCY_ADDRESS) - 1) * 2;
  }

  return vendorBlock;
}

function parseVendorDataBlockHDMI20(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  vendorBlock: VendorDataBlock,
): VendorDataBlock {
  const vsdbAddress = startAddress - 1;

  let FIELD_ADDRESS = 0;
  let FIELD_MASK = 0x0;

  FIELD_ADDRESS = 4;
  vendorBlock.hdmi20PayloadVersion = reader.u8OrZero(
    vsdbAddress + FIELD_ADDRESS,
  );

  FIELD_ADDRESS = 5;
  vendorBlock.hdmi20MaxTmdsRateMhz =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) * 5;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x80;
  vendorBlock.supportsSCDC =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x40;
  vendorBlock.supportsSCDCRR =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x08;
  vendorBlock.supportsLTE340scramble =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x04;
  vendorBlock.supports3DIV =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x02;
  vendorBlock.supports3DDV =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 6;
  FIELD_MASK = 0x01;
  vendorBlock.supports3DOSD =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 7;
  FIELD_MASK = 0x04;
  vendorBlock.supportsDeepColorY420_48 =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 7;
  FIELD_MASK = 0x02;
  vendorBlock.supportsDeepColorY420_36 =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 7;
  FIELD_MASK = 0x01;
  vendorBlock.supportsDeepColorY420_30 =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  return vendorBlock;
}

function parseVendorDataBlockHDMIForum(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  vendorBlock: VendorDataBlock,
): VendorDataBlock {
  vendorBlock.hdmiForumFeatures = {};

  if (blockLength < 8) {
    vendorBlock.error = 'HDMI Forum VSDB too short';
    return vendorBlock;
  }

  const data: number[] = [];
  for (let i = 0; i < blockLength; i++) {
    const value = reader.u8(startAddress + i);
    data[i] = value ?? Number.NaN;
  }

  const dataByte = (index: number): number => data[index] ?? 0;

  vendorBlock.hfPayloadVersion = dataByte(3);
  vendorBlock.maxTMDSCharacterRateMhz = dataByte(4) * 5;

  if (dataByte(5) & 0x80) {
    vendorBlock.hdmiForumFeatures.isScdcPresent = true;
  }
  if (dataByte(5) & 0x40) {
    vendorBlock.hdmiForumFeatures.isScdcReadRequestCapable = true;
  }
  vendorBlock.supportsSCDC =
    vendorBlock.hdmiForumFeatures.isScdcPresent === true;
  vendorBlock.supportsSCDCRR =
    vendorBlock.hdmiForumFeatures.isScdcReadRequestCapable === true;
  if (dataByte(5) & 0x20) {
    vendorBlock.hdmiForumFeatures.supportsCableStatus = true;
  }
  if (dataByte(5) & 0x10) {
    vendorBlock.hdmiForumFeatures.supportsColorContentBitsPerComponent = true;
  }
  if (dataByte(5) & 0x08) {
    vendorBlock.hdmiForumFeatures.supportsScrambling340Mcsc = true;
  }
  if (dataByte(5) & 0x04) {
    vendorBlock.hdmiForumFeatures.supports3DIndependentView = true;
  }
  if (dataByte(5) & 0x02) {
    vendorBlock.hdmiForumFeatures.supports3DDualView = true;
  }
  if (dataByte(5) & 0x01) {
    vendorBlock.hdmiForumFeatures.supports3DOSDDisparity = true;
  }

  const maxFrlRate = (dataByte(6) & 0xf0) >> 4;
  const frlRates = [
    'Not Supported',
    '3 lanes @ 3 Gbps',
    '3 lanes @ 6 Gbps',
    '4 lanes @ 6 Gbps',
    '4 lanes @ 8 Gbps',
    '4 lanes @ 10 Gbps',
    '4 lanes @ 12 Gbps',
  ];
  vendorBlock.maxFixedRateLink =
    maxFrlRate < frlRates.length ? frlRates[maxFrlRate] : 'Unknown';

  if (dataByte(7) & 0x80) {
    vendorBlock.hdmiForumFeatures.supportsFAPAEndExtended = true;
  }
  if (dataByte(7) & 0x40) {
    vendorBlock.hdmiForumFeatures.supportsQMS = true;
  }
  if (dataByte(7) & 0x20) {
    vendorBlock.hdmiForumFeatures.supportsMDelta = true;
  }
  if (dataByte(7) & 0x10) {
    vendorBlock.hdmiForumFeatures.supportsCinemaVRR = true;
  }
  if (dataByte(7) & 0x08) {
    vendorBlock.hdmiForumFeatures.supportsNegativeMVRR = true;
  }
  if (dataByte(7) & 0x04) {
    vendorBlock.hdmiForumFeatures.supportsFastVActive = true;
  }
  if (dataByte(7) & 0x02) {
    vendorBlock.hdmiForumFeatures.supportsALLM = true;
  }
  if (dataByte(7) & 0x01) {
    vendorBlock.hdmiForumFeatures.supportsFAPAInBlanking = true;
  }

  if (blockLength > 8) {
    const vrrMin = dataByte(8) & 0x3f;
    const vrrMax = ((dataByte(8) & 0xc0) << 2) | dataByte(9);

    if (vrrMin > 0) {
      vendorBlock.vrrMinHz = vrrMin;
    }
    if (vrrMax > 0) {
      vendorBlock.vrrMaxHz = vrrMax;
    }
  }

  if (blockLength > 10) {
    if (dataByte(10) & 0x80) {
      vendorBlock.hdmiForumFeatures.supportsVESADSC12a = true;
    }
    if (dataByte(10) & 0x40) {
      vendorBlock.hdmiForumFeatures.supportsCompressedVideo420 = true;
    }
    if (dataByte(10) & 0x20) {
      vendorBlock.hdmiForumFeatures.supportsQMSTFRmax = true;
    }
    if (dataByte(10) & 0x10) {
      vendorBlock.hdmiForumFeatures.supportsQMSTFRmin = true;
    }
    if (dataByte(10) & 0x08) {
      vendorBlock.hdmiForumFeatures.supportsCompressedVideoAnyBpp = true;
    }
    if (dataByte(10) & 0x04) {
      vendorBlock.hdmiForumFeatures.supports16bpcCompressedVideo = true;
    }
    if (dataByte(10) & 0x02) {
      vendorBlock.hdmiForumFeatures.supports12bpcCompressedVideo = true;
    }
    if (dataByte(10) & 0x01) {
      vendorBlock.hdmiForumFeatures.supports10bpcCompressedVideo = true;
    }
  }

  return vendorBlock;
}

function parseVendorDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
): VendorDataBlock {
  const vendorBlock: VendorDataBlock = {
    tag: DATA_BLOCK_TYPE.VENDOR_SPECIFIC,
    dataLength: blockLength,
  };

  const vsdbAddress = startAddress - 1;
  const IEEE_REG_IDENTIFIER_1 = 1;
  const IEEE_REG_IDENTIFIER_2 = 2;
  const IEEE_REG_IDENTIFIER_3 = 3;
  vendorBlock.ieeeOui =
    (reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_3) << 16) |
    (reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_2) << 8) |
    reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_1);

  if (vendorBlock.ieeeOui === IEEE_OUI_TYPE.DOLBY_VISION.value) {
    vendorBlock.supportsDolbyVision = true;
    return vendorBlock;
  }

  if (vendorBlock.ieeeOui === IEEE_OUI_TYPE.HDMI14.value) {
    return parseVendorDataBlockHDMI14(
      reader,
      startAddress,
      blockLength,
      vendorBlock,
    );
  }

  if (vendorBlock.ieeeOui === IEEE_OUI_TYPE.HDMI_FORUM.value) {
    if (blockLength >= 8) {
      return parseVendorDataBlockHDMIForum(
        reader,
        startAddress,
        blockLength,
        vendorBlock,
      );
    }
    return parseVendorDataBlockHDMI20(
      reader,
      startAddress,
      blockLength,
      vendorBlock,
    );
  }

  return vendorBlock;
}

function parseVendorSpecificVideoDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.VENDOR_SPECIFIC_VIDEO;

  if (blockLength < 4) {
    extendedTagBlock.error = 'Vendor-Specific Video Data Block too short';
    return extendedTagBlock;
  }

  const IEEE_REG_IDENTIFIER_1 = 1;
  const IEEE_REG_IDENTIFIER_2 = 2;
  const IEEE_REG_IDENTIFIER_3 = 3;

  const oui =
    (reader.u8OrZero(startAddress + IEEE_REG_IDENTIFIER_3) << 16) |
    (reader.u8OrZero(startAddress + IEEE_REG_IDENTIFIER_2) << 8) |
    reader.u8OrZero(startAddress + IEEE_REG_IDENTIFIER_1);
  extendedTagBlock.vendorSpecificVideoOui = oui;

  if (oui === IEEE_OUI_TYPE.HDR10_PLUS.value) {
    extendedTagBlock.supportsHDR10Plus = true;
  } else if (oui === IEEE_OUI_TYPE.DOLBY_VISION.value) {
    extendedTagBlock.supportsDolbyVision = true;
  }

  return extendedTagBlock;
}

function parseVideoCapabilityDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.VIDEO_CAPABILITY;

  let FIELD_ADDRESS = 0;
  let FIELD_MASK = 0x0;
  let FIELD_SHIFT = 0;
  let fieldData = 0;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x80;
  extendedTagBlock.supportsQuantizationRangeYCC =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x40;
  extendedTagBlock.supportsQuantizationRangeRGB =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x30;
  FIELD_SHIFT = 4;
  fieldData =
    (reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK) >> FIELD_SHIFT;
  extendedTagBlock.overscanPT = OVERSCAN_BEHAVIOR[fieldData];

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x0c;
  FIELD_SHIFT = 2;
  fieldData =
    (reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK) >> FIELD_SHIFT;
  extendedTagBlock.overscanIT = OVERSCAN_BEHAVIOR[fieldData];

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x03;
  FIELD_SHIFT = 0;
  fieldData =
    (reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK) >> FIELD_SHIFT;
  extendedTagBlock.overscanCE = OVERSCAN_BEHAVIOR[fieldData];

  if (blockLength > 2) {
    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x80;
    extendedTagBlock.supportsQMS =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x40;
    extendedTagBlock.supportsVRR =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x20;
    extendedTagBlock.supportsCinemaVRR =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x10;
    extendedTagBlock.supportsNegativeMRR =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x08;
    extendedTagBlock.supportsFVA =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 2;
    FIELD_MASK = 0x04;
    extendedTagBlock.supportsALLM =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;
  }

  return extendedTagBlock;
}

function parseColorimetryDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.COLORIMETRY;

  let FIELD_ADDRESS = 0;
  let FIELD_MASK = 0x0;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x80;
  extendedTagBlock.supportsBT2020RGB =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x40;
  extendedTagBlock.supportsBT2020YCC =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x20;
  extendedTagBlock.supportsBT2020cYCC =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x10;
  extendedTagBlock.supportsAdobeRGB =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x08;
  extendedTagBlock.supportsAdobeYCC601 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x04;
  extendedTagBlock.supportssYCC601 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x02;
  extendedTagBlock.supportsxvYCC709 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x01;
  extendedTagBlock.supportsxvYCC601 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 2;
  FIELD_MASK = 0x08;
  extendedTagBlock.gamutMD3 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? 1 : 0;

  FIELD_ADDRESS = 2;
  FIELD_MASK = 0x04;
  extendedTagBlock.gamutMD2 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? 1 : 0;

  FIELD_ADDRESS = 2;
  FIELD_MASK = 0x02;
  extendedTagBlock.gamutMD1 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? 1 : 0;

  FIELD_ADDRESS = 2;
  FIELD_MASK = 0x01;
  extendedTagBlock.gamutMD0 =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? 1 : 0;

  if (blockLength > 3) {
    FIELD_ADDRESS = 3;
    FIELD_MASK = 0x80;
    extendedTagBlock.supportsICtCp =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 3;
    FIELD_MASK = 0x40;
    extendedTagBlock.supportsST2094_40 =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 3;
    FIELD_MASK = 0x20;
    extendedTagBlock.supportsST2094_10 =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

    FIELD_ADDRESS = 3;
    FIELD_MASK = 0x10;
    extendedTagBlock.supportsBT2100ICtCp =
      reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;
  }

  return extendedTagBlock;
}

function parseYCbCr420VideoDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.YCBCR420_VIDEO;

  const NATIVE_RESOLUTION_MASK = 0x80;
  const CEA861F_VIC_MASK = 0x40;
  const LOW_VIC_MASK = 0x3f;
  const HIGH_VIC_MASK = 0xff;

  extendedTagBlock.YCbCr420OnlyShortVideoDescriptors = [];

  for (let svdIndex = 0; svdIndex < blockLength - 1; svdIndex++) {
    const dataByte = reader.u8(startAddress + 1 + svdIndex);
    if (dataByte === undefined) {
      break;
    }
    const shortVideoDescriptor: ShortVideoDescriptor = { vic: 0 };
    if ((dataByte & CEA861F_VIC_MASK) > 0) {
      shortVideoDescriptor.vic = dataByte & HIGH_VIC_MASK;
      shortVideoDescriptor.isNativeResolution = false;
    } else {
      shortVideoDescriptor.vic = dataByte & LOW_VIC_MASK;
      shortVideoDescriptor.isNativeResolution =
        dataByte & NATIVE_RESOLUTION_MASK ? true : false;
    }
    extendedTagBlock.YCbCr420OnlyShortVideoDescriptors[svdIndex] =
      shortVideoDescriptor;
  }

  return extendedTagBlock;
}

function parseYCbCr420CapabilityMapDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
  context: ExtensionParseContext,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag =
    EXTENDED_DATA_BLOCK_TYPE.YCBCR420_CAPABILITY_MAP;

  let FIELD_ADDRESS = 0;
  let FIELD_MASK = 0x0;
  let svdIndex = 0;
  let YCbCr420Capable = false;
  let YCbCr420svdIndex = 0;

  const videoBlock = context.lastVideoBlock;
  if (!videoBlock) {
    return extendedTagBlock;
  }

  extendedTagBlock.YCbCr420CapableShortVideoDescriptors = [];

  for (FIELD_ADDRESS = 1; FIELD_ADDRESS < blockLength; FIELD_ADDRESS++) {
    const dataByte = reader.u8(startAddress + FIELD_ADDRESS);
    if (dataByte === undefined) {
      break;
    }
    for (FIELD_MASK = 0x01; FIELD_MASK <= 0x80; FIELD_MASK <<= 1) {
      YCbCr420Capable = dataByte & FIELD_MASK ? true : false;
      if (YCbCr420Capable) {
        extendedTagBlock.YCbCr420CapableShortVideoDescriptors[
          YCbCr420svdIndex
        ] = videoBlock.shortVideoDescriptors[svdIndex];
        YCbCr420svdIndex++;
      }
      svdIndex++;
    }
  }

  return extendedTagBlock;
}

function parseSpeakerDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
): SpeakerDataBlock {
  const speakerBlock: SpeakerDataBlock = {
    tag: DATA_BLOCK_TYPE.SPEAKER_ALLOCATION,
    dataLength: blockLength,
    layoutBitmask: 0,
  };

  speakerBlock.layoutBitmask =
    (reader.u8OrZero(startAddress + 2) << 16) |
    (reader.u8OrZero(startAddress + 1) << 8) |
    reader.u8OrZero(startAddress);

  return speakerBlock;
}

function parseHDRStaticMetadataDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.HDR_STATIC_METADATA;

  if (blockLength < 2) {
    extendedTagBlock.error = 'Empty Data Block';
    return extendedTagBlock;
  }

  const EOTF_ADDRESS = 1;
  const STATIC_METADATA_ADDRESS = 2;

  extendedTagBlock.supportedEOTFs = [];
  const eotfByte = reader.u8OrZero(startAddress + EOTF_ADDRESS);

  for (let i = 0; i < EOTF_LABELS.length; i++) {
    if (eotfByte & (1 << i)) {
      const eotfType = EOTF_LABELS[i];
      if (eotfType) {
        extendedTagBlock.supportedEOTFs.push(eotfType);
      }
    }
  }

  extendedTagBlock.supportedStaticMetadataDescriptors = [];
  if (blockLength > 2) {
    const staticMetadataByte = reader.u8OrZero(
      startAddress + STATIC_METADATA_ADDRESS,
    );
    for (let i = 0; i < STATIC_METADATA_DESCRIPTORS.length; i++) {
      if (staticMetadataByte & (1 << i)) {
        const descriptor = STATIC_METADATA_DESCRIPTORS[i];
        if (descriptor) {
          extendedTagBlock.supportedStaticMetadataDescriptors.push(descriptor);
        }
      }
    }
  }

  if (blockLength >= 4) {
    const maxLum = reader.u8(startAddress + 3);
    if (maxLum !== undefined) {
      extendedTagBlock.desiredContentMaxLuminanceCode = maxLum;
    }
    const maxFrameAvgLum = reader.u8(startAddress + 4);
    if (maxFrameAvgLum !== undefined) {
      extendedTagBlock.desiredContentMaxFrameAverageLuminanceCode =
        maxFrameAvgLum;
    }
  }

  if (blockLength >= 5) {
    const minLum = reader.u8(startAddress + 5);
    if (minLum !== undefined) {
      extendedTagBlock.desiredContentMinLuminanceCode = minLum;
    }
  }

  const hasPqEotf =
    extendedTagBlock.supportedEOTFs.includes('SMPTE ST2084 (PQ)');
  const hasStaticType1 =
    extendedTagBlock.supportedStaticMetadataDescriptors.includes(
      'Static Metadata Type 1',
    );
  if (hasPqEotf && hasStaticType1) {
    extendedTagBlock.supportsHDR10 = true;
  }

  return extendedTagBlock;
}

function parseHDRDynamicMetadataDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.HDR_DYNAMIC_METADATA;

  if (blockLength < 3) {
    extendedTagBlock.error = 'Data Block too short';
    return extendedTagBlock;
  }

  extendedTagBlock.supportedDynamicMetadataTypes = [];

  const metadataType = reader.u8OrZero(startAddress + 1);
  extendedTagBlock.dynamicHdrMetadataTypeId = metadataType;

  if (metadataType === 1) {
    // ST 2094-10 standardizes a Dolby-authored dynamic HDR metadata method,
    // while Dolby Vision is a separate, larger Dolby format that must be
    // explicitly signaled.
    //
    // So a display can support ST 2094-10 without supporting Dolby Vision; you
    // can't infer Dolby Vision from ST 2094-10 alone.
    //
    // Sources:
    //
    // - W3C Media Capabilities API discussion:
    //   https://github.com/w3c/media-capabilities/issues/136
    // - ETSI TS 103 572 (Application #1 / ST-2094-10 carriage):
    //   https://www.etsi.org/deliver/etsi_ts/103500_103599/103572/01.03.01_60/ts_103572v010301p.pdf
    // - ATSC A/341 (optional ST 2094-10 metadata message semantics):
    //   https://www.atsc.org/wp-content/uploads/2025/08/A341-2025-07-Video-HEVC.pdf
    // - ETSI work item scope for TS 103 572 (ST-2094-10 signaling context):
    //   https://portal.etsi.org/webapp/workProgram/Report_WorkItem.asp?wki_id=53605
    // - Non-normative but explicit industry phrasing ("Dolby Vision (2094-10)"):
    //   https://www.atsc.org/news/a-word-from-our-sponsor-dolby/
    // - "EDID Override - Injecting a Dolby VSVDB Block" thread on CoreELEC forum:
    //   https://discourse.coreelec.org/t/edid-override-injecting-a-dolby-vsvdb-block/51510?page=22
    extendedTagBlock.supportedDynamicMetadataTypes.push('SMPTE ST 2094-10');
  } else if (metadataType === 2) {
    extendedTagBlock.supportedDynamicMetadataTypes.push('SMPTE ST 2094-20');
  } else if (metadataType === 3) {
    extendedTagBlock.supportedDynamicMetadataTypes.push('SMPTE ST 2094-30');
  } else if (metadataType === 4) {
    // ST 2094-40 standardizes a Samsung-authored dynamic HDR metadata method,
    // while HDR10+ is a broader industry HDR format that must be explicitly
    // signaled.
    //
    // So a display can support ST 2094-40 without supporting HDR10+; you
    // can't infer HDR10+ from ST 2094-40 alone.
    extendedTagBlock.supportedDynamicMetadataTypes.push('SMPTE ST 2094-40');
  }

  extendedTagBlock.dynamicHdrMetadataVersionNumber = reader.u8OrZero(
    startAddress + 2,
  );

  return extendedTagBlock;
}

function parseVideoFormatPreferenceDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag =
    EXTENDED_DATA_BLOCK_TYPE.VIDEO_FORMAT_PREFERENCE;

  if (blockLength < 1) {
    extendedTagBlock.error = 'Empty Data Block';
    return extendedTagBlock;
  }

  extendedTagBlock.videoFormatPreferences = [];

  for (let i = 1; i < blockLength; i++) {
    const preference: VideoFormatPreference = { svrCode: 0, frrCode: 0 };
    const dataByte = reader.u8OrZero(startAddress + i);

    preference.svrCode = dataByte & 0x3f;
    preference.frrCode = (dataByte & 0xc0) >> 6;

    extendedTagBlock.videoFormatPreferences.push(preference);
  }

  return extendedTagBlock;
}

function parseRoomConfigurationDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.ROOM_CONFIGURATION;

  if (blockLength < 1) {
    extendedTagBlock.error = 'Empty Data Block';
    return extendedTagBlock;
  }

  const configByte = reader.u8OrZero(startAddress + 1);

  extendedTagBlock.speakerCount = (configByte & 0x1f) + 1;
  extendedTagBlock.roomTypeCode = (configByte & 0x60) >> 5;

  const roomTypes = [
    'Not indicated',
    'Front Height',
    'Rear Height',
    'Reserved',
  ];
  extendedTagBlock.roomTypeString = roomTypes[extendedTagBlock.roomTypeCode];

  return extendedTagBlock;
}

function parseHDMIForumSCDB(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  extendedTagBlock: ExtendedTagDataBlock,
): ExtendedTagDataBlock {
  extendedTagBlock.extendedTag = EXTENDED_DATA_BLOCK_TYPE.HDMI_FORUM_SCDB;

  if (blockLength < 3) {
    extendedTagBlock.error = 'HDMI Forum SCDB too short';
    return extendedTagBlock;
  }

  const data: number[] = [];
  for (let i = 0; i < blockLength; i++) {
    const value = reader.u8(startAddress + i);
    data[i] = value ?? Number.NaN;
  }

  const dataByte = (index: number): number => data[index] ?? 0;

  extendedTagBlock.hfSCDBVersion = dataByte(1);
  extendedTagBlock.maxTMDSCharacterRateMhz = dataByte(2) * 5;

  extendedTagBlock.hdmiForumFeatures = {};

  if (blockLength > 3) {
    if (dataByte(3) & 0x80) {
      extendedTagBlock.hdmiForumFeatures.isScdcPresent = true;
    }
    if (dataByte(3) & 0x40) {
      extendedTagBlock.hdmiForumFeatures.isScdcReadRequestCapable = true;
    }
    if (dataByte(3) & 0x20) {
      extendedTagBlock.hdmiForumFeatures.supportsCableStatus = true;
    }
    if (dataByte(3) & 0x10) {
      extendedTagBlock.hdmiForumFeatures.supportsColorContentBitsPerComponent = true;
    }
    if (dataByte(3) & 0x08) {
      extendedTagBlock.hdmiForumFeatures.supportsScrambling340Mcsc = true;
    }
    if (dataByte(3) & 0x04) {
      extendedTagBlock.hdmiForumFeatures.supports3DIndependentView = true;
    }
    if (dataByte(3) & 0x02) {
      extendedTagBlock.hdmiForumFeatures.supports3DDualView = true;
    }
    if (dataByte(3) & 0x01) {
      extendedTagBlock.hdmiForumFeatures.supports3DOSDDisparity = true;
    }
  }

  if (blockLength > 4) {
    const maxFrlRate = (dataByte(4) & 0xf0) >> 4;
    const frlRates = [
      'Not Supported',
      '3 lanes @ 3 Gbps',
      '3 lanes @ 6 Gbps',
      '4 lanes @ 6 Gbps',
      '4 lanes @ 8 Gbps',
      '4 lanes @ 10 Gbps',
      '4 lanes @ 12 Gbps',
    ];
    extendedTagBlock.maxFixedRateLink =
      maxFrlRate < frlRates.length ? frlRates[maxFrlRate] : 'Unknown';

    if (dataByte(5) & 0x80) {
      extendedTagBlock.hdmiForumFeatures.supportsFAPAEndExtended = true;
    }
    if (dataByte(5) & 0x40) {
      extendedTagBlock.hdmiForumFeatures.supportsQMS = true;
    }
    if (dataByte(5) & 0x20) {
      extendedTagBlock.hdmiForumFeatures.supportsMDelta = true;
    }
    if (dataByte(5) & 0x10) {
      extendedTagBlock.hdmiForumFeatures.supportsCinemaVRR = true;
    }
    if (dataByte(5) & 0x08) {
      extendedTagBlock.hdmiForumFeatures.supportsNegativeMVRR = true;
    }
    if (dataByte(5) & 0x04) {
      extendedTagBlock.hdmiForumFeatures.supportsFastVActive = true;
    }
    if (dataByte(5) & 0x02) {
      extendedTagBlock.hdmiForumFeatures.supportsALLM = true;
    }
    if (dataByte(5) & 0x01) {
      extendedTagBlock.hdmiForumFeatures.supportsFAPAInBlanking = true;
    }
  }

  if (blockLength > 6) {
    const vrrMin = dataByte(6) & 0x3f;
    const vrrMax = ((dataByte(6) & 0xc0) << 2) | dataByte(7);

    if (vrrMin > 0) {
      extendedTagBlock.vrrMinHz = vrrMin;
    }
    if (vrrMax > 0) {
      extendedTagBlock.vrrMaxHz = vrrMax;
    }
  }

  if (blockLength > 8) {
    if (dataByte(8) & 0x80) {
      extendedTagBlock.hdmiForumFeatures.supportsVESADSC12a = true;
    }
    if (dataByte(8) & 0x40) {
      extendedTagBlock.hdmiForumFeatures.supportsCompressedVideo420 = true;
    }
    if (dataByte(8) & 0x20) {
      extendedTagBlock.hdmiForumFeatures.supportsQMSTFRmax = true;
    }
    if (dataByte(8) & 0x10) {
      extendedTagBlock.hdmiForumFeatures.supportsQMSTFRmin = true;
    }
    if (dataByte(8) & 0x08) {
      extendedTagBlock.hdmiForumFeatures.supportsCompressedVideoAnyBpp = true;
    }
    if (dataByte(8) & 0x04) {
      extendedTagBlock.hdmiForumFeatures.supports16bpcCompressedVideo = true;
    }
    if (dataByte(8) & 0x02) {
      extendedTagBlock.hdmiForumFeatures.supports12bpcCompressedVideo = true;
    }
    if (dataByte(8) & 0x01) {
      extendedTagBlock.hdmiForumFeatures.supports10bpcCompressedVideo = true;
    }
  }

  return extendedTagBlock;
}

function parseExtendedTagDataBlock(
  reader: BlockReader,
  startAddress: number,
  blockLength: number,
  context: ExtensionParseContext,
): ExtendedTagDataBlock {
  const extendedTagBlock: ExtendedTagDataBlock = {
    tag: DATA_BLOCK_TYPE.EXTENDED_TAG,
    dataLength: blockLength,
  };

  const EXTENDED_TAG_ADDRESS = 0;
  const extendedBlockTagCode = reader.u8OrZero(
    startAddress + EXTENDED_TAG_ADDRESS,
  );

  if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.VIDEO_CAPABILITY.value
  ) {
    return parseVideoCapabilityDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode ===
    EXTENDED_DATA_BLOCK_TYPE.VENDOR_SPECIFIC_VIDEO.value
  ) {
    return parseVendorSpecificVideoDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.COLORIMETRY.value
  ) {
    return parseColorimetryDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.YCBCR420_VIDEO.value
  ) {
    return parseYCbCr420VideoDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode ===
    EXTENDED_DATA_BLOCK_TYPE.YCBCR420_CAPABILITY_MAP.value
  ) {
    return parseYCbCr420CapabilityMapDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
      context,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.HDR_STATIC_METADATA.value
  ) {
    return parseHDRStaticMetadataDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.HDR_DYNAMIC_METADATA.value
  ) {
    return parseHDRDynamicMetadataDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode ===
    EXTENDED_DATA_BLOCK_TYPE.VIDEO_FORMAT_PREFERENCE.value
  ) {
    return parseVideoFormatPreferenceDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.ROOM_CONFIGURATION.value
  ) {
    return parseRoomConfigurationDataBlock(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else if (
    extendedBlockTagCode === EXTENDED_DATA_BLOCK_TYPE.HDMI_FORUM_SCDB.value
  ) {
    return parseHDMIForumSCDB(
      reader,
      startAddress,
      blockLength,
      extendedTagBlock,
    );
  } else {
    extendedTagBlock.extendedTag =
      extendedBlockTagCode as UnknownExtendedDataBlockTypeValue;
  }

  return extendedTagBlock;
}

function parseDataBlockCollection(
  reader: BlockReader,
  extBlock: BaseExtensionBlock,
  context: ExtensionParseContext,
  warnings: ParsedEdidWarning[],
): Array<AnyDataBlock | undefined> {
  const START_DATA_BLOCK = 4;
  const startAddress = START_DATA_BLOCK;
  const dataBlockLength = extBlock.dtdStart - START_DATA_BLOCK;
  if (dataBlockLength < 0) {
    warn(
      warnings,
      'parse_error',
      'CTA data block collection length is negative.',
      reader.blockIndex,
      startAddress,
      { dtdStart: extBlock.dtdStart },
    );
    return [];
  }
  const endAddress = startAddress + dataBlockLength;
  const dataBlockCollection: Array<AnyDataBlock | undefined> = [];

  const TAG_CODE_MASK = 0x07;
  const TAG_CODE_OFFSET = 5;
  const DATA_BLOCK_LENGTH_MASK = 0x1f;
  let index = startAddress;
  let numberDataBlocks = 0;
  let primaryVideoBlock: VideoDataBlock | undefined;
  while (index < endAddress) {
    const headerByte = reader.u8(index);
    if (headerByte === undefined) {
      break;
    }
    const blockTagCode = (headerByte >> TAG_CODE_OFFSET) & TAG_CODE_MASK;
    const blockLength = headerByte & DATA_BLOCK_LENGTH_MASK;

    let dataBlock: AnyDataBlock | undefined;

    if (blockTagCode === DATA_BLOCK_TYPE.AUDIO.value) {
      dataBlock = parseAudioDataBlock(reader, index + 1, blockLength);
    } else if (blockTagCode === DATA_BLOCK_TYPE.VIDEO.value) {
      const parsedVideoBlock = parseVideoDataBlock(
        reader,
        index + 1,
        blockLength,
        context,
      );
      if (!primaryVideoBlock) {
        primaryVideoBlock = parsedVideoBlock;
        dataBlock = parsedVideoBlock;
      } else {
        // CTA-861 allows multiple video data blocks; merge for a unified SVD list.
        primaryVideoBlock.shortVideoDescriptors.push(
          ...parsedVideoBlock.shortVideoDescriptors,
        );
        primaryVideoBlock.dataLength += parsedVideoBlock.dataLength;
        context.lastVideoBlock = primaryVideoBlock;
        dataBlock = undefined;
      }
    } else if (blockTagCode === DATA_BLOCK_TYPE.VENDOR_SPECIFIC.value) {
      dataBlock = parseVendorDataBlock(reader, index + 1, blockLength);
    } else if (blockTagCode === DATA_BLOCK_TYPE.SPEAKER_ALLOCATION.value) {
      dataBlock = parseSpeakerDataBlock(reader, index + 1, blockLength);
    } else if (blockTagCode === DATA_BLOCK_TYPE.EXTENDED_TAG.value) {
      dataBlock = parseExtendedTagDataBlock(
        reader,
        index + 1,
        blockLength,
        context,
      );
    } else {
      warn(
        warnings,
        'unknown_data_block',
        'Encountered an unknown CTA data block tag.',
        reader.blockIndex,
        index,
        { tagCode: blockTagCode, length: blockLength },
      );
    }

    dataBlockCollection[numberDataBlocks] = dataBlock;
    index += blockLength + 1;
    numberDataBlocks++;
  }

  if (
    !dataBlockCollection.some((block) => {
      if (!isExtendedTagBlock(block)) {
        return false;
      }
      const extendedTagValue =
        typeof block.extendedTag === 'number'
          ? block.extendedTag
          : block.extendedTag?.value;
      return (
        extendedTagValue === EXTENDED_DATA_BLOCK_TYPE.HDMI_FORUM_SCDB.value
      );
    })
  ) {
    // CTA extended data block: ext tag 0x79 (HDMI Forum SCDB).
    // Recover the block if malformed lengths caused misalignment.
    for (let scanIndex = startAddress; scanIndex < endAddress; scanIndex++) {
      const headerByte = reader.u8(scanIndex);
      if (headerByte === undefined) {
        break;
      }
      const blockTagCode = (headerByte >> TAG_CODE_OFFSET) & TAG_CODE_MASK;
      if (blockTagCode !== DATA_BLOCK_TYPE.EXTENDED_TAG.value) {
        continue;
      }
      const blockLength = headerByte & DATA_BLOCK_LENGTH_MASK;
      if (blockLength === 0) {
        continue;
      }
      const dataStart = scanIndex + 1;
      const dataEnd = dataStart + blockLength;
      if (dataEnd > endAddress) {
        continue;
      }
      const extendedTagValue = reader.u8OrZero(dataStart);
      if (extendedTagValue !== EXTENDED_DATA_BLOCK_TYPE.HDMI_FORUM_SCDB.value) {
        continue;
      }
      const scdbBlock = parseExtendedTagDataBlock(
        reader,
        dataStart,
        blockLength,
        context,
      );
      dataBlockCollection.push(scdbBlock);
      break;
    }
  }

  return dataBlockCollection;
}

function getNativeResolution(
  dtds: Dtd[] | undefined,
  basicDisplayParams: BasicDisplayParams | undefined,
): NativeResolution | undefined {
  const preferredDtd =
    basicDisplayParams?.isPreferredTiming === true ? dtds?.[0] : undefined;

  if (!preferredDtd) {
    return undefined;
  }

  if (
    !preferredDtd.horizontalActivePixels ||
    !preferredDtd.verticalActivePixels ||
    !preferredDtd.horizontalDisplaySizeInMm ||
    !preferredDtd.verticalDisplaySizeInMm ||
    !preferredDtd.pixelClockMhz
  ) {
    return undefined;
  }

  const horizontalTotal =
    preferredDtd.horizontalActivePixels +
    (preferredDtd.horizontalBlankLineCount ?? 0);
  const verticalTotal =
    preferredDtd.verticalActivePixels +
    (preferredDtd.verticalBlankLineCount ?? 0);

  if (horizontalTotal === 0 || verticalTotal === 0) {
    return undefined;
  }

  return {
    activeHorizontalPixels: preferredDtd.horizontalActivePixels,
    activeVerticalLines: preferredDtd.verticalActivePixels,
    physicalWidthInMm: preferredDtd.horizontalDisplaySizeInMm,
    physicalHeightInMm: preferredDtd.verticalDisplaySizeInMm,
    diagonalInches: computeDiagonalInches(
      preferredDtd.horizontalDisplaySizeInMm,
      preferredDtd.verticalDisplaySizeInMm,
    ),
    isInterlaced: preferredDtd.isInterlaced ? true : false,
    refreshRateHz: Math.round(
      (preferredDtd.pixelClockMhz * 1_000_000) /
        (horizontalTotal * verticalTotal),
    ),
  };
}

interface ParsedBaseBlockResult {
  baseBlock: ParsedBaseEdidBlock;
  vendorInfo: ReturnType<typeof getVendorInfo>;
  productInfo: ProductInfo;
  basicDisplayParams?: BasicDisplayParams;
  nativeResolution?: NativeResolution;
}

function parseBaseBlock(
  reader: BlockReader,
  ctx: ReadContext,
): ParsedBaseBlockResult {
  const vid = getVendorId(reader);
  const monitorDescriptors = getMonitorDescriptors(reader, 54, 126);
  const vendorInfo = getVendorInfo(vid);
  const productInfo: ProductInfo = {
    productCode: getProductCode(reader),
    modelName: monitorDescriptors.modelName || undefined,
    serialNumberInt: getSerialNumberInt(reader),
    serialNumberStr: monitorDescriptors.monitorSerialNumber || undefined,
    unspecifiedStrings:
      monitorDescriptors.unspecifiedStrings.length > 0
        ? monitorDescriptors.unspecifiedStrings
        : undefined,
    manufactureWeek: getManufactureWeek(reader),
    manufactureYear: getManufactureYear(reader),
  };
  const basicDisplayParams = getBasicDisplayParams(reader);

  const baseBlock: ParsedBaseEdidBlock = {
    vendorId: vid,
    rawBytes: ctx.bytes.slice(0, EDID_BLOCK_LENGTH),
  };

  if (monitorDescriptors.spwg) {
    baseBlock.spwg = monitorDescriptors.spwg;
  }

  baseBlock.isHeaderValid = validateHeader(reader);
  baseBlock.headerValidity = baseBlock.isHeaderValid ? 'OK' : 'ERROR';

  baseBlock.edidVersion = getEdidVersion(reader);
  baseBlock.edidRevision = getEdidRevision(reader);
  baseBlock.edidVersionString = `${baseBlock.edidVersion}.${baseBlock.edidRevision}`;

  if (
    baseBlock.edidVersion === 1 &&
    ![0, 1, 2, 3, 4].includes(baseBlock.edidRevision)
  ) {
    warn(
      ctx.warnings,
      'unknown_edid_minor_version',
      `Unknown EDID minor version ${baseBlock.edidRevision}, assuming 1.4 conformance.`,
      reader.blockIndex,
      19,
      {
        majorVersion: baseBlock.edidVersion,
        minorRevision: baseBlock.edidRevision,
        assumedConformance: 1.4,
      },
    );
  }

  baseBlock.chromaticity = getChromaticityCoordinates(reader);
  baseBlock.timingBitmap = getTimingBitmap(reader);
  baseBlock.standardDisplayModes = getStandardDisplayModes(reader);

  baseBlock.dtds = getDtds(reader, 54, 126);
  const nativeResolution = getNativeResolution(
    baseBlock.dtds,
    basicDisplayParams,
  );

  baseBlock.numberOfExtensions = getNumberExtensions(reader);
  baseBlock.checksum = getChecksum(reader);
  baseBlock.isChecksumValid = validChecksum(ctx, 0, 0);

  return {
    baseBlock,
    vendorInfo,
    productInfo,
    basicDisplayParams,
    nativeResolution,
  };
}

function parseCtaExtension(
  reader: BlockReader,
  ctx: ReadContext,
  extIndex: number,
  context: ExtensionParseContext,
): ParsedExtensionBlock {
  const extTag = reader.u8OrZero(0);
  const revision = reader.u8OrZero(1);
  const dtdStart = reader.u8OrZero(2);
  const numDtds = reader.u8OrZero(3) & 0x0f;
  const underscan = reader.u8OrZero(3) & 0x80 ? true : false;
  const basicAudio = reader.u8OrZero(3) & 0x40 ? true : false;
  const ycbcr444 = reader.u8OrZero(3) & 0x20 ? true : false;
  const ycbcr422 = reader.u8OrZero(3) & 0x10 ? true : false;

  const extBlock: ParsedExtensionBlock = {
    blockNumber: extIndex + 1,
    extTagByte: extTag,
    revisionNumber: revision,
    dtdStart,
    numDtds,
    supportsUnderscan: underscan,
    supportsBasicAudio: basicAudio,
    supportsYCbCr444: ycbcr444,
    supportsYCbCr422: ycbcr422,
    dtds: [],
    checksum: 0,
    rawBytes: ctx.bytes.slice(
      reader.blockOffset,
      reader.blockOffset + EDID_BLOCK_LENGTH,
    ),
    extensionType: 'cta-861',
  };

  if (dtdStart !== 4) {
    extBlock.dataBlockCollection = parseDataBlockCollection(
      reader,
      extBlock,
      context,
      ctx.warnings,
    );
  }

  extBlock.dtds = getDtds(reader, dtdStart, 126);

  const extChecksum = reader.u8(127);
  extBlock.checksum = extChecksum ?? 0;
  extBlock.isChecksumValid = validChecksum(ctx, extIndex + 1, extIndex + 1);

  return extBlock;
}

function parseDisplayIdExtension(
  reader: BlockReader,
  ctx: ReadContext,
  extIndex: number,
): ParsedExtensionBlock {
  const extTag = reader.u8OrZero(0);
  const revision = reader.u8OrZero(1);
  const payloadLength = reader.u8OrZero(2);
  const dtdStart = Math.min(127, 5 + payloadLength);

  const extBlock: ParsedExtensionBlock = {
    blockNumber: extIndex + 1,
    extTagByte: extTag,
    revisionNumber: revision,
    dtdStart,
    numDtds: 0,
    supportsUnderscan: false,
    supportsBasicAudio: false,
    supportsYCbCr444: false,
    supportsYCbCr422: false,
    dtds: [],
    checksum: 0,
    rawBytes: ctx.bytes.slice(
      reader.blockOffset,
      reader.blockOffset + EDID_BLOCK_LENGTH,
    ),
    extensionType: 'displayid',
  };

  const extChecksum = reader.u8(127);
  extBlock.checksum = extChecksum ?? 0;
  extBlock.isChecksumValid = validChecksum(ctx, extIndex + 1, extIndex + 1);

  return extBlock;
}

function parseUnknownExtension(
  reader: BlockReader,
  ctx: ReadContext,
  extIndex: number,
): ParsedExtensionBlock {
  const extTag = reader.u8OrZero(0);
  const revision = reader.u8OrZero(1);
  const dtdStart = reader.u8OrZero(2);
  const numDtds = reader.u8OrZero(3) & 0x0f;
  const underscan = reader.u8OrZero(3) & 0x80 ? true : false;
  const basicAudio = reader.u8OrZero(3) & 0x40 ? true : false;
  const ycbcr444 = reader.u8OrZero(3) & 0x20 ? true : false;
  const ycbcr422 = reader.u8OrZero(3) & 0x10 ? true : false;

  const extBlock: ParsedExtensionBlock = {
    blockNumber: extIndex + 1,
    extTagByte: extTag,
    revisionNumber: revision,
    dtdStart,
    numDtds,
    supportsUnderscan: underscan,
    supportsBasicAudio: basicAudio,
    supportsYCbCr444: ycbcr444,
    supportsYCbCr422: ycbcr422,
    dtds: [],
    checksum: 0,
    rawBytes: ctx.bytes.slice(
      reader.blockOffset,
      reader.blockOffset + EDID_BLOCK_LENGTH,
    ),
    extensionType: 'unknown',
  };

  const extChecksum = reader.u8(127);
  extBlock.checksum = extChecksum ?? 0;
  extBlock.isChecksumValid = validChecksum(ctx, extIndex + 1, extIndex + 1);

  warn(
    ctx.warnings,
    'unknown_extension_tag',
    'Encountered an unsupported extension tag.',
    reader.blockIndex,
    0,
    { tag: extTag },
  );

  return extBlock;
}

const CTA_EXTENSION_TAG = 0x02;
const DISPLAYID_EXTENSION_TAG = 0x70;

function parseExtensions(
  ctx: ReadContext,
  count: number,
  context: ExtensionParseContext,
): ParsedExtensionBlock[] {
  const extensions: ParsedExtensionBlock[] = [];

  for (let extIndex = 0; extIndex < count; extIndex++) {
    const blockOffset = EDID_BLOCK_LENGTH * (extIndex + 1);
    const reader = createBlockReader(ctx, extIndex + 1, blockOffset);
    const extTag = reader.u8(0);
    if (extTag === undefined) {
      break;
    }

    try {
      if (extTag === CTA_EXTENSION_TAG) {
        extensions.push(parseCtaExtension(reader, ctx, extIndex, context));
      } else if (extTag === DISPLAYID_EXTENSION_TAG) {
        extensions.push(parseDisplayIdExtension(reader, ctx, extIndex));
      } else {
        extensions.push(parseUnknownExtension(reader, ctx, extIndex));
      }
    } catch (error) {
      warn(
        ctx.warnings,
        'parse_error',
        'Failed to parse extension block.',
        reader.blockIndex,
        0,
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { error },
      );
      const fallback = parseUnknownExtension(reader, ctx, extIndex);
      extensions.push(fallback);
    }
  }

  return extensions;
}

function inferColorGamut(
  chromaticity: ChromaticityCoordinates | undefined,
): ColorGamut | undefined {
  const redX = chromaticity?.redXCoords;
  const redY = chromaticity?.redYCoords;
  const greenX = chromaticity?.greenXCoords;
  const greenY = chromaticity?.greenYCoords;
  const blueX = chromaticity?.blueXCoords;
  const blueY = chromaticity?.blueYCoords;

  if (
    redX === undefined ||
    redY === undefined ||
    greenX === undefined ||
    greenY === undefined ||
    blueX === undefined ||
    blueY === undefined
  ) {
    return undefined;
  }

  let closestGamut: ColorGamut | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const gamut of CANONICAL_GAMUTS) {
    const distance =
      (redX - gamut.redX) ** 2 +
      (redY - gamut.redY) ** 2 +
      (greenX - gamut.greenX) ** 2 +
      (greenY - gamut.greenY) ** 2 +
      (blueX - gamut.blueX) ** 2 +
      (blueY - gamut.blueY) ** 2;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestGamut = gamut.gamut;
    }
  }

  return closestGamut;
}

function getDtdRefreshRateHz(dtd: Dtd): number | undefined {
  const pixelClockMhz = dtd.pixelClockMhz;
  const horizontalActivePixels = dtd.horizontalActivePixels;
  const verticalActivePixels = dtd.verticalActivePixels;

  if (
    pixelClockMhz === undefined ||
    horizontalActivePixels === undefined ||
    verticalActivePixels === undefined ||
    horizontalActivePixels <= 0 ||
    verticalActivePixels <= 0
  ) {
    return undefined;
  }

  const horizontalTotal =
    horizontalActivePixels + (dtd.horizontalBlankLineCount ?? 0);
  const verticalTotal =
    verticalActivePixels + (dtd.verticalBlankLineCount ?? 0);

  if (horizontalTotal <= 0 || verticalTotal <= 0) {
    return undefined;
  }

  const refreshRateHz =
    (pixelClockMhz * 1_000_000) / (horizontalTotal * verticalTotal);

  return Number.isFinite(refreshRateHz) && refreshRateHz > 0
    ? refreshRateHz
    : undefined;
}

function maxBitDepth(
  current: InputSignalBitDepth,
  next: InputSignalBitDepth,
): InputSignalBitDepth {
  return next > current ? next : current;
}

function maxHdmiVersion(
  current: HdmiVersion | undefined,
  next: HdmiVersion,
): HdmiVersion {
  return current === undefined || next > current ? next : current;
}

function parseDisplayIdVersionFromRevision(
  revision: number,
): DisplayIdVersion | undefined {
  if (!Number.isFinite(revision) || revision <= 0 || revision > 0xff) {
    return undefined;
  }

  if (revision === 0x01) {
    return 1.3;
  }
  if (revision === 0x02) {
    return 2;
  }
  if (revision === 0x03) {
    return 2.1;
  }

  const major = (revision >> 4) & 0x0f;
  const minor = revision & 0x0f;
  if (major === 0 || minor > 9) {
    return undefined;
  }

  return (major + minor / 10) as DisplayIdVersion;
}

function maxDisplayIdVersion(
  current: DisplayIdVersion | undefined,
  next: DisplayIdVersion,
): DisplayIdVersion {
  return current === undefined || next > current ? next : current;
}

function buildFeatureSupport(
  baseBlock: ParsedBaseEdidBlock,
  extensions: ParsedExtensionBlock[],
  basicDisplayParams: BasicDisplayParams | undefined,
  nativeResolution: NativeResolution | undefined,
): FeatureSupport {
  const colorGamuts = new Set<ColorGamut>();

  if (basicDisplayParams?.isStandardSRgb) {
    colorGamuts.add('srgb');
  }

  const inferredGamut = inferColorGamut(baseBlock.chromaticity);
  if (inferredGamut) {
    colorGamuts.add(inferredGamut);
    colorGamuts.add('srgb');
  }

  let maxInputSignalBitDepth: InputSignalBitDepth = 8;
  let supportsHDR10 = false;
  let supportsHDR10Plus = false;
  let supportsDolbyVision = false;
  let supportsVRR = false;
  let supportsGameMode = false;
  let supportsALLM = false;
  let minVrrHz: number | undefined;
  let maxVrrHz: number | undefined;
  let hdmiVersion: HdmiVersion | undefined;
  let displayIdVersion: DisplayIdVersion | undefined;
  let minSrrHz = Number.POSITIVE_INFINITY;
  let maxSrrHz = 0;

  const addSrrRate = (rateHz: number | undefined): void => {
    if (rateHz === undefined || !Number.isFinite(rateHz) || rateHz <= 0) {
      return;
    }

    const rounded = Math.round(rateHz);
    if (rounded <= 0) {
      return;
    }

    if (rounded < minSrrHz) {
      minSrrHz = rounded;
    }
    if (rounded > maxSrrHz) {
      maxSrrHz = rounded;
    }
  };

  const addVrrMin = (rateHz: number | undefined): void => {
    if (rateHz === undefined || !Number.isFinite(rateHz) || rateHz <= 0) {
      return;
    }
    const rounded = Math.round(rateHz);
    if (rounded <= 0) {
      return;
    }
    minVrrHz = minVrrHz === undefined ? rounded : Math.min(minVrrHz, rounded);
  };

  const addVrrMax = (rateHz: number | undefined): void => {
    if (rateHz === undefined || !Number.isFinite(rateHz) || rateHz <= 0) {
      return;
    }
    const rounded = Math.round(rateHz);
    if (rounded <= 0) {
      return;
    }
    maxVrrHz = maxVrrHz === undefined ? rounded : Math.max(maxVrrHz, rounded);
  };

  const addHdmiVersion = (version: HdmiVersion): void => {
    hdmiVersion = maxHdmiVersion(hdmiVersion, version);
  };

  const addDisplayIdVersion = (version: DisplayIdVersion): void => {
    displayIdVersion = maxDisplayIdVersion(displayIdVersion, version);
  };

  addSrrRate(nativeResolution?.refreshRateHz);
  for (const mode of baseBlock.standardDisplayModes ?? []) {
    addSrrRate(mode.vertFreqHz);
  }
  for (const dtd of baseBlock.dtds ?? []) {
    addSrrRate(getDtdRefreshRateHz(dtd));
  }
  for (const ext of extensions) {
    if (ext.extTagByte === DISPLAYID_EXTENSION_TAG) {
      const version = parseDisplayIdVersionFromRevision(ext.revisionNumber);
      if (version !== undefined) {
        addDisplayIdVersion(version);
      }
    }

    for (const dtd of ext.dtds) {
      addSrrRate(getDtdRefreshRateHz(dtd));
    }

    const dataBlocks = ext.dataBlockCollection;
    if (!dataBlocks) {
      continue;
    }

    for (const dataBlock of dataBlocks) {
      if (!dataBlock) {
        continue;
      }

      if (isVendorBlock(dataBlock)) {
        if (dataBlock.ieeeOui === IEEE_OUI_TYPE.HDMI14.value) {
          addHdmiVersion(1.4);
        } else if (dataBlock.ieeeOui === IEEE_OUI_TYPE.HDMI_FORUM.value) {
          const isHdmi21Signaled =
            dataBlock.hfPayloadVersion !== undefined ||
            dataBlock.hdmiForumFeatures !== undefined ||
            (dataBlock.maxFixedRateLink !== undefined &&
              dataBlock.maxFixedRateLink !== 'Not Supported');
          addHdmiVersion(isHdmi21Signaled ? 2.1 : 2);
        }

        if (dataBlock.supportsDolbyVision) {
          supportsDolbyVision = true;
        }
        if (dataBlock.supportsGameContentType) {
          supportsGameMode = true;
        }

        if (
          dataBlock.supportsDeepColor30 ||
          dataBlock.supportsDeepColorY420_30
        ) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 10);
        }
        if (
          dataBlock.supportsDeepColor36 ||
          dataBlock.supportsDeepColorY420_36
        ) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 12);
        }
        if (
          dataBlock.supportsDeepColor48 ||
          dataBlock.supportsDeepColorY420_48
        ) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 16);
        }

        if (dataBlock.hdmiForumFeatures?.supports10bpcCompressedVideo) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 10);
        }
        if (dataBlock.hdmiForumFeatures?.supports12bpcCompressedVideo) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 12);
        }
        if (dataBlock.hdmiForumFeatures?.supports16bpcCompressedVideo) {
          maxInputSignalBitDepth = maxBitDepth(maxInputSignalBitDepth, 16);
        }

        if (
          dataBlock.hdmiForumFeatures?.supportsCinemaVRR ||
          dataBlock.hdmiForumFeatures?.supportsNegativeMVRR
        ) {
          supportsVRR = true;
        }
        if (dataBlock.hdmiForumFeatures?.supportsALLM) {
          supportsALLM = true;
        }
        if (
          dataBlock.vrrMinHz !== undefined ||
          dataBlock.vrrMaxHz !== undefined
        ) {
          supportsVRR = true;
        }
        addVrrMin(dataBlock.vrrMinHz);
        addVrrMax(dataBlock.vrrMaxHz);
        continue;
      }

      if (!isExtendedTagBlock(dataBlock)) {
        continue;
      }

      if (dataBlock.extendedTag === EXTENDED_DATA_BLOCK_TYPE.HDMI_FORUM_SCDB) {
        const isHdmi21Signaled =
          dataBlock.hdmiForumFeatures !== undefined ||
          (dataBlock.maxFixedRateLink !== undefined &&
            dataBlock.maxFixedRateLink !== 'Not Supported');
        addHdmiVersion(isHdmi21Signaled ? 2.1 : 2);
      } else if (
        dataBlock.supportsQMS ||
        dataBlock.supportsCinemaVRR ||
        dataBlock.supportsNegativeMRR ||
        dataBlock.supportsFVA ||
        dataBlock.supportsALLM
      ) {
        addHdmiVersion(2.1);
      }

      if (dataBlock.supportsHDR10) {
        supportsHDR10 = true;
      }
      if (dataBlock.supportsHDR10Plus) {
        supportsHDR10Plus = true;
      }
      if (dataBlock.supportsDolbyVision) {
        supportsDolbyVision = true;
      }

      if (dataBlock.supportsAdobeRGB) {
        colorGamuts.add('adobe_rgb');
      }
      if (
        dataBlock.supportsBT2020RGB ||
        dataBlock.supportsBT2020YCC ||
        dataBlock.supportsBT2020cYCC
      ) {
        colorGamuts.add('rec_2020');
      }

      if (
        dataBlock.supportsVRR ||
        dataBlock.supportsCinemaVRR ||
        dataBlock.supportsNegativeMRR
      ) {
        supportsVRR = true;
      }
      if (dataBlock.supportsALLM || dataBlock.hdmiForumFeatures?.supportsALLM) {
        supportsALLM = true;
      }
      if (
        dataBlock.vrrMinHz !== undefined ||
        dataBlock.vrrMaxHz !== undefined
      ) {
        supportsVRR = true;
      }
      addVrrMin(dataBlock.vrrMinHz);
      addVrrMax(dataBlock.vrrMaxHz);
    }
  }

  if (minVrrHz !== undefined && minSrrHz > minVrrHz) {
    minSrrHz = minVrrHz;
  }
  if (maxVrrHz !== undefined && maxSrrHz < maxVrrHz) {
    maxSrrHz = maxVrrHz;
  }

  if (!Number.isFinite(minSrrHz)) {
    minSrrHz = minVrrHz ?? maxVrrHz ?? 0;
  }
  if (maxSrrHz === 0) {
    maxSrrHz = maxVrrHz ?? minSrrHz;
  }
  if (maxSrrHz < minSrrHz) {
    maxSrrHz = minSrrHz;
  }
  if (!supportsVRR && (minVrrHz !== undefined || maxVrrHz !== undefined)) {
    supportsVRR = true;
  }

  const orderedColorGamuts: ColorGamut[] = [];
  if (colorGamuts.has('srgb')) {
    orderedColorGamuts.push('srgb');
  }
  if (colorGamuts.has('display_p3')) {
    orderedColorGamuts.push('display_p3');
  }
  if (colorGamuts.has('adobe_rgb')) {
    orderedColorGamuts.push('adobe_rgb');
  }
  if (colorGamuts.has('rec_2020')) {
    orderedColorGamuts.push('rec_2020');
  }

  const edidMajor: number | undefined = baseBlock.edidVersion;
  const edidMinor: number | undefined = baseBlock.edidRevision;
  const edidVersion: EdidVersion | undefined =
    edidMajor !== undefined && edidMinor !== undefined
      ? (Number.parseFloat(`${edidMajor}.${edidMinor}`) as EdidVersion)
      : undefined;

  return {
    colorGamuts: orderedColorGamuts,
    maxInputSignalBitDepth,
    hdmiVersion,
    supportsHDR10,
    supportsHDR10Plus,
    supportsDolbyVision,
    minSrrHz,
    maxSrrHz,
    supportsVRR,
    minVrrHz,
    maxVrrHz,
    supportsGameMode,
    supportsALLM,
    edidVersion,
    displayIdVersion,
  };
}

// #endregion - Parsing

////////////////////////////////////////////////////////////////////////////////

// #region - Public API

export function parseEdid(
  data: number[] | Uint8Array | Uint8ClampedArray | ArrayBuffer,
): ParsedEdid {
  const bytes = new Uint8ClampedArray(data);
  const warnings: ParsedEdidWarning[] = [];
  const ctx: ReadContext = { bytes, warnings };

  if (bytes.length < EDID_BLOCK_LENGTH) {
    warn(
      warnings,
      'too_short',
      'EDID data is shorter than a single 128-byte block.',
      undefined,
      undefined,
      { length: bytes.length },
    );
  }
  if (bytes.length % EDID_BLOCK_LENGTH !== 0) {
    warn(
      warnings,
      'length_not_multiple_of_128',
      'EDID length is not a multiple of 128 bytes.',
      undefined,
      undefined,
      { length: bytes.length },
    );
  }

  const baseReader = createBlockReader(ctx, 0, 0);
  const {
    baseBlock,
    vendorInfo,
    productInfo,
    basicDisplayParams,
    nativeResolution,
  } = parseBaseBlock(baseReader, ctx);

  if (!baseBlock.isHeaderValid) {
    warn(warnings, 'invalid_header', 'EDID header is invalid.', 0, 0);
  }

  if (baseBlock.isChecksumValid === false) {
    warn(warnings, 'checksum_failed', 'Base block checksum failed.', 0, 127);
  }

  const expectedExtensionCount = baseBlock.numberOfExtensions ?? 0;
  const actualExtensionCount = Math.max(
    0,
    Math.floor(bytes.length / EDID_BLOCK_LENGTH) - 1,
  );

  if (expectedExtensionCount !== actualExtensionCount) {
    warn(
      warnings,
      'extension_count_mismatch',
      'Extension count does not match available blocks.',
      undefined,
      undefined,
      { expected: expectedExtensionCount, actual: actualExtensionCount },
    );
  }

  const extensionContext: ExtensionParseContext = {};
  const extensions = parseExtensions(
    ctx,
    actualExtensionCount,
    extensionContext,
  );

  for (const ext of extensions) {
    if (ext.isChecksumValid === false) {
      warn(
        warnings,
        'checksum_failed',
        'Extension block checksum failed.',
        ext.blockNumber,
        127,
      );
    }
  }

  const isHeaderValid = baseBlock.isHeaderValid;
  const isChecksumValid = baseBlock.isChecksumValid;
  const featureSupport = buildFeatureSupport(
    baseBlock,
    extensions,
    basicDisplayParams,
    nativeResolution,
  );

  return {
    bytes,
    warnings,
    isHeaderValid,
    isChecksumValid,
    expectedExtensionCount,
    baseBlock,
    extensions,
    featureSupport,
    vendorInfo,
    productInfo,
    basicDisplayParams,
    nativeResolution,
  };
}

// #endregion - Public API

////////////////////////////////////////////////////////////////////////////////
