/**
 * @license MIT
 * Copyright (c) 2026 Andrew C. Dvorak <andy@andydvorak.net>
 */

import type { LiteralUnion, Tagged, ValueOf } from 'type-fest';

import type { MergedVendorId } from '../../gen/vids/merged-vid-types';
import type { VendorInfo } from '../vids/vendor-types';

////////////////////////////////////////////////////////////////////////////////

// #region - Data Blocks

/**
 * Placeholder for a CTA-861 Data Block with a reserved/undefined tag value.
 *
 * Used when an EDID CTA extension contains a tag the spec doesn't define.
 */
export interface ReservedDataBlock {
  tag: { string: 'RESERVED'; value: 0 };
}

/**
 * CTA-861 Audio Data Block (ADB) from an EDID CTA extension.
 *
 * Describes the display's supported audio formats and capabilities via
 * {@link ShortAudioDescriptor} entries.
 */
export interface AudioDataBlock {
  tag: { string: 'AUDIO'; value: 1 };

  /**
   * Length of the Audio Data Block payload in bytes (excluding the 1-byte CTA
   * data block header).
   */
  dataLength: number;

  /**
   * Audio formats and channel/sampling capabilities the display advertises it
   * can accept.
   */
  shortAudioDescriptors: ShortAudioDescriptor[];
}

/**
 * CTA-861 Video Data Block (VDB) from an EDID CTA extension.
 *
 * Lists supported video timings using {@link ShortVideoDescriptor} (VIC-based)
 * entries.
 */
export interface VideoDataBlock {
  tag: { string: 'VIDEO'; value: 2 };

  /**
   * Length of the Video Data Block payload in bytes (each byte is one
   * {@link ShortVideoDescriptor} / VIC entry).
   */
  dataLength: number;

  /**
   * Video modes the display advertises via CTA-861 Video Identification Codes
   * (VICs).
   */
  shortVideoDescriptors: ShortVideoDescriptor[];
}

/**
 * CTA-861 Speaker Allocation Data Block.
 *
 * A bitfield describing which speaker positions are supported for multichannel
 * audio (e.g. front/center/LFE/surround).
 */
export interface SpeakerDataBlock {
  tag: { string: 'SPEAKER ALLOCATION'; value: 4 };

  /** Length of the Speaker Allocation Data Block payload in bytes. */
  dataLength: number;

  /**
   * Bitfield of supported speaker positions (front/center/LFE/surround, etc),
   * used to describe multichannel audio layouts.
   */
  layoutBitmask: number;
}

/**
 * CTA-861 Vendor Specific Data Block (VSDB) from an EDID CTA extension.
 *
 * Most commonly used for HDMI/HDMI Forum signaling (deep color, TMDS rates,
 * latency fields, VRR/QMS, SCDC, etc).
 */
export interface VendorDataBlock {
  tag: { string: 'VENDOR SPECIFIC'; value: 3 };

  /** Length of the Vendor Specific Data Block payload in bytes. */
  dataLength: number;

  /**
   * IEEE OUI that identifies which vendor-defined payload format is present
   * (most commonly HDMI Licensing and/or the HDMI Forum).
   */
  ieeeOui?: number;

  /**
   * HDMI "physical address" used for CEC routing (A.B.C.D), when present.
   *
   * This helps devices map an HDMI port to its position in a CEC topology.
   */
  physicalAddress?: number;

  /**
   * HDMI VSDB flag indicating support for the HDMI "AI" capability bit.
   *
   * Rarely used in practice, but included for completeness.
   */
  supportsAI?: boolean;

  /** Supports HDMI deep color at 16 bits per component (48-bit color). */
  supportsDeepColor48?: boolean;

  /** Supports HDMI deep color at 12 bits per component (36-bit color). */
  supportsDeepColor36?: boolean;

  /** Supports HDMI deep color at 10 bits per component (30-bit color). */
  supportsDeepColor30?: boolean;

  /** Supports deep color when using YCbCr 4:4:4 input. */
  supportsDeepColorY444?: boolean;

  /**
   * Legacy flag indicating support for dual-link DVI signaling
   * (higher-bandwidth DVI modes).
   */
  supportsDualLinkDvi?: boolean;

  /**
   * Maximum TMDS clock rate (in MHz, 5 MHz steps) advertised by the sink.
   *
   * Higher TMDS rates generally enable higher resolutions/refresh rates over
   * HDMI (when not using FRL).
   *
   * This field is effectively the same underlying value as
   * {@link hdmi20MaxTmdsRateMhz}; the two fields are simply populated
   * from different parsing paths depending on the VSDB payload.
   */
  hdmi14MaxTmdsRateMhz?: number;

  /**
   * True if the optional A/V latency (lip-sync) fields are present in this
   * vendor block.
   */
  areProgressiveLatencyFieldsPresent?: boolean;

  /** True if the interlaced-content latency fields are present. */
  areInterlacedLatencyFieldsPresent?: boolean;

  /**
   * Reported video processing latency for progressive content (milliseconds).
   *
   * Useful for A/V sync calculations (lip-sync).
   */
  progressiveVideoLatencyMs?: number;

  /**
   * Reported audio processing latency for progressive content (milliseconds).
   *
   * Useful for A/V sync calculations (lip-sync).
   */
  progressiveAudioLatencyMs?: number;

  /** Video latency for interlaced content (milliseconds), when provided. */
  interlacedVideoLatencyMs?: number;

  /** Audio latency for interlaced content (milliseconds), when provided. */
  interlacedAudioLatencyMs?: number;

  /**
   * HDMI Forum/2.0-era vendor payload version (raw byte value).
   *
   * This field is effectively the same underlying "first bytes after the OUI"
   * value as {@link hfPayloadVersion}; the two fields are simply populated
   * from different parsing paths depending on the VSDB payload.
   */
  hdmi20PayloadVersion?: number;

  /**
   * Maximum TMDS rate (in MHz, 5 MHz steps) from HDMI Forum/2.0-era vendor
   * payloads.
   *
   * This field is effectively the same underlying value as
   * {@link hdmi14MaxTmdsRateMhz}; the two fields are simply populated
   * from different parsing paths depending on the VSDB payload.
   */
  hdmi20MaxTmdsRateMhz?: number;

