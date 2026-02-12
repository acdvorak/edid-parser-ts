/**
 * Ported from
 * https://github.com/dgallegos/edidreader/blob/886c1a9f7/app/js/edid.js
 *
 * @license MIT
 * Copyright (c) 2012-2013 David Gallegos
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import {
  DATA_BLOCK_TYPE,
  EDID_BLOCK_LENGTH,
  EXTENDED_DATA_BLOCK_TYPE,
} from './edid-constants';
import type {
  AudioDataBlock,
  BasicDisplayParams,
  ChromaticityCoordinates,
  DataBlock,
  Dtd,
  ExtBlock,
  ExtendedTagDataBlock,
  ParsedBaseEdidBlock,
  ParsedEdid,
  ParsedEdidDebug,
  ParsedEdidSummary,
  ParsedEdidWarning,
  ParsedEdidWarningCode,
  ParsedExtensionBlock,
  ShortAudioDescriptor,
  ShortVideoDescriptor,
  SpeakerDataBlock,
  StandardDisplayMode,
  UnknownExtendedDataBlockTypeValue,
  VendorDataBlock,
  VideoDataBlock,
  VideoFormatPreference,
  XyPixelRatio,
} from './edid-types';

interface NumericEnumEntry {
  string: Uppercase<string>;
  value: number;
}

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

const IEEE_OUI_TYPE = {
  HDMI14: { string: 'HDMI14', value: 0x000c03 },
  HDMI20: { string: 'HDMI20', value: 0xc45dd8 },
  HDMI_FORUM: { string: 'HDMI FORUM', value: 0xc45dd8 },
} as const satisfies Record<Uppercase<string>, NumericEnumEntry>;

export type IeeeOuiTypeMap = typeof IEEE_OUI_TYPE;

const OVERSCAN_BEHAVIOR = [
  'No data',
  'Always overscanned',
  'Always underscanned',
  'Supports both overscan and underscan',
] as const;

const AUDIO_FORMAT_ARRAY = [1, 8, 13, 14, 15] as const;

const EOTF_TYPES = [
  'Traditional gamma - SDR luminance range',
  'Traditional gamma - HDR luminance range',
  'SMPTE ST2084 (PQ)',
  'Hybrid Log-Gamma (HLG)',
] as const;

const STATIC_METADATA_DESCRIPTORS = ['Static Metadata Type 1'] as const;

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

export function isAudioBlock(
  block: DataBlock | null | undefined,
): block is AudioDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.AUDIO.value;
}

export function isVideoBlock(
  block: DataBlock | null | undefined,
): block is VideoDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VIDEO.value;
}

export function isVendorBlock(
  block: DataBlock | null | undefined,
): block is VendorDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VENDOR_SPECIFIC.value;
}

export function isSpeakerBlock(
  block: DataBlock | null | undefined,
): block is SpeakerDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.SPEAKER_ALLOCATION.value;
}

export function isExtendedTagBlock(
  block: DataBlock | null | undefined,
): block is ExtendedTagDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.EXTENDED_TAG.value;
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
 * "LGS" // LG Semicom Company Ltd
 * "SAM" // Samsung Electric Company
 * "SNY" // Sony
 *
 * @see https://github.com/robacklin/sigrok/blob/f4c3b93c0/decoders/edid/pnpids.txt
 * @see https://uefi.org/uefi-pnp-export
 * @see https://uefi.org/PNP_ACPI_Registry
 */
function getVendorId(reader: BlockReader): string {
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

  return (
    intToAscii(firstLetter) + intToAscii(secondLetter) + intToAscii(thirdLetter)
  );
}

function getProductCode(reader: BlockReader): number {
  const PRODUCT_CODE1 = 10;
  const PRODUCT_CODE2 = 11;

  return (reader.u8OrZero(PRODUCT_CODE2) << 8) | reader.u8OrZero(PRODUCT_CODE1);
}

