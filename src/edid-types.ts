/**
 * @license MIT
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type { Tagged, ValueOf } from 'type-fest';

////////////////////////////////////////////////////////////////////////////////

// #region - Data Blocks

export interface ReservedDataBlock {
  tag: { string: 'RESERVED'; value: 0 };
}

export interface AudioDataBlock {
  tag: { string: 'AUDIO'; value: 1 };
  dataLength: number;
  length: number;
  shortAudioDescriptors: ShortAudioDescriptor[];
}

export interface VideoDataBlock {
  tag: { string: 'VIDEO'; value: 2 };
  length: number;
  shortVideoDescriptors: ShortVideoDescriptor[];
}

export interface SpeakerDataBlock {
  tag: { string: 'SPEAKER ALLOCATION'; value: 4 };
  length: number;
  payload: number;
}

export interface VendorDataBlock {
  tag: { string: 'VENDOR SPECIFIC'; value: 3 };
  length: number;
  ieeeIdentifier?: number;
  physicalAddress?: number;
  supportsAI?: boolean;
  deepColor48?: boolean;
  deepColor36?: boolean;
  deepColor30?: boolean;
  deepColorY444?: boolean;
  dualDvi?: boolean;
  maxTmdsRate?: number;
  latencyPresent?: boolean;
  iLatencyPresent?: boolean;
  videoLatency?: number;
  audioLatency?: number;
  iVideoLatency?: number;
  iAudioLatency?: number;
  versionHF?: number;
  maxTmdsRateHF?: number;
  supportsSCDC?: boolean;
  supportsSCDCRR?: boolean;
  supportsLTE340scramble?: boolean;
  supports3DIV?: boolean;
  supports3DDV?: boolean;
  supports3DOSD?: boolean;
  deepColorY420_48?: boolean;
  deepColorY420_36?: boolean;
  deepColorY420_30?: boolean;
  hdmiForumFeatures?: HdmiForumFeatures;
  version?: number;
  maxTMDSCharacterRate?: number;
  maxFixedRateLink?: string;
  vrrMin?: number;
  vrrMax?: number;
  error?: string;
}

export type UnknownExtendedDataBlockTypeValue = Tagged<
  number,
  'UnknownExtendedDataBlockTypeValue'
>;

export interface DataBlockTypeMap {
  readonly RESERVED: {
    readonly string: 'RESERVED';
    readonly value: 0;
  };
  readonly AUDIO: {
    readonly string: 'AUDIO';
    readonly value: 1;
  };
  readonly VIDEO: {
    readonly string: 'VIDEO';
    readonly value: 2;
  };
  readonly VENDOR_SPECIFIC: {
    readonly string: 'VENDOR SPECIFIC';
    readonly value: 3;
  };
  readonly SPEAKER_ALLOCATION: {
    readonly string: 'SPEAKER ALLOCATION';
    readonly value: 4;
  };
  readonly EXTENDED_TAG: {
    readonly string: 'EXTENDED TAG';
    readonly value: 7;
  };
}

export interface ExtendedDataBlockTypeMap {
  readonly VIDEO_CAPABILITY: {
    readonly string: 'VIDEO CAPABILITY';
    readonly value: 0;
  };
  readonly VENDOR_SPECIFIC_VIDEO: {
    readonly string: 'VENDOR SPECIFIC VIDEO';
    readonly value: 1;
  };
  readonly VESA_VIDEO_DISPLAY_DEVICE: {
    readonly string: 'VESA VIDEO DISPLAY DEVICE';
    readonly value: 2;
  };
  readonly VESA_VIDEO_TIMING_BLOCK: {
    readonly string: 'VESA VIDEO TIMING BLOCK';
    readonly value: 3;
  };
  readonly RESERVED_HDMI_VIDEO: {
    readonly string: 'RESERVED HDMI VIDEO';
    readonly value: 4;
  };
  readonly COLORIMETRY: {
    readonly string: 'COLORIMETRY';
    readonly value: 5;
  };
  readonly HDR_STATIC_METADATA: {
    readonly string: 'HDR STATIC METADATA';
    readonly value: 6;
  };
  readonly HDR_DYNAMIC_METADATA: {
    readonly string: 'HDR DYNAMIC METADATA';
    readonly value: 7;
  };
  readonly NATIVE_VIDEO_RESOLUTION: {
    readonly string: 'NATIVE VIDEO RESOLUTION';
    readonly value: 8;
  };
  readonly VIDEO_FORMAT_PREFERENCE: {
    readonly string: 'VIDEO FORMAT PREFERENCE';
    readonly value: 13;
  };
  readonly YCBCR420_VIDEO: {
    readonly string: 'YCBCR420 VIDEO DATA';
    readonly value: 14;
  };
  readonly YCBCR420_CAPABILITY_MAP: {
    readonly string: 'YCBCR420_CAPABILITY_MAP';
    readonly value: 15;
  };
  readonly MISC_AUDIO_FIELDS: {
    readonly string: 'MISC AUDIO FIELDS';
    readonly value: 16;
  };
  readonly VENDOR_SPECIFIC_AUDIO: {
    readonly string: 'VENDOR SPECIFIC AUDIO';
    readonly value: 17;
  };
  readonly HDMI_AUDIO: {
    readonly string: 'HDMI AUDIO';
    readonly value: 18;
  };
  readonly ROOM_CONFIGURATION: {
    readonly string: 'ROOM CONFIGURATION';
    readonly value: 19;
  };
  readonly SPEAKER_LOCATION: {
    readonly string: 'SPEAKER LOCATION';
    readonly value: 20;
  };
  readonly INFOFRAME_DATA: {
    readonly string: 'INFOFRAME DATA';
    readonly value: 32;
  };
  readonly PRODUCT_INFORMATION: {
    readonly string: 'PRODUCT INFORMATION';
    readonly value: 33;
  };
  readonly HDMI_FORUM_SCDB: {
    readonly string: 'HDMI FORUM SCDB';
    readonly value: 0x79;
  };
}

export type ExtendedDataBlockType = ValueOf<ExtendedDataBlockTypeMap>;

export interface ExtendedTagDataBlock {
  tag: { string: 'EXTENDED TAG'; value: 7 };
  length: number;
  extendedTag?: ExtendedDataBlockType | UnknownExtendedDataBlockTypeValue;
  error?: string;
  quantizationRangeYCC?: boolean;
  quantizationRangeRGB?: boolean;
  overscanPT?: string;
  overscanIT?: string;
  overscanCE?: string;
  supportsQMS?: boolean;
  supportsVRR?: boolean;
  supportsCINEMAVRR?: boolean;
  supportsNegativeMRR?: boolean;
  supportsFVA?: boolean;
  supportsALLM?: boolean;
  supportsBT2020RGB?: boolean;
  supportsBT2020YCC?: boolean;
  supportsBT2020cYCC?: boolean;
  supportsAdobeRGB?: boolean;
  supportsAdobeYCC601?: boolean;
  supportssYCC601?: boolean;
  supportsxvYCC709?: boolean;
  supportsxvYCC601?: boolean;
  gamutMD3?: number;
  gamutMD2?: number;
  gamutMD1?: number;
  gamutMD0?: number;
  supportsICtCp?: boolean;
  supportsST2094_40?: boolean;
  supportsST2094_10?: boolean;
  supportsBT2100ICtCp?: boolean;
  YCbCr420OnlyShortVideoDescriptors?: ShortVideoDescriptor[];
  YCbCr420CapableShortVideoDescriptors?: Array<
    ShortVideoDescriptor | undefined
  >;
  supportedEOTFs?: string[];
  supportedStaticMetadataDescriptors?: string[];
  desiredContentMaxLuminance?: number;
  desiredContentMaxFrameAverageLuminance?: number;
  desiredContentMinLuminance?: number;
  supportedMetadataTypes?: string[];
  metadataTypeId?: number;
  metadataVersionNumber?: number;
  videoFormatPreferences?: VideoFormatPreference[];
  speakerCount?: number;
  roomType?: number;
  roomTypeString?: string;
  hdmiForumFeatures?: HdmiForumFeatures;
  version?: number;
  maxTMDSCharacterRate?: number;
  maxFixedRateLink?: string;
  vrrMin?: number;
  vrrMax?: number;
}

export type DataBlock =
  | ReservedDataBlock
  | AudioDataBlock
  | VideoDataBlock
  | VendorDataBlock
  | SpeakerDataBlock
  | ExtendedTagDataBlock;

export interface ExtBlock {
  blockNumber: number;
  extTag: number;
  revisionNumber: number;
  dtdStart: number;
  numDtds: number;
  underscan: boolean;
  basicAudio: boolean;
  ycbcr444: boolean;
  ycbcr422: boolean;
  dataBlockCollection?: Array<DataBlock | undefined>;
  dtds: Dtd[];
  checksum: number;
}

// #endregion - Data Blocks

////////////////////////////////////////////////////////////////////////////////

// #region - Features

export interface ShortVideoDescriptor {
  vic: number;
  format?: string;
  fieldRate?: string;
  pictureAspectRatio?: string;
  pixelAspectRatio?: string;
  nativeResolution?: boolean;
}

export interface ShortAudioDescriptor {
  format?: number;
  maxChannels?: number;
  sampleRates?: number;
  bitDepth?: number;
  bitRate?: number;
  audioFormatCode?: number;
  profile?: number;
  formatCodeExt?: number;
}

export interface BasicDisplayParams {
  digitalInput?: boolean;
  vesaDfpCompatible?: boolean;
  whiteSyncLevels?: number;
  blankToBlack?: boolean;
  separateSyncSupported?: boolean;
  compositeSyncSupported?: boolean;
  synOnGreen?: boolean;
  vsyncSerrated?: boolean;
  maxHorImgSize?: number;
  maxVertImgSize?: number;
  displayGamma?: number;
  dpmsStandby?: boolean;
  dpmsSuspend?: boolean;
  dpmsActiveOff?: boolean;
  displayType?: number;
  standardSRgb?: boolean;
  preferredTiming?: boolean;
  gtfSupported?: boolean;
}

export interface StandardDisplayMode {
  xResolution?: number;
  xyPixelRatio?: number;
  vertFreq?: number;
}

export interface XyPixelRatio {
  string: '16:10' | '4:3' | '5:4' | '16:9';
}

export interface ChromaticityCoordinates {
  redX?: number;
  redXCoords?: number;
  redY?: number;
  redYCoords?: number;
  greenX?: number;
  greenXCoords?: number;
  greenY?: number;
  greenYCoords?: number;
  blueX?: number;
  blueXCoords?: number;
  blueY?: number;
  blueYCoords?: number;
  whiteX?: number;
  whiteXCoords?: number;
  whiteY?: number;
  whiteYCoords?: number;
}

export interface Dtd {
  pixelClock?: number;
  horActivePixels?: number;
  horBlankPixels?: number;
  vertActivePixels?: number;
  vertBlankPixels?: number;
  horSyncOff?: number;
  horSyncPulse?: number;
  vertSyncOff?: number;
  vertSyncPulse?: number;
  horDisplaySize?: number;
  vertDisplaySize?: number;
  horBorderPixels?: number;
  vertBorderLines?: number;
  interlaced?: boolean;
  stereoMode?: number;
  syncType?: number;
  vSyncPolarity?: boolean;
  vSyncSerrated?: boolean;
  syncAllRGBLines?: boolean;
  hSyncPolarity?: boolean;
  twoWayStereo?: boolean;
}

export interface HdmiForumFeatures {
  scdcPresent?: boolean;
  scdcReadRequestCapable?: boolean;
  supportsCableStatus?: boolean;
  supportsColorContentBitsPerComponent?: boolean;
  supportsScrambling340Mcsc?: boolean;
  supports3DIndependentView?: boolean;
  supports3DDualView?: boolean;
  supports3DOSDDisparity?: boolean;
  supportsFAPAEndExtended?: boolean;
  supportsQMS?: boolean;
  supportsMdelta?: boolean;
  supportsCinemaVRR?: boolean;
  supportsNegativeMvrr?: boolean;
  supportsFastVactive?: boolean;
  supportsALLM?: boolean;
  supportsFAPAInBlanking?: boolean;
  supportsVESADSC12a?: boolean;
  supportsCompressedVideo420?: boolean;
  supportsQMSTFRmax?: boolean;
  supportsQMSTFRmin?: boolean;
  supportsCompressedVideoAnyBpp?: boolean;
  supports16bpcCompressedVideo?: boolean;
  supports12bpcCompressedVideo?: boolean;
  supports10bpcCompressedVideo?: boolean;
}

export interface VideoFormatPreference {
  svr: number;
  frr: number;
}

// #endregion - Features

////////////////////////////////////////////////////////////////////////////////

// #region - Parsed

export interface IeeeOuiTypeMap {
  readonly HDMI14: {
    readonly string: 'HDMI14';
    readonly value: 3075;
  };
  readonly HDMI20: {
    readonly string: 'HDMI20';
    readonly value: 12869080;
  };
  readonly HDMI_FORUM: {
    readonly string: 'HDMI FORUM';
    readonly value: 12869080;
  };
}

export type ParsedEdidWarningCode =
  | 'length_not_multiple_of_128'
  | 'too_short'
  | 'invalid_header'
  | 'checksum_failed'
  | 'extension_count_mismatch'
  | 'unknown_extension_tag'
  | 'unknown_data_block'
  | 'parse_error'
  | 'out_of_range_read'
  | 'other';

export interface ParsedEdidWarning {
  code: ParsedEdidWarningCode;
  message: string;
  blockIndex?: number;
  offset?: number;
  detail?: unknown;
}

export interface ParsedBaseEdidBlock {
  rawBytes: Uint8ClampedArray;
  headerValid?: boolean;
  headerValidity?: 'OK' | 'ERROR';
  eisaId?: string;
  productCode?: number;
  serialNumber?: number;
  manufactureWeek?: number;
  manufactureYear?: number;
  manufactureDate?: string;
  edidVersion?: number;
  edidRevision?: number;
  edidVersionString?: string;
  basicDisplayParams?: BasicDisplayParams;
  chromaticity?: ChromaticityCoordinates;
  timingBitmap?: number;
  standardDisplayModes?: StandardDisplayMode[];
  dtds?: Dtd[];
  numberOfExtensions?: number;
  checksum?: number;
  checksumValid?: boolean;
}

export interface ParsedExtensionBlock extends ExtBlock {
  rawBytes: Uint8ClampedArray;
  checksumValid?: boolean;
  extensionType?: 'cta-861' | 'unknown';
}

export interface ParsedEdidSummary {
  validHeader?: 'OK' | 'ERROR';
  eisaId?: string;
  productCode?: number;
  serialNumber?: number;
  manufactureDate?: string;
  edidVersion?: string;
  numberOfExtensions?: number;
  checksum?: number;
}

export interface ParsedEdidDebug {
  tables: {
    whiteAndSyncLevels: string[];
    digitalColorSpace: string[];
    analogColorSpace: string[];
    establishedTimingBitmaps: string[];
    xyPixelRatioEnum: XyPixelRatio[];
    syncTypeEnum: {
      ANALOG_COMPOSITE: number;
      BIPOLAR_ANALOG_COMPOSITE: number;
      DIGITAL_COMPOSITE: number;
      DIGITAL_SEPARATE: number;
    };
    dataBlockType: DataBlockTypeMap;
    extendedDataBlockType: ExtendedDataBlockTypeMap;
    ieeeOuiType: IeeeOuiTypeMap;
    overscanBehavior: string[];
    audioFormatArray: number[];
    shortAudioDescriptors: string[];
    sadSampleRates: string[];
    sadBitDepths: string[];
    eotfTypes: string[];
    staticMetadataDescriptors: string[];
    shortVideoDescriptors: ShortVideoDescriptor[];
    speakerAllocation: string[];
  };
  legacy: {
    validHeader?: 'OK' | 'ERROR';
    eisaId?: string;
    productCode?: number;
    serialNumber?: number;
    manufactureDate?: string;
    edidVersion?: string;
    bdp?: BasicDisplayParams;
    chromaticity?: ChromaticityCoordinates;
    timingBitmap?: number;
    standardDisplayModes?: StandardDisplayMode[];
    dtds?: Dtd[];
    numberOfExtensions?: number;
    checksum?: number;
    exts: ExtBlock[];
    videoBlock?: VideoDataBlock;
  };
}

export interface ParsedEdid {
  bytes: Uint8ClampedArray;
  warnings: ParsedEdidWarning[];
  headerValid?: boolean;
  checksumValid?: boolean;
  expectedExtensionCount?: number;
  baseBlock: ParsedBaseEdidBlock;
  extensions: ParsedExtensionBlock[];
  summary?: ParsedEdidSummary;
  debug?: ParsedEdidDebug;
}

// #endregion - Parsed

////////////////////////////////////////////////////////////////////////////////