  /**
   * Supports HDMI SCDC (Status and Control Data Channel), used for scrambling
   * and high-bandwidth TMDS link management (HDMI 2.0+).
   */
  supportsSCDC?: boolean;

  /** Supports SCDC read request / status updates (link monitoring). */
  supportsSCDCRR?: boolean;

  /**
   * Supports TMDS scrambling at or below 340 MHz (i.e. scrambling is allowed on
   * "lower" bandwidth TMDS links).
   */
  supportsLTE340scramble?: boolean;

  /** HDMI 3D capability flag: Independent View. */
  supports3DIV?: boolean;

  /** HDMI 3D capability flag: Dual View. */
  supports3DDV?: boolean;

  /** HDMI 3D capability flag: OSD Disparity. */
  supports3DOSD?: boolean;

  /**
   * Supports HDMI "Game" content-type signaling (CNC3).
   *
   * This hints that the sink can apply game-oriented video processing behavior.
   */
  supportsGameContentType?: boolean;

  /** Supports YCbCr 4:2:0 deep color at 16 bits per component. */
  supportsDeepColorY420_48?: boolean;

  /** Supports YCbCr 4:2:0 deep color at 12 bits per component. */
  supportsDeepColorY420_36?: boolean;

  /** Supports YCbCr 4:2:0 deep color at 10 bits per component. */
  supportsDeepColorY420_30?: boolean;

  /**
   * Decoded HDMI Forum feature flags (QMS/VRR/ALLM/DSC, etc) when an HDMI Forum
   * payload is present.
   */
  hdmiForumFeatures?: HdmiForumFeatures;

  /**
   * HDMI Forum vendor payload version (raw byte value).
   *
   * This field is effectively the same underlying "first bytes after the OUI"
   * value as {@link hdmi20PayloadVersion}; the two fields are simply populated
   * from different parsing paths depending on the VSDB payload.
   */
  hfPayloadVersion?: number;

  /**
   * Maximum TMDS character rate (in MHz, 5 MHz steps) from HDMI Forum payloads.
   */
  maxTMDSCharacterRateMhz?: number;

  /**
   * Maximum Fixed Rate Link (FRL) capability, as a human-friendly string.
   *
   * FRL is an HDMI 2.1 link mode used for very high bandwidth.
   */
  maxFixedRateLink?: string;

  /** Minimum VRR refresh rate in Hz, when advertised by an HDMI Forum payload. */
  vrrMinHz?: number;

  /** Maximum VRR refresh rate in Hz, when advertised by an HDMI Forum payload. */
  vrrMaxHz?: number;

  /**
   * Indicates Dolby Vision signaling was detected from a Dolby OUI
   * (`0x00d046`) vendor-specific payload.
   *
   * A display can advertise support for Dolby Vision in two different places:
   * the {@link VendorDataBlock} and
   * {@link ExtendedTagDataBlock.supportsDolbyVision}.
   */
  supportsDolbyVision?: boolean;

  /** Human-readable parse error (when the vendor payload is malformed). */
  error?: string;
}

/**
 * Branded numeric value for an unrecognized CTA-861 Extended Tag.
 *
 * Keeps "unknown" tag values type-distinct from known {@link ExtendedDataBlockType}s.
 */
export type UnknownExtendedDataBlockTypeValue = Tagged<
  number,
  'UnknownExtendedDataBlockTypeValue'
>;

/**
 * Lookup map of CTA-861 Data Block tag values to friendly names.
 *
 * Used for building discriminated unions and for readable parser output.
 */
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

/**
 * Lookup map of CTA-861 "Extended Tag" values to friendly names.
 *
 * Extended tags are used inside the CTA-861 Extended Tag Data Block (tag 7) to
 * indicate what kind of payload follows (HDR, colorimetry, VRR, etc).
 */
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

/**
 * Union of the known CTA-861 extended-tag descriptors in
 * {@link ExtendedDataBlockTypeMap}.
 */
export type ExtendedDataBlockType = ValueOf<ExtendedDataBlockTypeMap>;

/**
 * Human-friendly label for an Electro-Optical Transfer Function (EOTF).
 *
 * An EOTF is a non-linear formula used in displays (TVs, monitors) to convert
 * digital video signals into specific, linear light output (nits/brightness).
 *
 * It acts as the final step in the imaging chain, mapping encoded data to
 * actual brightness, particularly critical for HDR content
 * (e.g., SMPTE ST 2084/PQ).
 */
export type EotfLabel =
  | 'Traditional gamma - SDR luminance range'
  | 'Traditional gamma - HDR luminance range'
  | 'SMPTE ST2084 (PQ)'
  | 'Hybrid Log-Gamma (HLG)';

/** Human-friendly label for a static metadata descriptor. */
export type StaticMetaDescLabel = 'Static Metadata Type 1';

/**
 * CTA-861 Extended Tag Data Block (tag 7) from an EDID CTA extension.
 *
 * This type is a superset of fields used by several extended-tag payloads;
 * which fields are meaningful depends on {@link extendedTag}.
 */
export interface ExtendedTagDataBlock {
  tag: { string: 'EXTENDED TAG'; value: 7 };

  /**
   * Length of the Extended Tag Data Block payload in bytes (including the
   * 1-byte {@link extendedTag} code).
   */
  dataLength: number;

  /**
   * Identifies what kind of extended payload this is (HDR, colorimetry, VRR,
   * etc).
   */
  extendedTag?: ExtendedDataBlockType | UnknownExtendedDataBlockTypeValue;

  /** Human-readable parse error (when the payload is malformed). */
  error?: string;

  /** Supports selectable YCbCr quantization range (limited vs full). */
  supportsQuantizationRangeYCC?: boolean;

  /** Supports selectable RGB quantization range (limited vs full). */
  supportsQuantizationRangeRGB?: boolean;

  /**
   * Overscan/underscan behavior hint for the display's "preferred timing"
   * (typically PC-style formats).
   */
  overscanPT?: string;