function getSerialNumber(reader: BlockReader): number {
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
    bdp.digitalInput = true;
    if (videoInParams & VESA_DFP_COMPATIBLE) {
      bdp.vesaDfpCompatible = true;
    } else {
      bdp.vesaDfpCompatible = false;
    }
  } else {
    bdp.digitalInput = false;

    const WHITE_SYNC_LVLS_OFF = 5;
    const WHITE_SYNC_LVLS_MASK = 0x03;
    bdp.whiteSyncLevels =
      (videoInParams >> WHITE_SYNC_LVLS_OFF) & WHITE_SYNC_LVLS_MASK;

    const BLANK_TO_BLACK_OFF = 4;
    const BLANK_TO_BLACK_MASK = 0x01;
    bdp.blankToBlack =
      (videoInParams >> BLANK_TO_BLACK_OFF) & BLANK_TO_BLACK_MASK
        ? true
        : false;

    const SEPARATE_SYNC_OFF = 3;
    const SEPARATE_SYNC_MASK = 0x01;
    bdp.separateSyncSupported =
      (videoInParams >> SEPARATE_SYNC_OFF) & SEPARATE_SYNC_MASK ? true : false;

    const COMPOSITE_SYNC_OFF = 2;
    const COMPOSITE_SYNC_MASK = 0x01;
    bdp.compositeSyncSupported =
      (videoInParams >> COMPOSITE_SYNC_OFF) & COMPOSITE_SYNC_MASK
        ? true
        : false;

    const SYNC_ON_GREEN_OFF = 1;
    const SYNC_ON_GREEN_MASK = 0x01;
    bdp.synOnGreen =
      (videoInParams >> SYNC_ON_GREEN_OFF) & SYNC_ON_GREEN_MASK ? true : false;

    const VSYNC_SERRATED_MASK = 0x01;
    bdp.vsyncSerrated = videoInParams & VSYNC_SERRATED_MASK ? true : false;
  }

  const MAX_HOR_IMG_SIZE = 21;
  bdp.maxHorImgSize = reader.u8OrZero(MAX_HOR_IMG_SIZE);

  const MAX_VERT_IMG_SIZE = 22;
  bdp.maxVertImgSize = reader.u8OrZero(MAX_VERT_IMG_SIZE);

  const DISPLAY_GAMMA = 23;
  bdp.displayGamma = reader.u8OrZero(DISPLAY_GAMMA) * (2.54 / 255) + 1;

  const SUPPORTED_FEATURES_BITMAP = 24;
  const supportedFeatures = reader.u8OrZero(SUPPORTED_FEATURES_BITMAP);
  const DPMS_STANDBY = 0x80;
  bdp.dpmsStandby = supportedFeatures & DPMS_STANDBY ? true : false;
  const DPMS_SUSPEND = 0x40;
  bdp.dpmsSuspend = supportedFeatures & DPMS_SUSPEND ? true : false;
  const DPMS_ACTIVE_OFF = 0x20;
  bdp.dpmsActiveOff = supportedFeatures & DPMS_ACTIVE_OFF ? true : false;
  const DISPLAY_TYPE_OFF = 3;
  const DISPLAY_TYPE_MASK = 0x03;
  bdp.displayType = (supportedFeatures >> DISPLAY_TYPE_OFF) & DISPLAY_TYPE_MASK;

  const STANDARD_SRGB = 0x04;
  bdp.standardSRgb = supportedFeatures & STANDARD_SRGB ? true : false;
  const PREFERRED_TIMING = 0x02;
  bdp.preferredTiming = supportedFeatures & PREFERRED_TIMING ? true : false;
  const GTF_SUPPORTED = 0x01;
  bdp.gtfSupported = supportedFeatures & GTF_SUPPORTED ? true : false;

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
      standardDisplayModes.xResolution = (byte1 + 31) * 8;

      const XY_PIXEL_RATIO_OFF = 6;
      const XY_PIXEL_RATIO_MASK = 0x03;
      standardDisplayModes.xyPixelRatio =
        (byte2 >> XY_PIXEL_RATIO_OFF) & XY_PIXEL_RATIO_MASK;

      const VERTICAL_FREQUENCY_MASK = 0x3f;
      standardDisplayModes.vertFreq = (byte2 & VERTICAL_FREQUENCY_MASK) + 60;

      stdDispModesArray[arrayCounter] = standardDisplayModes;
      arrayCounter++;
    }
    index += 2;
  }
  return stdDispModesArray;
}

