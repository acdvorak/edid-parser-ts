# @acdvorak/edid-parser-ts

**Pure TypeScript EDID parser** with _zero dependencies_.

Exports ESM and CJS bundles.

Supports _all JS runtimes_ (Node, browser, Deno, Bun, etc.).

## Contributing

This library is a passion project I wrote in my spare time. It's a hobby, not a
job.

Issues and pull requests are welcome, but don't be offended if you don't receive
a timely response. It probably just means I'm busy with family, work, and life.

## Usage

This library exports two API functions:

- `parseEdid(bytes)` - Fully decodes EDID blocks, including CTA-861 extensions,
  colorimetry, and HDR static/dynamic metadata.
- `getVendorInfo(vid)` - Returns the name of the display manufacturer.
  - Well-known or notable display vendors have short, UI-friendly brand names
    (e.g., "Samsung" instead of "Samsung Electronics Co., Ltd."), sourced from
    several manually-curated lists.
  - Less-common display vendors return whatever's in the official UEFI registry.

Example:

```ts
import { getVendorInfo, parseEdid } from '@acdvorak/edid-parser-ts';

/** Samsung S95C, model QN65S95CAF, ca. 2023. HDR10+, VRR, 144 Hz. */
const SAMSUNG_S95C_EDID_BYTES = new Uint8Array([
  0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0xa5, 0x73, 0x00,
  // ...
]);

const parsedEdid = parseEdid(SAMSUNG_S95C_EDID_BYTES);

console.log(getVendorInfo('SAM'));
console.log(parsedEdid);
```

will output:

```js
{ vid: 'SAM', goodName: 'Samsung' }
```

```jsonc
{
  "featureSupport": {
    "hdmiVersion": 2.1,
    "edidVersion": 1.3,

    // DisplayID is the modern successor to EDID.
    // When present, it is stored as an extension block inside an EDID.
    "displayIdVersion": 1.2,

    // Range of the color palette — i.e., the outer limits of which colors the
    // display can hit (gamut/primaries), not the HDR tone curve.
    "colorGamuts": ["srgb", "display_p3", "rec_2020"],

    // Bit depth = how finely the display can shade within the active gamut.
    "maxInputSignalBitDepth": 12,

    // HDR support
    "supportsHDR10": true,
    "supportsHDR10Plus": true,
    "supportsDolbyVision": false,

    // Manual Low-Latency Mode
    "supportsGameMode": true,

    // Auto Low-Latency Mode (auto-detect video game consoles)
    "supportsALLM": true,

    // Standard/Static Refresh Rate
    "minSrrHz": 48,
    "maxSrrHz": 144,

    // Variable Refresh Rate
    "supportsVRR": true,
    "minVrrHz": 48,
    "maxVrrHz": 144,
  },

  "vendorInfo": {
    "vid": "SAM",
    "goodName": "Samsung",
  },

  "productInfo": {
    "productCode": 29605,
    "serialNumberInt": 16780800,
    "serialNumberStr": "...",
    "modelName": "QCQ95S",
    "manufactureWeek": 1,
    "manufactureYear": 2023,
  },

  "basicDisplayParams": {
    "physicalWidthInMm": 1420,
    "physicalHeightInMm": 800,
    "diagonalInches": 64.2,
  },

  "nativeResolution": {
    "activeHorizontalPixels": 3840,
    "activeVerticalLines": 2160,
    "physicalWidthInMm": 1872,
    "physicalHeightInMm": 1053,
    "diagonalInches": 84.6,
    "isInterlaced": false,
    "refreshRateHz": 60,
  },

  "baseBlock": {
    "vendorId": "SAM",

    "standardDisplayModes": [
      {
        "xResolution": 1280,
        "xyPixelRatio": 3,
        "vertFreqHz": 60,
      },
      // ...
      {
        "xResolution": 1920,
        "xyPixelRatio": 3,
        "vertFreqHz": 60,
      },
    ],

    "dtds": [
      {
        "horizontalActivePixels": 3840,
        "verticalActivePixels": 2160,
        "horizontalDisplaySizeInMm": 1872,
        "verticalDisplaySizeInMm": 1053,
        "isInterlaced": false,
        "stereoModeCode": 0,
        "syncTypeCode": 3,
      },
      {
        "horizontalActivePixels": 2560,
        "verticalActivePixels": 1440,
        "horizontalDisplaySizeInMm": 1872,
        "verticalDisplaySizeInMm": 1053,
        "isInterlaced": false,
        "stereoModeCode": 0,
        "syncTypeCode": 3,
      },
    ],
  },

  "extensions": [
    {
      "extTagByte": 2,
      "revisionNumber": 3,
      "supportsUnderscan": true,
      "supportsBasicAudio": true,
      "supportsYCbCr444": true,
      "supportsYCbCr422": true,
      "extensionType": "cta-861",
      "dataBlockCollection": [
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "extendedTag": {
            "string": "VIDEO CAPABILITY",
            "value": 0,
          },
          "quantizationRangeYCC": false,
          "quantizationRangeRGB": true,
          "overscanPT": "No data",
          "overscanIT": "Supports both overscan and underscan",
          "overscanCE": "Supports both overscan and underscan",
        },
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "extendedTag": {
            "string": "COLORIMETRY",
            "value": 5,
          },
          "supportsBT2020RGB": true,
          "supportsBT2020YCC": true,
          "supportsBT2020cYCC": false,
          "supportsAdobeRGB": false,
          "supportsAdobeYCC601": false,
          "supportssYCC601": false,
          "supportsxvYCC709": true,
          "supportsxvYCC601": true,
          "gamutMD3": 0,
          "gamutMD2": 0,
          "gamutMD1": 0,
          "gamutMD0": 1,
        },
        {
          "tag": {
            "string": "VENDOR SPECIFIC",
            "value": 3,
          },
          "ieeeOui": 3075,
          "physicalAddress": 8192,
          "supportsAI": true,
          "supportsDeepColor48": false,
          "supportsDeepColor36": true,
          "supportsDeepColor30": true,
          "supportsDeepColorY444": true,
          "supportsDualDvi": false,
        },
        {
          "tag": {
            "string": "VENDOR SPECIFIC",
            "value": 3,
          },
          "ieeeOui": 12869080,
          "hdmiForumFeatures": {
            "isScdcPresent": true,
            "supportsQMS": true,
            "supportsALLM": true,
            "supportsVESADSC12a": true,
            "supportsCompressedVideo420": true,
            "supportsQMSTFRmin": true,
            "supports10bpcCompressedVideo": true,
          },
          "version": 1,
          "maxTMDSCharacterRateMhz": 600,
          "supportsSCDC": true,
          "supportsSCDCRR": false,
          "maxFixedRateLink": "4 lanes @ 10 Gbps",
          "vrrMinHz": 48,
          "vrrMaxHz": 144,
        },
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "extendedTag": {
            "string": "HDR STATIC METADATA",
            "value": 6,
          },
          "supportedEOTFs": [
            "Traditional gamma - SDR luminance range",
            "SMPTE ST2084 (PQ)",
            "Hybrid Log-Gamma (HLG)",
          ],
          "supportedStaticMetadataDescriptors": ["Static Metadata Type 1"],
        },
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "extendedTag": {
            "string": "YCBCR420_CAPABILITY_MAP",
            "value": 15,
          },
          "YCbCr420CapableShortVideoDescriptors": [
            {
              "vic": 97,
              "isNativeResolution": false,
            },
            // ...
          ],
        },
      ],
    },
  ],
}
```