  /** Overscan/underscan behavior hint for IT (video) formats. */
  overscanIT?: string;

  /** Overscan/underscan behavior hint for CE (consumer-electronics) formats. */
  overscanCE?: string;

  /** Supports QMS (Quick Media Switching) to reduce HDMI mode-change blanking. */
  supportsQMS?: boolean;

  /** Supports VRR (Variable Refresh Rate). */
  supportsVRR?: boolean;

  /** Supports "Cinema VRR" (VRR for film-rate content) when advertised. */
  supportsCinemaVRR?: boolean;

  /** Supports negative MRR (a VRR-related capability) when advertised. */
  supportsNegativeMRR?: boolean;

  /**
   * Supports FVA (Fast VActive / Quick Frame Transport), which can reduce
   * latency by shortening the transport time of the active video region.
   */
  supportsFVA?: boolean;

  /** Supports ALLM (Auto Low Latency Mode). */
  supportsALLM?: boolean;

  /** Advertises BT.2020 colorimetry support for RGB input. */
  supportsBT2020RGB?: boolean;

  /** Advertises BT.2020 colorimetry support for YCbCr input. */
  supportsBT2020YCC?: boolean;

  /** Advertises BT.2020 constant-luminance (cYCC) colorimetry support. */
  supportsBT2020cYCC?: boolean;

  /** Advertises Adobe RGB colorimetry support. */
  supportsAdobeRGB?: boolean;

  /** Advertises Adobe YCC 601 colorimetry support. */
  supportsAdobeYCC601?: boolean;

  /** Advertises sYCC601 colorimetry support. */
  supportssYCC601?: boolean;

  /** Advertises xvYCC709 colorimetry support. */
  supportsxvYCC709?: boolean;

  /** Advertises xvYCC601 colorimetry support. */
  supportsxvYCC601?: boolean;

  /** Gamut Metadata (MD3) support flag (legacy/rarely used). */
  gamutMD3?: number;

  /** Gamut Metadata (MD2) support flag (legacy/rarely used). */
  gamutMD2?: number;

  /** Gamut Metadata (MD1) support flag (legacy/rarely used). */
  gamutMD1?: number;

  /** Gamut Metadata (MD0) support flag (legacy/rarely used). */
  gamutMD0?: number;

  /** Supports ICtCp color encoding (used by BT.2100 HDR workflows). */
  supportsICtCp?: boolean;

  /** Supports dynamic HDR metadata signaling for SMPTE ST 2094-40. */
  supportsST2094_40?: boolean;

  /** Supports dynamic HDR metadata signaling for SMPTE ST 2094-10. */
  supportsST2094_10?: boolean;

  /** Advertises BT.2100 ICtCp (HDR) colorimetry support. */
  supportsBT2100ICtCp?: boolean;

  /**
   * IEEE OUI for a CTA Vendor-Specific Video Data Block payload
   * (extended tag `0x01`), when present.
   */
  vendorSpecificVideoOui?: number;

  /**
   * Indicates support for HDR10, inferred from CTA HDR Static Metadata:
   * PQ EOTF + Static Metadata Type 1 descriptor.
   */
  supportsHDR10?: boolean;

  /**
   * Indicates support for HDR10+, identified via Vendor-Specific Video Data
   * Block OUI `0x90848b` (HDR10+ Technologies).
   */
  supportsHDR10Plus?: boolean;

  /**
   * Indicates Dolby Vision signaling was detected from a Dolby OUI
   * (`0x00d046`) vendor-specific video payload.
   *
   * A display can advertise support for Dolby Vision in two different places:
   * the {@link ExtendedTagDataBlock} and
   * {@link VendorDataBlock.supportsDolbyVision}.
   */
  supportsDolbyVision?: boolean;

  /**
   * Video modes that are only supported when using YCbCr 4:2:0 chroma
   * subsampling (a bandwidth-saving mode used for high-res/high-refresh
   * timings).
   */
  YCbCr420OnlyShortVideoDescriptors?: ShortVideoDescriptor[];

  /**
   * Video modes that can optionally be sent as YCbCr 4:2:0.
   *
   * This is typically aligned to the most recent Video Data Block and may
   * include `undefined` entries where a corresponding VIC is not 4:2:0-capable.
   */
  YCbCr420CapableShortVideoDescriptors?: Array<
    ShortVideoDescriptor | undefined
  >;

  /** HDR transfer functions (EOTFs) the display claims it can handle (PQ, HLG, etc). */
  supportedEOTFs?: EotfLabel[];

  /** HDR static metadata types the display understands (e.g. HDR10/CTA Type 1). */
  supportedStaticMetadataDescriptors?: StaticMetaDescLabel[];

  /**
   * Static HDR metadata hint: desired maximum content luminance (raw CTA-861
   * code, not nits).
   */
  desiredContentMaxLuminanceCode?: number;

  /**
   * Static HDR metadata hint: desired maximum frame-average luminance (raw
   * CTA-861 code, not nits).
   */
  desiredContentMaxFrameAverageLuminanceCode?: number;

  /**
   * Static HDR metadata hint: desired minimum content luminance (raw CTA-861
   * code, not nits).
   */
  desiredContentMinLuminanceCode?: number;

  /** Dynamic HDR metadata standards the display advertises support for. */
  supportedDynamicMetadataTypes?: Array<
    | 'SMPTE ST 2094-10'
    | 'SMPTE ST 2094-20'
    | 'SMPTE ST 2094-30'
    | 'SMPTE ST 2094-40'
  >;

  /** Raw metadata type ID for a Dynamic HDR Metadata block payload. */
  dynamicHdrMetadataTypeId?: number;

  /** Raw metadata version number for a Dynamic HDR Metadata block payload. */
  dynamicHdrMetadataVersionNumber?: number;

  /**
   * Raw CTA-861 video format preference ordering, used to express which formats
   * should be chosen first when multiple are available.
   */
  videoFormatPreferences?: VideoFormatPreference[];

  /** Number of speakers indicated by the Room Configuration block (when present). */
  speakerCount?: number;

