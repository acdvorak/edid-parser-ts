# @acdvorak/edid-parser-ts

**Pure TypeScript EDID parser** with _zero dependencies_.

ESM and CJS.

Supports _all JS runtimes_ (Node, browser, Deno, Bun, etc.).

## What is EDID?

EDID is a small **array of bytes**, hard-coded into a monitor or TV's firmware
at manufacture time, that advertises which features a physical display _claims_
to support.

Crucially, EDID _cannot_ tell us anything about the **current**, active display
mode, and it _cannot_ tell us whether a given display mode is actually usable
with the current setup. It can only tell us which display modes the monitor/TV
is _probably_ capable of displaying IFF the GPU and cable can also deliver them.

### Metadata

From EDID you can _usually_ derive:

- Manufacturer ID (Apple, Samsung, LG, etc.)
- Product ID
- Serial number (sometimes; may be missing, garbage, or occasionally useful)
- Physical dimensions (width and height in inches or centimeters)
- List of supported resolutions, refresh rates, pixel formats, and colorimetry

With extension blocks, you may also see things like:

- Audio support (codecs, channel counts, sample rates)
- Color spaces (RGB / Y'CbCr variants)
- Deep color and bits-per-channel _claims_
- HDR signaling support (HDR10 / HLG / Dolby Vision metadata patterns, EOTF
  support, luminance hints)
- VRR-related signaling (when present, often via HDMI Forum VRR / Adaptive-Sync
  indicators rather than a single universal flag)

### Gotchas

Real-world traps:

1. **Static metadata**: EDID bytes are effectively baked into the display's
   firmware at manufacturing/assembly time: **they do not change** when the user
   switches the current resolution/refresh/HDR mode, and they **do not tell you
   the active mode** - only OS/GPU APIs can do that.
2. **Variable quality**: EDID data quality varies _wildly_. Blocks can be
   incomplete, wrong, copy-pasted across models, updated in later revisions, or
   even spoofed/overridden by docks, KVMs, adapters, and drivers.
3. **Non-unique**: EDIDs are not guaranteed to be globally unique. In
   particular, serial numbers are often missing or duplicated.

If you need robust display identification and "what's active right now?"
answers, treat EDID as an identity _hint_ + capability _claims_, and combine it
with other signals (OS display IDs, connector/path info, sink OUI/vendor blocks,
and runtime mode queries).

## Vendor IDs

Plug-n-Play Vendor IDs (aka PNP IDs or VIDs) are 3-letter codes that uniquely
identify the manufacturer of a display.

Vendor IDs consist of 3 uppercase Latin letters (A-Z). Manufacturers can and
often do have multiple VIDs.

For example:

| VID   | Manufacturer |
| :---- | :----------- |
| `APP` | Apple        |
| `BNQ` | BenQ         |
| `DEL` | Dell         |
| `HEC` | Hisense      |
| `LEN` | Lenovo       |
| `LGD` | LG           |
| `MDO` | Panasonic    |
| `SAM` | Samsung      |
| `SHP` | Sharp        |
| `SNY` | Sony         |
| `VSC` | ViewSonic    |
| `VIZ` | Vizio        |

### VID database

There is no single, canonical, _correct_ list of all known VIDs, so I merged the
following sources together and cleaned them up as best I could:

- ⚠️ https://uefi.org/PNP_ID_List (paginated HTML) - incomplete; malformed names
- ⚠️ https://uefi.org/UEFI-PNP-Export (plain text) - incomplete; malformed names
- ⚠️
  https://community.lansweeper.com/t5/managing-assets/list-of-3-letter-monitor-manufacturer-codes/ta-p/64429 -
  incomplete

See [`src/edid-vendor-constants.ts`](./src/edid-vendor-constants.ts).

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

## Usage

```ts
import { parseEdid } from '@acdvorak/edid-parser-ts';

/**
 * Samsung S95C series, model QN65S95CAF, mfg. 2023.
 *
 * 4K UHD, HDR10+, VRR up to 120 Hz, 144 Hz max.
 *
 * @see https://www.displayspecifications.com/en/model/fcb13131
 * @see https://www.flatpanelshd.com/samsung_qs95c_qdoled_2023.php
 */
const SAMSUNG_S95C_EDID_BYTES = new Uint8Array([
  0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x4c, 0x2d, 0xa5, 0x73, 0x00,
  0x0e, 0x00, 0x01, 0x01, 0x21, 0x01, 0x03, 0x80, 0x8e, 0x50, 0x78, 0x0a, 0xf4,
  // ...
]);

const parsedEdid: ParsedEdid = parseEdid(SAMSUNG_S95C_EDID_BYTES);

console.log(parsedEdid);
```

will output:

```jsonc
{
  "baseBlock": {
    "headerValid": true,
    "vendorId": "SAM",
    "vendorName": "Samsung Electric Company",
    "vendorBrand": "Samsung",
    "productCode": 29605,
    "serialNumber": 16780800,
    "manufactureWeek": 1,
    "manufactureYear": 2023,
    "manufactureDate": "1/2023",
    "edidVersionString": "1.3",
    "standardDisplayModes": [
      {
        "xResolution": 1280,
        "xyPixelRatio": 3,
        "vertFreq": 60,
      },
      // ...
      {
        "xResolution": 1920,
        "xyPixelRatio": 3,
        "vertFreq": 60,
      },
    ],
    "dtds": [
      {
        "horActivePixels": 3840,
        "horBlankPixels": 560,
        "vertActivePixels": 2160,
        "vertBlankPixels": 90,
        "horDisplaySize": 1872,
        "vertDisplaySize": 1053,
        "horBorderPixels": 0,
        "vertBorderLines": 0,
        "interlaced": false,
        "stereoMode": 0,
        "syncType": 3,
      },
      {
        "horActivePixels": 2560,
        "horBlankPixels": 160,
        "vertActivePixels": 1440,
        "vertBlankPixels": 85,
        "horDisplaySize": 1872,
        "vertDisplaySize": 1053,
        "horBorderPixels": 0,
        "vertBorderLines": 0,
        "interlaced": false,
        "stereoMode": 0,
        "syncType": 3,
      },
    ],
  },
  "extensions": [
    {
      "blockNumber": 1,
      "extTag": 2,
      "revisionNumber": 3,
      "dtdStart": 117,
      "numDtds": 0,
      "underscan": true,
      "basicAudio": true,
      "ycbcr444": true,
      "ycbcr422": true,
      "dtds": [],
      "checksum": 185,
      "extensionType": "cta-861",
      "dataBlockCollection": [
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "length": 2,
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
          "length": 3,
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
          "length": 14,
          "ieeeIdentifier": 3075,
          "physicalAddress": 8192,
          "supportsAI": true,
          "deepColor48": false,
          "deepColor36": true,
          "deepColor30": true,
          "deepColorY444": true,
          "dualDvi": false,
          "maxTmdsRate": 340,
          "latencyPresent": false,
          "iLatencyPresent": false,
        },
        {
          "tag": {
            "string": "VENDOR SPECIFIC",
            "value": 3,
          },
          "length": 13,
          "ieeeIdentifier": 12869080,
          "hdmiForumFeatures": {
            "scdcPresent": true,
            "supportsQMS": true,
            "supportsALLM": true,
            "supportsVESADSC12a": true,
            "supportsCompressedVideo420": true,
            "supportsQMSTFRmin": true,
            "supports10bpcCompressedVideo": true,
          },
          "version": 1,
          "maxTMDSCharacterRate": 600,
          "supportsSCDC": true,
          "supportsSCDCRR": false,
          "maxFixedRateLink": "4 lanes @ 10 Gbps",
          "vrrMin": 48,
          "vrrMax": 144,
        },
        {
          "tag": {
            "string": "EXTENDED TAG",
            "value": 7,
          },
          "length": 3,
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
          "length": 2,
          "extendedTag": {
            "string": "YCBCR420_CAPABILITY_MAP",
            "value": 15,
          },
          "YCbCr420CapableShortVideoDescriptors": [
            {
              "vic": 97,
              "nativeResolution": false,
            },
            // ...
          ],
        },
      ],
    },
  ],
}
```

## Development

- Install dependencies:

```bash
npm install
```

- Run the unit tests:

```bash
npm run test
```

- Build the library:

```bash
npm run build
```

## Credit

This package is a TypeScript fork of https://github.com/dgallegos/edidreader.
They did all the hard work of figuring out how to actually parse the giant ball
of crazy that is EDID; all I did was slap some typedefs on top of it.