function parseDtd(reader: BlockReader, dtdOffset: number): Dtd | undefined {
  const pixelClockLo = reader.u8(dtdOffset);
  const pixelClockHi = reader.u8(dtdOffset + 1);
  if (pixelClockLo === undefined || pixelClockHi === undefined) {
    return undefined;
  }

  const dtd: Dtd = {};
  dtd.pixelClock = ((pixelClockHi << 8) | pixelClockLo) / 100;

  const HOR_ACTIVE_OFF = 4;
  const HOR_ACTIVE_PIX_MASK = 0x0f;
  dtd.horActivePixels =
    (((reader.u8OrZero(dtdOffset + 4) >> HOR_ACTIVE_OFF) &
      HOR_ACTIVE_PIX_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 2);

  const HOR_BLANK_MASK = 0x0f;
  dtd.horBlankPixels =
    ((reader.u8OrZero(dtdOffset + 4) & HOR_BLANK_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 3);

  const VERT_ACTIVE_OFF = 4;
  const VERT_ACTIVE_MASK = 0x0f;
  dtd.vertActivePixels =
    (((reader.u8OrZero(dtdOffset + 7) >> VERT_ACTIVE_OFF) & VERT_ACTIVE_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 5);

  const VERT_BLANK_MASK = 0x0f;
  dtd.vertBlankPixels =
    ((reader.u8OrZero(dtdOffset + 7) & VERT_BLANK_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 6);

  const HOR_SYNC_OFF_OFF = 6;
  const HOR_SYNC_OFF_MASK = 0x03;
  dtd.horSyncOff =
    (((reader.u8OrZero(dtdOffset + 11) >> HOR_SYNC_OFF_OFF) &
      HOR_SYNC_OFF_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 8);

  const HOR_SYNC_PULSE_OFF = 4;
  const HOR_SYNC_PULSE_MASK = 0x03;
  dtd.horSyncPulse =
    (((reader.u8OrZero(dtdOffset + 11) >> HOR_SYNC_PULSE_OFF) &
      HOR_SYNC_PULSE_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 9);

  const VERT_SYNC_OFF_TOP_OFF = 2;
  const VERT_SYNC_OFF_TOP_MASK = 0x03;
  const VERT_SYNC_OFF_BOT_OFF = 4;
  const VERT_SYNC_OFF_BOT_MASK = 0x0f;
  dtd.vertSyncOff =
    (((reader.u8OrZero(dtdOffset + 11) >> VERT_SYNC_OFF_TOP_OFF) &
      VERT_SYNC_OFF_TOP_MASK) <<
      4) |
    ((reader.u8OrZero(dtdOffset + 10) >> VERT_SYNC_OFF_BOT_OFF) &
      VERT_SYNC_OFF_BOT_MASK);

  const VERT_SYNC_PULSE_TOP_MASK = 0x03;
  const VERT_SYNC_PULSE_BOT_MASK = 0x0f;
  dtd.vertSyncPulse =
    ((reader.u8OrZero(dtdOffset + 11) & VERT_SYNC_PULSE_TOP_MASK) << 4) |
    (reader.u8OrZero(dtdOffset + 10) & VERT_SYNC_PULSE_BOT_MASK);

  const HOR_DISPLAY_TOP_OFF = 4;
  const HOR_DISPLAY_TOP_MASK = 0x0f;
  dtd.horDisplaySize =
    (((reader.u8OrZero(dtdOffset + 14) >> HOR_DISPLAY_TOP_OFF) &
      HOR_DISPLAY_TOP_MASK) <<
      8) |
    reader.u8OrZero(dtdOffset + 12);

  const VERT_DISPLAY_TOP_MASK = 0x0f;
  dtd.vertDisplaySize =
    ((reader.u8OrZero(dtdOffset + 14) & VERT_DISPLAY_TOP_MASK) << 8) |
    reader.u8OrZero(dtdOffset + 13);

  dtd.horBorderPixels = reader.u8OrZero(dtdOffset + 15);
  dtd.vertBorderLines = reader.u8OrZero(dtdOffset + 16);

  const INTERLACED_MASK = 0x80;
  dtd.interlaced =
    reader.u8OrZero(dtdOffset + 17) & INTERLACED_MASK ? true : false;

  const STEREO_MODE_OFFSET = 5;
  const STEREO_MODE_MASK = 0x03;
  dtd.stereoMode =
    (reader.u8OrZero(dtdOffset + 17) >> STEREO_MODE_OFFSET) & STEREO_MODE_MASK;

  const SYNC_TYPE_OFFSET = 3;
  const SYNC_TYPE_MASK = 0x03;
  dtd.syncType =
    (reader.u8OrZero(dtdOffset + 17) >> SYNC_TYPE_OFFSET) & SYNC_TYPE_MASK;

  if (dtd.syncType === SYNC_TYPE_ENUM.DIGITAL_SEPARATE) {
    const VSYNC_POLARITY_MASK = 0x04;
    dtd.vSyncPolarity =
      reader.u8OrZero(dtdOffset + 17) & VSYNC_POLARITY_MASK ? true : false;
  } else {
    const VSYNC_SERRATED_MASK = 0x04;
    dtd.vSyncSerrated =
      reader.u8OrZero(dtdOffset + 17) & VSYNC_SERRATED_MASK ? true : false;
  }

  if (
    dtd.syncType === SYNC_TYPE_ENUM.ANALOG_COMPOSITE ||
    dtd.syncType === SYNC_TYPE_ENUM.BIPOLAR_ANALOG_COMPOSITE
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
    length: 0,
    shortAudioDescriptors: [],
  };

  const SHORT_AUDIO_DESC_LENGTH = 3;
  const numberShortAudioDescriptors = blockLength / SHORT_AUDIO_DESC_LENGTH;
  let shortAudDescIndex = 0;
  let index = startAddress;

  audioBlock.length = numberShortAudioDescriptors;

  const SHORT_AUDIO_DESC_MASK = 0x0f;
  const SHORT_AUDIO_DESC_OFF = 3;
  const MAX_CHANNELS_MASK = 0x07;
  const SAMPLE_RATE_MASK = 0x7f;

  while (shortAudDescIndex < numberShortAudioDescriptors) {
    const shortAudDesc: ShortAudioDescriptor = {};
    const byte0 = reader.u8OrZero(index);
    const byte1 = reader.u8OrZero(index + 1);
    const byte2 = reader.u8OrZero(index + 2);

    shortAudDesc.format =
      (byte0 >> SHORT_AUDIO_DESC_OFF) & SHORT_AUDIO_DESC_MASK;
    shortAudDesc.maxChannels = (byte0 & MAX_CHANNELS_MASK) + 1;
    shortAudDesc.sampleRates = byte1 & SAMPLE_RATE_MASK;

    const audioFormat0 = AUDIO_FORMAT_ARRAY[0];
    const audioFormat1 = AUDIO_FORMAT_ARRAY[1];
    const audioFormat2 = AUDIO_FORMAT_ARRAY[2];
    const audioFormat3 = AUDIO_FORMAT_ARRAY[3];
    const audioFormat4 = AUDIO_FORMAT_ARRAY[4];
    const format = shortAudDesc.format ?? 0;

    if (format <= audioFormat0) {
      const BIT_DEPTH_MASK = 0x07;
      shortAudDesc.bitDepth = byte2 & BIT_DEPTH_MASK;
    } else if (format <= audioFormat1) {
      const MAX_BIT_RATE_MASK = 0xff;
      shortAudDesc.bitRate = (byte2 & MAX_BIT_RATE_MASK) * 8;
    } else if (format <= audioFormat2) {
      const AUDIO_FORMAT_CODE_MASK = 0xff;
      shortAudDesc.audioFormatCode = byte2 & AUDIO_FORMAT_CODE_MASK;
    } else if (format <= audioFormat3) {
      const PROFILE_MASK = 0x07;
      shortAudDesc.profile = byte2 & PROFILE_MASK;
    } else if (format <= audioFormat4) {
      const FORMAT_CODE_EXT_OFF = 3;
      const FORMAT_CODE_EXT_MASK = 0x1f;
      shortAudDesc.formatCodeExt =
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
    length: blockLength,
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
      shortVideoDescriptor.nativeResolution = false;
    } else {
      shortVideoDescriptor.vic = dataByte & LOW_VIC_MASK;
      shortVideoDescriptor.nativeResolution =
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
    vendorBlock.deepColor48 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_48_MASK
        ? true
        : false;
    const DEEP_COLOR_36_MASK = 0x20;
    vendorBlock.deepColor36 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_36_MASK
        ? true
        : false;
    const DEEP_COLOR_30_MASK = 0x10;
    vendorBlock.deepColor30 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_30_MASK
        ? true
        : false;
    const DEEP_COLOR_Y444_MASK = 0x08;
    vendorBlock.deepColorY444 =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DEEP_COLOR_Y444_MASK
        ? true
        : false;
    const DUAL_DVI_MASK = 0x01;
    vendorBlock.dualDvi =
      reader.u8OrZero(vsdbAddress + AI_DC_DUAL_ADDRESS) & DUAL_DVI_MASK
        ? true
        : false;
  }

  const MAX_TMDS_CLOCK_ADDRESS = 7;
  if (blockLength >= MAX_TMDS_CLOCK_ADDRESS) {
    vendorBlock.maxTmdsRate =
      reader.u8OrZero(vsdbAddress + MAX_TMDS_CLOCK_ADDRESS) * 5;
  }

  const LATENCY_PRESENT_ADDRESS = 8;
  if (blockLength >= LATENCY_PRESENT_ADDRESS) {
    const latencyFlags = reader.u8OrZero(vsdbAddress + LATENCY_PRESENT_ADDRESS);
    const LATENCY_FIELDS_PRESENT_MASK = 0x80;
    vendorBlock.latencyPresent =
      latencyFlags & LATENCY_FIELDS_PRESENT_MASK ? true : false;

    const I_LATENCY_FIELDS_PRESENT_MASK = 0x40;
    vendorBlock.iLatencyPresent =
      vendorBlock.latencyPresent && latencyFlags & I_LATENCY_FIELDS_PRESENT_MASK
        ? true
        : false;
  }

  const AUDIO_LATENCY_ADDRESS = 10;
  if (vendorBlock.latencyPresent && blockLength >= AUDIO_LATENCY_ADDRESS) {
    const VIDEO_LATENCY_ADDRESS = 9;
    vendorBlock.videoLatency =
      (reader.u8OrZero(vsdbAddress + VIDEO_LATENCY_ADDRESS) - 1) * 2;
    vendorBlock.audioLatency =
      (reader.u8OrZero(vsdbAddress + AUDIO_LATENCY_ADDRESS) - 1) * 2;
  }

  const I_VIDEO_LATENCY_ADDRESS = 11;
  const I_AUDIO_LATENCY_ADDRESS = 12;
  if (vendorBlock.iLatencyPresent && blockLength >= I_AUDIO_LATENCY_ADDRESS) {
    vendorBlock.iVideoLatency =
      (reader.u8OrZero(vsdbAddress + I_VIDEO_LATENCY_ADDRESS) - 1) * 2;
    vendorBlock.iAudioLatency =
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
  vendorBlock.versionHF = reader.u8OrZero(vsdbAddress + FIELD_ADDRESS);

  FIELD_ADDRESS = 5;
  vendorBlock.maxTmdsRateHF = reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) * 5;

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
  vendorBlock.deepColorY420_48 =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 7;
  FIELD_MASK = 0x02;
  vendorBlock.deepColorY420_36 =
    reader.u8OrZero(vsdbAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 7;
  FIELD_MASK = 0x01;
  vendorBlock.deepColorY420_30 =
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

  vendorBlock.version = dataByte(3);
  vendorBlock.maxTMDSCharacterRate = dataByte(4) * 5;

  if (dataByte(5) & 0x80) {
    vendorBlock.hdmiForumFeatures.scdcPresent = true;
  }
  if (dataByte(5) & 0x40) {
    vendorBlock.hdmiForumFeatures.scdcReadRequestCapable = true;
  }
  vendorBlock.supportsSCDC = vendorBlock.hdmiForumFeatures.scdcPresent === true;
  vendorBlock.supportsSCDCRR =
    vendorBlock.hdmiForumFeatures.scdcReadRequestCapable === true;
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
    vendorBlock.hdmiForumFeatures.supportsMdelta = true;
  }
  if (dataByte(7) & 0x10) {
    vendorBlock.hdmiForumFeatures.supportsCinemaVRR = true;
  }
  if (dataByte(7) & 0x08) {
    vendorBlock.hdmiForumFeatures.supportsNegativeMvrr = true;
  }
  if (dataByte(7) & 0x04) {
    vendorBlock.hdmiForumFeatures.supportsFastVactive = true;
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
      vendorBlock.vrrMin = vrrMin;
    }
    if (vrrMax > 0) {
      vendorBlock.vrrMax = vrrMax;
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
    length: blockLength,
  };

  const vsdbAddress = startAddress - 1;
  const IEEE_REG_IDENTIFIER_1 = 1;
  const IEEE_REG_IDENTIFIER_2 = 2;
  const IEEE_REG_IDENTIFIER_3 = 3;
  vendorBlock.ieeeIdentifier =
    (reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_3) << 16) |
    (reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_2) << 8) |
    reader.u8OrZero(vsdbAddress + IEEE_REG_IDENTIFIER_1);

  if (vendorBlock.ieeeIdentifier === IEEE_OUI_TYPE.HDMI14.value) {
    return parseVendorDataBlockHDMI14(
      reader,
      startAddress,
      blockLength,
      vendorBlock,
    );
  }

  if (vendorBlock.ieeeIdentifier === IEEE_OUI_TYPE.HDMI_FORUM.value) {
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
  extendedTagBlock.quantizationRangeYCC =
    reader.u8OrZero(startAddress + FIELD_ADDRESS) & FIELD_MASK ? true : false;

  FIELD_ADDRESS = 1;
  FIELD_MASK = 0x40;
  extendedTagBlock.quantizationRangeRGB =
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
    extendedTagBlock.supportsCINEMAVRR =
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
      shortVideoDescriptor.nativeResolution = false;
    } else {
      shortVideoDescriptor.vic = dataByte & LOW_VIC_MASK;
      shortVideoDescriptor.nativeResolution =
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
    length: blockLength,
    payload: 0,
  };

  speakerBlock.payload =
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

  for (let i = 0; i < EOTF_TYPES.length; i++) {
    if (eotfByte & (1 << i)) {
      const eotfType = EOTF_TYPES[i];
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
      extendedTagBlock.desiredContentMaxLuminance = maxLum;
    }
    const maxFrameAvgLum = reader.u8(startAddress + 4);
    if (maxFrameAvgLum !== undefined) {
      extendedTagBlock.desiredContentMaxFrameAverageLuminance = maxFrameAvgLum;
    }
  }

  if (blockLength >= 5) {
    const minLum = reader.u8(startAddress + 5);
    if (minLum !== undefined) {
      extendedTagBlock.desiredContentMinLuminance = minLum;
    }
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

  extendedTagBlock.supportedMetadataTypes = [];

  const metadataType = reader.u8OrZero(startAddress + 1);
  extendedTagBlock.metadataTypeId = metadataType;

  if (metadataType === 1) {
    extendedTagBlock.supportedMetadataTypes.push('SMPTE ST 2094-10');
  } else if (metadataType === 2) {
    extendedTagBlock.supportedMetadataTypes.push('SMPTE ST 2094-20');
  } else if (metadataType === 3) {
    extendedTagBlock.supportedMetadataTypes.push('SMPTE ST 2094-30');
  } else if (metadataType === 4) {
    extendedTagBlock.supportedMetadataTypes.push('SMPTE ST 2094-40');
  }

  extendedTagBlock.metadataVersionNumber = reader.u8OrZero(startAddress + 2);

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
    const preference: VideoFormatPreference = { svr: 0, frr: 0 };
    const dataByte = reader.u8OrZero(startAddress + i);

    preference.svr = dataByte & 0x3f;
    preference.frr = (dataByte & 0xc0) >> 6;

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
  extendedTagBlock.roomType = (configByte & 0x60) >> 5;

  const roomTypes = [
    'Not indicated',
    'Front Height',
    'Rear Height',
    'Reserved',
  ];
  extendedTagBlock.roomTypeString = roomTypes[extendedTagBlock.roomType];

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

  extendedTagBlock.version = dataByte(1);
  extendedTagBlock.maxTMDSCharacterRate = dataByte(2) * 5;

  extendedTagBlock.hdmiForumFeatures = {};

  if (blockLength > 3) {
    if (dataByte(3) & 0x80) {
      extendedTagBlock.hdmiForumFeatures.scdcPresent = true;
    }
    if (dataByte(3) & 0x40) {
      extendedTagBlock.hdmiForumFeatures.scdcReadRequestCapable = true;
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
      extendedTagBlock.hdmiForumFeatures.supportsMdelta = true;
    }
    if (dataByte(5) & 0x10) {
      extendedTagBlock.hdmiForumFeatures.supportsCinemaVRR = true;
    }
    if (dataByte(5) & 0x08) {
      extendedTagBlock.hdmiForumFeatures.supportsNegativeMvrr = true;
    }
    if (dataByte(5) & 0x04) {
      extendedTagBlock.hdmiForumFeatures.supportsFastVactive = true;
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
      extendedTagBlock.vrrMin = vrrMin;
    }
    if (vrrMax > 0) {
      extendedTagBlock.vrrMax = vrrMax;
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
    length: blockLength,
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
  extBlock: ExtBlock,
  context: ExtensionParseContext,
  warnings: ParsedEdidWarning[],
): Array<DataBlock | undefined> {
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
  const dataBlockCollection: Array<DataBlock | undefined> = [];

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

    let dataBlock: DataBlock | undefined;

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
        primaryVideoBlock.length += parsedVideoBlock.length;
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

function parseBaseBlock(
  reader: BlockReader,
  ctx: ReadContext,
): ParsedBaseEdidBlock {
  const baseBlock: ParsedBaseEdidBlock = {
    rawBytes: ctx.bytes.slice(0, EDID_BLOCK_LENGTH),
  };

  baseBlock.headerValid = validateHeader(reader);
  baseBlock.headerValidity = baseBlock.headerValid ? 'OK' : 'ERROR';

  baseBlock.vendorId = getVendorId(reader);
  baseBlock.productCode = getProductCode(reader);
  baseBlock.serialNumber = getSerialNumber(reader);

  baseBlock.manufactureWeek = getManufactureWeek(reader);
  baseBlock.manufactureYear = getManufactureYear(reader);
  if (baseBlock.manufactureWeek && baseBlock.manufactureYear) {
    baseBlock.manufactureDate = `${baseBlock.manufactureWeek}/${baseBlock.manufactureYear}`;
  }

  baseBlock.edidVersion = getEdidVersion(reader);
  baseBlock.edidRevision = getEdidRevision(reader);
  baseBlock.edidVersionString = `${baseBlock.edidVersion}.${baseBlock.edidRevision}`;

  baseBlock.basicDisplayParams = getBasicDisplayParams(reader);
  baseBlock.chromaticity = getChromaticityCoordinates(reader);
  baseBlock.timingBitmap = getTimingBitmap(reader);
  baseBlock.standardDisplayModes = getStandardDisplayModes(reader);

  baseBlock.dtds = getDtds(reader, 54, 126);

  baseBlock.numberOfExtensions = getNumberExtensions(reader);
  baseBlock.checksum = getChecksum(reader);
  baseBlock.checksumValid = validChecksum(ctx, 0, 0);

  return baseBlock;
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
    extTag,
    revisionNumber: revision,
    dtdStart,
    numDtds,
    underscan,
    basicAudio,
    ycbcr444,
    ycbcr422,
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
  extBlock.checksumValid = validChecksum(ctx, extIndex + 1, extIndex + 1);

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
    extTag,
    revisionNumber: revision,
    dtdStart,
    numDtds,
    underscan,
    basicAudio,
    ycbcr444,
    ycbcr422,
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
  extBlock.checksumValid = validChecksum(ctx, extIndex + 1, extIndex + 1);

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
  const baseBlock = parseBaseBlock(baseReader, ctx);

  if (!baseBlock.headerValid) {
    warn(warnings, 'invalid_header', 'EDID header is invalid.', 0, 0);
  }

  if (baseBlock.checksumValid === false) {
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
    if (ext.checksumValid === false) {
      warn(
        warnings,
        'checksum_failed',
        'Extension block checksum failed.',
        ext.blockNumber,
        127,
      );
    }
  }

  const headerValid = baseBlock.headerValid;
  const checksumValid = baseBlock.checksumValid;

  const summary: ParsedEdidSummary = {
    validHeader: baseBlock.headerValidity,
    vendorId: baseBlock.vendorId,
    productCode: baseBlock.productCode,
    serialNumber: baseBlock.serialNumber,
    manufactureDate: baseBlock.manufactureDate,
    edidVersion: baseBlock.edidVersionString,
    numberOfExtensions: baseBlock.numberOfExtensions,
    checksum: baseBlock.checksum,
  };

  const legacyExts: ExtBlock[] = extensions.map((ext) => {
    return {
      blockNumber: ext.blockNumber,
      extTag: ext.extTag,
      revisionNumber: ext.revisionNumber,
      dtdStart: ext.dtdStart,
      numDtds: ext.numDtds,
      underscan: ext.underscan,
      basicAudio: ext.basicAudio,
      ycbcr444: ext.ycbcr444,
      ycbcr422: ext.ycbcr422,
      dataBlockCollection: ext.dataBlockCollection,
      dtds: ext.dtds,
      checksum: ext.checksum,
    };
  });

  const debug: ParsedEdidDebug = {
    legacy: {
      validHeader: baseBlock.headerValidity,
      vendorId: baseBlock.vendorId,
      productCode: baseBlock.productCode,
      serialNumber: baseBlock.serialNumber,
      manufactureDate: baseBlock.manufactureDate,
      edidVersion: baseBlock.edidVersionString,
      bdp: baseBlock.basicDisplayParams,
      chromaticity: baseBlock.chromaticity,
      timingBitmap: baseBlock.timingBitmap,
      standardDisplayModes: baseBlock.standardDisplayModes,
      dtds: baseBlock.dtds,
      numberOfExtensions: baseBlock.numberOfExtensions,
      checksum: baseBlock.checksum,
      exts: legacyExts,
      videoBlock: extensionContext.lastVideoBlock,
    },
  };

  return {
    bytes,
    warnings,
    headerValid,
    checksumValid,
    expectedExtensionCount,
    baseBlock,
    extensions,
    summary,
    debug,
  };
}

// #endregion - Public API

////////////////////////////////////////////////////////////////////////////////