  /** Room type code from CTA-861 Room Configuration (used for immersive audio layouts). */
  roomTypeCode?: number;

  /** Human-friendly room type label derived from {@link roomTypeCode}. */
  roomTypeString?: string;

  /** Decoded HDMI Forum feature flags when the HDMI Forum SCDB payload is present. */
  hdmiForumFeatures?: HdmiForumFeatures;

  /** HDMI Forum SCDB version (raw byte value). */
  hfSCDBVersion?: number;

  /** Maximum TMDS character rate (in MHz, 5 MHz steps) from HDMI Forum SCDB. */
  maxTMDSCharacterRateMhz?: number;

  /** Maximum Fixed Rate Link (FRL) capability, as a human-friendly string. */
  maxFixedRateLink?: string;

  /** Minimum VRR refresh rate in Hz, when advertised via HDMI Forum SCDB. */
  vrrMinHz?: number;

  /** Maximum VRR refresh rate in Hz, when advertised via HDMI Forum SCDB. */
  vrrMaxHz?: number;
}

/**
 * Union of all CTA-861 Data Block shapes currently modeled by this parser.
 */
export type AnyDataBlock =
  | ReservedDataBlock
  | AudioDataBlock
  | VideoDataBlock
  | VendorDataBlock
  | SpeakerDataBlock
  | ExtendedTagDataBlock;

// #endregion - Data Blocks

////////////////////////////////////////////////////////////////////////////////

// #region - Features

/**
 * CTA-861 Short Video Descriptor (SVD).
 *
 * Represents a single supported video mode, primarily identified by a VIC, with
 * optional human-friendly labels derived by the parser.
 */
export interface ShortVideoDescriptor {
  /** CTA-861 Video Identification Code (VIC) identifying a standard video timing. */
  vic: number;

  /** Human-friendly mode label (typically derived from the VIC table). */
  formatLabel?: string;

  /** Human-friendly refresh/field rate label (typically derived from the VIC table). */
  fieldRateLabel?: string;

  /** Intended picture aspect ratio for the mode (e.g. 16:9). */
  pictureAspectRatio?: string;

  /** Pixel aspect ratio for the mode (useful for non-square-pixel formats). */
  pixelAspectRatio?: string;

  /**
   * True if the display marks this mode as "native"/preferred within the CTA
   * Video Data Block.
   */
  isNativeResolution?: boolean;
}

/**
 * CTA-861 Short Audio Descriptor (SAD).
 *
 * Represents a single supported audio format entry, including channel count and
 * sampling/bit-depth capabilities.
 */
export interface ShortAudioDescriptor {
  /** CTA-861 audio format code (codec identifier). */
  standardCodecId?: number;

  /** Extended audio format code (for formats beyond the base CTA set). */
  extendedCodecId?: number;

  /** Maximum number of channels supported for this audio format. */
  maxChannelCount?: number;

  /** Bitmask of supported sampling rates (CTA-861 encoding). */
  sampleRatesBitmask?: number;

  /** For LPCM: bitmask of supported sample sizes (16/20/24-bit). */
  bitDepthBitmask?: number;

  /** For compressed formats: maximum bit rate in kbps (8 kbps steps). */
  bitRateKbps?: number;

  /** Additional format code byte used by some extended audio formats. */
  audioFormatCode?: number;

  /** Codec-specific profile/level field used by some audio formats. */
  codecProfileOrLevel?: number;
}

/**
 * EDID base-block "Basic Display Parameters / Features".
 *
 * Captures how the display should be driven (digital vs analog, sync support,
 * power management, gamma) and includes a best-effort physical size summary.
 */
export interface BasicDisplayParams {
  /** True for digital inputs (HDMI/DP/DVI); false indicates an analog interface (VGA-era). */
  isDigital?: boolean;

  /** Legacy VESA DFP (Digital Flat Panel) compatibility flag. */
  isVesaDfpCompatible?: boolean;

  /** For analog inputs: encoded white/sync signal level information. */
  whiteSyncLevels?: number;

  /** For analog inputs: indicates the blanking level equals the black level. */
  isBlankToBlack?: boolean;

  /** For analog inputs: supports separate horizontal/vertical sync signals. */
  isSeparateSyncSupported?: boolean;

  /** For analog inputs: supports composite sync. */
  isCompositeSyncSupported?: boolean;

  /** For analog inputs: supports sync-on-green. */
  isSyncOnGreen?: boolean;

  /** For analog inputs: indicates serrated vsync timing. */
  isVsyncSerrated?: boolean;

  /**
   * Largest physical image size supported by all DTDs and display modes.
   *
   * ⚠️ WARNING: May not be accurate!
   *
   * Some manufacturers copy/paste EDID data across multiple models.
   */
  physicalWidthInMm?: number;

  /**
   * Largest physical image size supported by all DTDs and display modes.
   *
   * ⚠️ WARNING: May not be accurate!
   *
   * Some manufacturers copy/paste EDID data across multiple models.
   */
  physicalHeightInMm?: number;

  /**
   * Approximate diagonal screen size in inches.
   *
   * Calculated from {@link physicalWidthInMm} and {@link physicalHeightInMm}.
   */
  diagonalInches?: number;

  /** Approximate display gamma (tone curve), as reported by EDID (often unreliable). */
  displayGamma?: number;

  /** Supports DPMS "standby" power state. */
  supportsDpmsStandby?: boolean;

  /** Supports DPMS "suspend" power state. */
  supportsDpmsSuspend?: boolean;

  /** Supports DPMS "active off" power state. */
  supportsDpmsActiveOff?: boolean;

  /**
   * Raw EDID display type / color-support code.
   *
   * Meaning depends on {@link isDigital} (analog display type vs digital color
   * encoding support).
   */
  displayTypeCode?: number;

  /** Indicates the display's default color space follows the sRGB standard. */
  isStandardSRgb?: boolean;

  /** Indicates a "preferred timing mode" is specified (usually the first DTD). */
  isPreferredTiming?: boolean;

  /** Indicates support for the legacy GTF timing formula. */
  isGtfSupported?: boolean;
}