## What is EDID?

EDID is a **small array of bytes**, hard-coded into a monitor or TV's firmware
at manufacture time, that advertises which features a physical display
**_claims_** to support.

**Important**: EDID _cannot_ tell us anything about the current, active display
mode, and it _cannot_ tell us whether a given display mode is actually usable
with the current setup. It can only tell us which display modes the monitor/TV
is _probably_ capable of displaying IFF the GPU and cable can also deliver them.

### Metadata

From EDID you can _usually_ derive:

- **Manufacturer ID** (Apple, Samsung, LG, etc.)
- **Product ID**
- **Serial number**
- **Physical dimensions** (width and height in centimeters)
- List of supported **resolutions**, **refresh rates**, pixel formats, and
  colorimetry

With extension blocks, you may also see things like:

- **Audio support** (codecs, channel counts, sample rates)
- **Color spaces** (RGB / Y'CbCr variants)
- **Deep color** and bits-per-channel _claims_
- **HDR support** (HDR10, HDR10+, Dolby Vision, HLG)
- **VRR support** (often via HDMI Forum VRR / Adaptive-Sync indicators rather
  than a single universal flag)

### Gotchas

1. **Static metadata**: EDID bytes are effectively baked into the display's
   firmware at manufacturing/assembly time: **they do not change** when the user
   switches the current resolution/refresh/HDR mode, and they **do not tell you
   the active mode** (only OS/GPU APIs can do that).
2. **Unreliable values**: EDID data quality varies _wildly_. Blocks can be
   incomplete, wrong, copy-pasted across models, updated in later revisions, or
   even spoofed/overridden by docks, KVMs, adapters, and drivers. Do not assume
   that EDID data is 100% accurate or trustworthy.
3. **Non-unique**: EDIDs are not guaranteed to be globally unique. In
   particular, serial numbers are often missing or duplicated.

If you need robust display identification and "what's active right now?"
answers, treat EDID as an identity _hint_ + capability _claims_, and combine it
with other signals (OS display IDs, connector/path info, sink OUI/vendor blocks,
and runtime mode queries).

## Vendor IDs

Plug-n-Play Vendor IDs (aka PNP IDs or VIDs) are 3-letter codes that uniquely
identify the company that manufactured the display.

Vendor IDs consist of 3 uppercase Latin letters (A-Z). Manufacturers can and
often do have multiple VIDs.

For example, the most common VIDs in consumer monitors/TVs are:

| VID   | Manufacturer             |  Models |
| :---- | :----------------------- | ------: |
| `ACI` | Asus                     |  `5546` |
| `ACR` | Acer                     |  `9266` |
| `AOC` | AOC International        |  `7081` |
| `APP` | Apple                    |  `1245` |
| `AUO` | AU Optronics             |  `2103` |
| `AUS` | Asus                     |  `4093` |
| `BNQ` | BenQ                     |  `6499` |
| `BBY` | Best Buy                 |   `283` |
| `DEL` | Dell                     | `18260` |
| `GBT` | Gigabyte                 |  `1052` |
| `GSM` | LG                       | `14288` |
| `HEC` | Hisense                  |   `437` |
| `HPN` | Hewlett Packard          |  `3901` |
| `HWP` | Hewlett Packard          |  `4938` |
| `LCD` | Toshiba                  |   `165` |
| `LEN` | Lenovo                   |  `3755` |
| `LGD` | LG                       |  `1294` |
| `LPL` | LG Philips               |   `190` |
| `MEI` | Panasonic                |   `408` |
| `MSI` | Micro-Star International |  `1963` |
| `NEC` | NEC Corporation          |   `877` |
| `PHL` | Philips                  |  `5920` |
| `SAM` | Samsung                  | `18273` |
| `SDC` | Samsung                  |   `331` |
| `SHP` | Sharp                    |  `1260` |
| `SNY` | Sony                     |  `1011` |
| `TCL` | TCL Corporation          |   `585` |
| `TOL` | TCL Corporation          |     `3` |
| `TSB` | Toshiba                  |   `332` |
| `VIZ` | Vizio                    |   `634` |
| `VSC` | ViewSonic                |  `2733` |
| `WOR` | Dell                     |   `132` |

### VID database

There is no single canonical, correct, complete list of all known VIDs, so I
merged the following sources together and cleaned them up as best I could:

1. My own custom list of manually-curated VIDs and short brand names for major
   and notable manufacturers.
2. [@linuxhw/EDID](https://github.com/linuxhw/EDID) - Repository of decoded
   EDIDs from real-world digital and analog monitors, collected by Linux users
   at [linux-hardware.org](https://linux-hardware.org).
3. [Lansweeper Knowledge Base article](https://community.lansweeper.com/t5/managing-assets/list-of-3-letter-monitor-manufacturer-codes/ta-p/64429)
4. [`pnp.ids` from @vcrhonek/hwdata](https://github.com/vcrhonek/hwdata/blob/428ad3882/pnp.ids) -
   Derived from the "official" UEFI registry, with custom patches for
   correctness/completeness.
5. "Official" UEFI registry (incomplete and low quality):
   - [CSV](https://uefi.org/UEFI-PNP-Export)
   - [HTML](https://uefi.org/PNP_ID_List)
   - [PDF](https://uefi.org/sites/default/files/resources/PNPID_List.pdf)

The `getVendorInfo(vid)` function searches each dataset for the corresponding ID
and returns the "highest-quality" name it can find.

### VID deprecation

According to the
[Unified Extensible Firmware Interface Forum](https://uefi.org/PNP_ACPI_Registry):

> **Sunset of Vendor IDs in PnP Form**
>
> Starting at the end of 2024, the UEFI Forum no longer issues new 3-letter Plug
> and Play (PnP) Vendor Identifiers (a "VID"). For ACPI implementation purposes,
> a 4-letter ACPI ID can be used for all situations where the ID is needed, for
> example in creating device identifiers.

As of early 2026, no manufacturers are using ACPI IDs yet; VIDs are still the
standard identifier used in all displays.

## Development

Install dependencies:

```bash
npm install
```

Run the unit tests:

```bash
npm run test
```

Build the library:

```bash
npm run build
```

Update EDID vendor ID databases:

```bash
npm run update
```

## Credit

This package is a TypeScript fork of https://github.com/dgallegos/edidreader.
They did all the hard work of figuring out how to actually parse the giant ball
of crazy that is EDID; all I did was slap some typedefs on top of it.