/**
 * EDID base-block Standard Timing entry.
 *
 * A compact description of a supported resolution and refresh rate.
 */
export interface StandardDisplayMode {
  /** Horizontal active pixel count (width) for this standard timing. */
  xResolutionPx?: number;

  /** Aspect-ratio code for this timing (used to derive height from width). */
  xyPixelRatio?: number;

  /** Vertical refresh rate in Hz for this timing. */
  vertFreqHz?: number;
}

/**
 * Aspect-ratio hint encoded by an EDID Standard Timing.
 */
export interface XyPixelRatio {
  string: '16:10' | '4:3' | '5:4' | '16:9';
}

/**
 * EDID base-block chromaticity data for the RGB primaries and white point.
 *
 * These x/y coordinates are used for describing the display's color space.
 */
export interface ChromaticityCoordinates {
  /** Red primary x coordinate (raw 10-bit EDID value, 0-1023). */
  redX?: number;

  /** Red primary x coordinate normalized to 0-1 (raw / 1024). */
  redXCoords?: number;

  /** Red primary y coordinate (raw 10-bit EDID value, 0-1023). */
  redY?: number;

  /** Red primary y coordinate normalized to 0-1 (raw / 1024). */
  redYCoords?: number;

  /** Green primary x coordinate (raw 10-bit EDID value, 0-1023). */
  greenX?: number;

  /** Green primary x coordinate normalized to 0-1 (raw / 1024). */
  greenXCoords?: number;

  /** Green primary y coordinate (raw 10-bit EDID value, 0-1023). */
  greenY?: number;

  /** Green primary y coordinate normalized to 0-1 (raw / 1024). */
  greenYCoords?: number;

  /** Blue primary x coordinate (raw 10-bit EDID value, 0-1023). */
  blueX?: number;

  /** Blue primary x coordinate normalized to 0–1 (raw / 1024). */
  blueXCoords?: number;

  /** Blue primary y coordinate (raw 10-bit EDID value, 0–1023). */
  blueY?: number;

  /** Blue primary y coordinate normalized to 0–1 (raw / 1024). */
  blueYCoords?: number;

  /** White point x coordinate (raw 10-bit EDID value, 0–1023). */
  whiteX?: number;

  /** White point x coordinate normalized to 0–1 (raw / 1024). */
  whiteXCoords?: number;

  /** White point y coordinate (raw 10-bit EDID value, 0–1023). */
  whiteY?: number;

  /** White point y coordinate normalized to 0–1 (raw / 1024). */
  whiteYCoords?: number;
}

/**
 * EDID Detailed Timing Descriptor (DTD).
 *
 * A full timing model for one video mode: active pixels, blanking, sync pulses,
 * physical size, and flags like interlaced/stereo.
 */
export interface Dtd {
  /** Pixel clock in MHz for this timing. */
  pixelClockMhz?: number;

  /** Horizontal active pixel count (visible width). */
  horizontalActivePixels?: number;

  /** Horizontal blanking pixel count (front porch + sync + back porch). */
  horizontalBlankLineCount?: number;

  /** Vertical active line count (visible height). */
  verticalActivePixels?: number;

  /** Vertical blanking line count (front porch + sync + back porch). */
  verticalBlankLineCount?: number;

  /** Horizontal sync offset (front porch) in pixels. */
  horizontalSyncOffsetPixels?: number;

  /** Horizontal sync pulse width in pixels. */
  horizontalSyncPulsePixels?: number;

  /** Vertical sync offset (front porch) in lines. */
  verticalSyncOffset?: number;

  /** Vertical sync pulse width in lines. */
  verticalSyncPulseLineCount?: number;

  /** Reported physical image width in millimeters for this timing. */
  horizontalDisplaySizeInMm?: number;

  /** Reported physical image height in millimeters for this timing. */
  verticalDisplaySizeInMm?: number;

  /** Diagonal physical size derived from {@link horizontalDisplaySizeInMm} and {@link verticalDisplaySizeInMm}. */
  diagonalDisplaySizeInMm?: number;

  /** Horizontal border pixels (rarely used). */
  horizontalBorderPixels?: number;

  /** Vertical border lines (rarely used). */
  verticalBorderLines?: number;

  /** True if the timing is interlaced (vs progressive). */
  isInterlaced?: boolean;

  /** Stereo signaling mode (raw EDID code). */
  stereoModeCode?: number;

  /** Sync signaling type (raw EDID code; affects how other sync flags are interpreted). */
  syncTypeCode?: number;

  /** Vertical sync polarity (only meaningful for some digital separate-sync modes). */
  vSyncPolarity?: boolean;

  /** Serrated vsync flag (meaning depends on {@link syncTypeCode}). */
  vSyncSerrated?: boolean;

  /** For some analog sync types: indicates sync is present on all RGB lines. */
  syncAllRGBLines?: boolean;

  /** Horizontal sync polarity (meaning depends on {@link syncTypeCode}). */
  hSyncPolarity?: boolean;

  /** Two-way stereo flag (raw EDID bit). */
  twoWayStereo?: boolean;
}

/**
 * HDMI Forum capability flags (from HDMI Forum vendor-specific payloads in
 * CTA-861).
 *
 * Includes features such as SCDC, VRR/QMS, scrambling, and DSC support.
 */
export interface HdmiForumFeatures {
  /** Indicates SCDC is present/supported (HDMI 2.0+ link management). */
  isScdcPresent?: boolean;

  /** Supports SCDC read request / status updates. */
  isScdcReadRequestCapable?: boolean;

  /** Supports HDMI cable status reporting. */
  supportsCableStatus?: boolean;

  /** Supports signaling "color content bits per component" (deep color info). */
  supportsColorContentBitsPerComponent?: boolean;

  /** Supports TMDS scrambling at or below 340 Mcsc (useful for HDMI 2.0 link management). */
  supportsScrambling340Mcsc?: boolean;

  /** HDMI 3D capability flag: Independent View. */
  supports3DIndependentView?: boolean;

  /** HDMI 3D capability flag: Dual View. */
  supports3DDualView?: boolean;

  /** HDMI 3D capability flag: OSD Disparity. */
  supports3DOSDDisparity?: boolean;

  /**
   * Supports extended `FAPA_end` signaling for HDMI's Frame Accurate Packet
   * Area (FAPA), used for frame-synchronous packet timing.
   */
  supportsFAPAEndExtended?: boolean;

  /** Supports QMS (Quick Media Switching). */
  supportsQMS?: boolean;

  /**
   * Supports the HDMI VRR "MDelta" mechanism, which can limit how quickly the
   * refresh rate is allowed to change from frame to frame to reduce artifacts.
   */
  supportsMDelta?: boolean;

  /** Supports Cinema VRR. */
  supportsCinemaVRR?: boolean;

  /** Supports negative MVRR (VRR-related feature flag). */
  supportsNegativeMVRR?: boolean;

  /** Supports Fast VActive / Quick Frame Transport (QFT) for lower latency. */
  supportsFastVActive?: boolean;

  /** Supports ALLM (Auto Low Latency Mode). */
  supportsALLM?: boolean;

  /**
   * Supports an HDMI Frame Accurate Packet Area (FAPA) starting in blanking
   * after the first active video line.
   */
  supportsFAPAInBlanking?: boolean;

  /** Supports VESA DSC 1.2a (Display Stream Compression) over HDMI. */
  supportsVESADSC12a?: boolean;

  /** Supports compressed video when using 4:2:0 chroma subsampling. */
  supportsCompressedVideo420?: boolean;

  /** Supports `QMS-TFRmax` signaling (maximum target frame rate for QMS). */
  supportsQMSTFRmax?: boolean;

  /** Supports `QMS-TFRmin` signaling (minimum target frame rate for QMS). */
  supportsQMSTFRmin?: boolean;

  /** Supports compressed video at any bits-per-pixel. */
  supportsCompressedVideoAnyBpp?: boolean;

  /** Supports compressed video at 16 bits per component. */
  supports16bpcCompressedVideo?: boolean;

  /** Supports compressed video at 12 bits per component. */
  supports12bpcCompressedVideo?: boolean;

  /** Supports compressed video at 10 bits per component. */
  supports10bpcCompressedVideo?: boolean;
}

/**
 * One entry from the CTA-861 Video Format Preference Data Block.
 *
 * Encodes an SVR/FRR pairing used to express preferred video format ordering.
 */
export interface VideoFormatPreference {
  /** Short Video Reference (SVR) code identifying the referenced video format. */
  svrCode: number;

  /** Frame Rate Reference (FRR) code indicating the preferred frame rate variant. */
  frrCode: number;
}

// #endregion - Features

////////////////////////////////////////////////////////////////////////////////

// #region - Parsed

/**
 * Known IEEE OUI values used in CTA-861 Vendor Specific Data Blocks.
 *
 * The OUI helps identify which vendor-defined payload format is present
 * (commonly HDMI Licensing and/or the HDMI Forum).
 */
export interface IeeeOuiTypeMap {
  readonly HDMI14: {
    readonly string: 'HDMI14';
    readonly value: 0x000c03;
  };
  // TODO(acdvorak): Why are there two duplicate values?
  readonly HDMI20: {
    readonly string: 'HDMI20';
    readonly value: 0xc45dd8;
  };
  // TODO(acdvorak): Why are there two duplicate values?
  readonly HDMI_FORUM: {
    readonly string: 'HDMI FORUM';
    readonly value: 0xc45dd8;
  };
  readonly HDR10_PLUS: {
    readonly string: 'HDR10 PLUS';
    readonly value: 0x90848b;
  };
  readonly DOLBY_VISION: {
    readonly string: 'DOLBY VISION';
    readonly value: 0x00d046;
  };
}

/**
 * Machine-readable codes for non-fatal issues encountered while parsing EDID.
 */
export type ParsedEdidWarningCode =
  | 'length_not_multiple_of_128'
  | 'too_short'
  | 'invalid_header'
  | 'checksum_failed'
  | 'extension_count_mismatch'
  | 'unknown_edid_minor_version'
  | 'unknown_extension_tag'
  | 'unknown_data_block'
  | 'parse_error'
  | 'out_of_range_read'
  | 'other';

/**
 * A non-fatal parser warning with optional location details.
 */
export interface ParsedEdidWarning {
  /** Machine-readable warning code. */
  code: ParsedEdidWarningCode;

  /** Human-readable warning message. */
  message: string;

  /** 0-based 128-byte block index, when the warning is tied to a specific block. */
  blockIndex?: number;

  /** Byte offset within the overall EDID blob, when available. */
  offset?: number;

  /** Additional context (implementation-defined). */
  detail?: unknown;
}

/**
 * Best-guess "preferred" native timing for the display.
 *
 * Typically derived from the EDID's preferred DTD and paired with the display's
 * reported physical size.
 */
export interface NativeResolution {
  /**
   * Width in pixels.
   *
   * @example 3840
   */
  activeHorizontalPixels: number;

  /**
   * Height in pixels.
   *
   * @example 2160
   */
  activeVerticalLines: number;

  /**
   * ⚠️ WARNING: May not be accurate!
   *
   * Some manufacturers copy/paste EDID data across multiple models.
   * For example, the 65in version of the S95C reports an 85in diagonal here.
   *
   * @example 1872
   */
  physicalWidthInMm: number;

  /**
   * ⚠️ WARNING: May not be accurate!
   *
   * Some manufacturers copy/paste EDID data across multiple models.
   * For example, the 65in version of the S95C reports an 85in diagonal here.
   *
   * @example 1053
   */
  physicalHeightInMm: number;

  /**
   * Approximate diagonal screen size in inches.
   *
   * Calculated from {@link physicalWidthInMm} and {@link physicalHeightInMm}.
   */
  diagonalInches?: number;

  /** True if the preferred timing is interlaced rather than progressive. */
  isInterlaced: boolean;

  /** Approximate refresh rate in Hz for the preferred timing. @example 60 */
  refreshRateHz: number;
}

/**
 * Range of the color palette — i.e., the outer limits of which colors the
 * display can hit (gamut/primaries), not the HDR tone curve.
 *
 * EDID does not expose an explicit list of supported color gamuts; they are
 * inferred from chromaticity coordinates by matching to nearest canonical
 * primaries.
 *
 * - `srgb` - Same primaries/white point as Rec.709 (SDR). Commonly used for
 *   computer UI and web content.
 *
 * - `display_p3` - P3 primaries with D65 white ("P3-D65"); what consumers
 *   usually mean by "P3" on TVs/monitors.
 *
 * - `adobe_rgb` - Common on photo/creator monitors (wider than sRGB/Rec.709,
 *   especially in greens/cyans).
 *
 * - `rec_2020` - Rec.2020 (BT.2020): very wide HDR video gamut; often used as
 *   the HDR "container" gamut even when the panel doesn't fully cover it.
 *   Most consumer TVs cover a large fraction of P3, but not all of 2020.
 */

export type ColorGamut = 'srgb' | 'display_p3' | 'adobe_rgb' | 'rec_2020';

/**
 * Bit depth describes how finely you can shade within the active gamut:
 *
 * - 8-bit  = legacy SDR baseline
 * - 10-bit = practical "deep color" baseline (common for HDR)
 * - 12-bit = higher-precision input (less commonly end-to-end)
 */
export type InputSignalBitDepth = 8 | 10 | 12 | 16;

export type HdmiVersion = LiteralUnion<1.4 | 2.0 | 2.1, number>;

/**
 * Most modern 4K UHD displays use EDID 1.3 or E-EDID 1.4, the newest
 * (and likely final) version of EDID, released in 2006.
 */
export type EdidVersion = LiteralUnion<1.0 | 1.1 | 1.2 | 1.3 | 1.4, number>;

/**
 * DisplayID is the successor to EDID. It is a more modern standard, replacing
 * EDID/E-EDID for better handling of high-bandwidth video and HDR.
 *
 * DisplayID is transported *inside* of EDID 1.3 or 1.4 as an Extension Block
 * (extension tag value of 0x70).
 */
export type DisplayIdVersion = LiteralUnion<1.1 | 1.2 | 1.3 | 2.0, number>;

export interface FeatureSupport {
  /**
   * Range of the color palette — i.e., the outer limits of which colors the
   * display can hit (gamut/primaries), not the HDR tone curve.
   *
   * EDID does not expose an explicit list of supported color gamuts; they are
   * inferred from chromaticity coordinates by matching to nearest canonical
   * primaries.
   */
  colorGamuts: ColorGamut[];

  /**
   * Maximum HDMI signal bit depth accepted by the display — NOT necessarily the
   * panel's native bit depth.
   *
   * E.g., a TV may accept 12-bit input but internally reduce it to 10-bit
   * (bit-depth reduction / re-quantization, often with dithering).
   *
   * Bit depth describes how finely you can shade within the active gamut:
   *
   * - 8-bit  = legacy SDR baseline
   * - 10-bit = practical "deep color" baseline (common for HDR)
   * - 12-bit = higher-precision input (less commonly end-to-end)
   */
  maxInputSignalBitDepth: InputSignalBitDepth;

  supportsHDR10: boolean;
  supportsHDR10Plus: boolean;
  supportsDolbyVision: boolean;

  /**
   * Lowest supported static (standard) refresh rate (non-variable).
   */
  minSrrHz: number;

  /**
   * Highest supported static (standard) refresh rate (non-variable).
   */
  maxSrrHz: number;

  /**
   * Variable Refresh Rate.
   */
  supportsVRR: boolean;

  /**
   * Lowest supported variable refresh rate.
   */
  minVrrHz?: number;

  /**
   * Highest supported variable refresh rate.
   */
  maxVrrHz?: number;

  /**
   * "Game mode" disables many image processing features to reduce latency as
   * much as possible. This is especially useful for First-Person Shooter games
   * where latency is critical.
   */
  supportsGameMode: boolean;

  /**
   * Auto Low-Latency Mode. The display tries to detect video game consoles and
   * automatically enable "game mode", which disables many image processing
   * features to reduce latency as much as possible.
   */
  supportsALLM: boolean;

  /**
   * Best-effort highest HDMI version inferred from CTA/HDMI signaling.
   *
   * Undefined means no HDMI-specific capability signaling was detected.
   *
   * @example 1.4
   * @example 2.1
   */
  hdmiVersion?: HdmiVersion;

  /**
   * Most modern 4K UHD displays use EDID 1.3 or E-EDID 1.4, the newest
   * (and likely final) version of EDID, released in 2006.
   */
  edidVersion?: EdidVersion;

  /**
   * DisplayID is the successor to EDID. It is a more modern standard, replacing
   * EDID/E-EDID for better handling of high-bandwidth video and HDR.
   *
   * DisplayID is transported *inside* of EDID 1.3 or 1.4 as an Extension Block
   * (extension tag value of 0x70).
   */
  displayIdVersion?: DisplayIdVersion;
}

/**
 * Parsed representation of the EDID base block (the first 128 bytes).
 *
 * Contains core base-block metadata, chromaticity, and timing information
 * (standard timings and DTDs).
 */
export interface ParsedBaseEdidBlock {
  /** Raw 128-byte EDID base block (bytes 0-127). */
  rawBytes: Uint8ClampedArray;

  /** True if the EDID header bytes match the expected signature. */
  isHeaderValid?: boolean;

  /** Human-friendly header status derived from {@link isHeaderValid}. */
  headerValidity?: 'OK' | 'ERROR';

  /** 3-letter manufacturer/vendor ID decoded from EDID (e.g. "SAM", "DEL"). */
  vendorId: MergedVendorId;

  /** EDID major version (typically 1). */
  edidVersion?: number;

  /** EDID minor revision (e.g. 3 or 4). */
  edidRevision?: number;

  /**
   * @example "1.3"
   * @example "1.4"
   */
  edidVersionString?: `${number}.${number}`;

  /** Chromaticity coordinates for RGB primaries and the white point. */
  chromaticity?: ChromaticityCoordinates;

  /** Established timings bitfield (legacy fixed timing support flags). */
  timingBitmap?: number;

  /** Standard Timings list (compact resolution/refresh entries). */
  standardDisplayModes?: StandardDisplayMode[];

  /** Detailed Timing Descriptors (full timing models). */
  dtds?: Dtd[];

  /**
   * SPWG panel metadata encoded in vendor-specific `0xfe` monitor descriptors
   * (commonly seen on laptop/internal LVDS/eDP panels).
   */
  spwg?: SpwgData;

  /** Number of extension blocks the base block claims follow this block. */
  numberOfExtensions?: number;

  /** Base block checksum byte (byte 127). */
  checksum?: number;

  /** True if the base block checksum validates. */
  isChecksumValid?: boolean;
}

/**
 * SPWG (Standard Panels Working Group) metadata encoded in monitor
 * descriptors 3 and 4.
 */
export interface SpwgData {
  /** SPWG module revision value (from byte 17 of DTD #2). */
  moduleRevision: number;

  descriptor3: SpwgDescriptor3;
  descriptor4: SpwgDescriptor4;
}

/** SPWG descriptor #3 (part numbers + supplier EEDID revision). */
export interface SpwgDescriptor3 {
  /** PC maker part number (5-byte SPWG field). */
  pcMakerPartNumber: string;

  /** LCD supplier EEDID revision byte. */
  lcdSupplierEedidRevision: number;

  /** LCD manufacturer part number (7-byte SPWG field). */
  manufacturerPartNumber: string;
}

/** SPWG descriptor #4 (SMBus + channel/test flags). */
export interface SpwgDescriptor4 {
  /** Raw SMBus bytes (8 values). */
  smbusValues: number[];

  /** LVDS channel count value encoded by SPWG descriptor #4. */
  lvdsChannels: number;

  /** True when the SPWG panel self-test flag is present. */
  isPanelSelfTestPresent: boolean;
}

/**
 * Common fields for a parsed EDID extension block header and payload summary.
 *
 * For CTA-861 extensions this includes the feature flags, data blocks, and DTDs.
 */
export interface BaseExtensionBlock {
  /** 1-based EDID block number (1 = first extension block after the base block). */
  blockNumber: number;

  /** Raw extension tag byte (e.g. 0x02 for CTA-861). */
  extTagByte: number;

  /** Extension revision number (meaning depends on {@link extTagByte}). */
  revisionNumber: number;

  /** Byte offset within the 128-byte block where DTDs begin. */
  dtdStart: number;

  /** Number of DTDs indicated by the extension header (may be 0). */
  numDtds: number;

  /** CTA flag: supports underscan (no edge cropping) for video formats. */
  supportsUnderscan: boolean;

  /** CTA flag: supports basic audio (at minimum 2-channel LPCM). */
  supportsBasicAudio: boolean;

  /** CTA flag: supports YCbCr 4:4:4 input. */
  supportsYCbCr444: boolean;

  /** CTA flag: supports YCbCr 4:2:2 input. */
  supportsYCbCr422: boolean;

  /** Parsed CTA Data Block Collection entries (audio/video/HDR/vendor, etc). */
  dataBlockCollection?: Array<AnyDataBlock | undefined>;

  /** Detailed Timing Descriptors contained in this extension block. */
  dtds: Dtd[];

  /** Extension block checksum byte (byte 127 of the block). */
  checksum: number;
}

/**
 * Parsed EDID extension block including its raw bytes and checksum status.
 *
 * {@link extensionType} is a best-effort classification
 * (CTA-861 vs DisplayID vs unknown).
 */
export interface ParsedExtensionBlock extends BaseExtensionBlock {
  /** Raw 128-byte extension block bytes. */
  rawBytes: Uint8ClampedArray;

  /** True if this extension block's checksum validates. */
  isChecksumValid?: boolean;

  /** Best-effort classification of the extension payload type. */
  extensionType?: 'cta-861' | 'displayid' | 'unknown';
}

/**
 * Top-level result of parsing an EDID blob (Extended Display Identification Data).
 *
 * Includes the parsed base block, any extension blocks, and non-fatal warnings.
 */
export interface ParsedEdid {
  /** Raw EDID bytes that were parsed. */
  bytes: Uint8ClampedArray;

  /** Non-fatal warnings encountered while parsing. */
  warnings: ParsedEdidWarning[];

  /** True if the base block header validates. */
  isHeaderValid?: boolean;

  /** True if the base block checksum validates. */
  isChecksumValid?: boolean;

  /** Extension-block count advertised by the EDID base block. */
  expectedExtensionCount?: number;

  /** Parsed EDID base block (vendor identity, timings, and base features). */
  baseBlock: ParsedBaseEdidBlock;

  /** Parsed EDID extension blocks (CTA-861 blocks contain most modern features). */
  extensions: ParsedExtensionBlock[];

  featureSupport: FeatureSupport;

  /** Vendor database lookup result for {@link ParsedBaseEdidBlock.vendorId}. */
  vendorInfo: VendorInfo;

  /** Product/manufacture details parsed from the EDID base block. */
  productInfo: ProductInfo;

  /** Basic display feature flags and physical size summary from the base block. */
  basicDisplayParams?: BasicDisplayParams;

  /**
   * The "preferred" resolution.
   *
   * NOTE: Not necessarily the highest resolution!
   */
  nativeResolution?: NativeResolution;
}

export interface ProductInfo {
  /** Manufacturer-defined product code (model identifier). */
  productCode?: number;

  /** Monitor/display name string (when provided in a monitor descriptor). */
  modelName?: string;

  /** 32-bit serial number field from the base block (often 0 or reused). */
  serialNumberInt?: number;

  /** Serial number string from a monitor descriptor (if present). */
  serialNumberStr?: string;

  /**
   * All manufacturer-defined free-form `0xfe` monitor descriptor strings found
   * in the base block.
   */
  unspecifiedStrings?: string[];

  /** Manufacturing week number (1-54), when provided. */
  manufactureWeek?: number;

  /** Manufacturing year (e.g. 2024), when provided. */
  manufactureYear?: number;
}

// #endregion - Parsed

////////////////////////////////////////////////////////////////////////////////
