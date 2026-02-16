import { glob, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { outdent } from 'outdent';

import { parseEdid } from '../parser/parser-core';
import { isExtendedTagBlock } from '../parser/parser-utils';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '../../');

interface FindEdidOptions {
  cwd?: string;
  globPattern?: string;
}

function getEdidBytes(textFileContent: string): Uint8Array<ArrayBuffer> {
  const startMarker = 'edid-decode (hex):';
  const endMarker = '----------------';

  const startMarkerIndex = textFileContent.indexOf(startMarker);
  if (startMarkerIndex === -1) {
    return new Uint8Array(0);
  }

  const sectionStart = startMarkerIndex + startMarker.length;
  const sectionEnd = textFileContent.indexOf(endMarker, sectionStart);
  const end = sectionEnd === -1 ? textFileContent.length : sectionEnd;

  const bytes = new Uint8Array((end - sectionStart) >>> 1);
  let count = 0;

  const hexValue = (charCode: number): number => {
    if (charCode >= 48 && charCode <= 57) {
      return charCode - 48;
    }
    const lower = charCode | 32;
    if (lower >= 97 && lower <= 102) {
      return lower - 87;
    }
    return -1;
  };

  const isHexCharCode = (charCode: number): boolean =>
    hexValue(charCode) !== -1;

  for (let i = sectionStart; i + 1 < end; i += 1) {
    if (i > sectionStart && isHexCharCode(textFileContent.charCodeAt(i - 1))) {
      continue;
    }

    const highNibble = hexValue(textFileContent.charCodeAt(i));
    if (highNibble === -1) {
      continue;
    }

    const lowNibble = hexValue(textFileContent.charCodeAt(i + 1));
    if (lowNibble === -1) {
      continue;
    }

    const afterIndex = i + 2;
    if (
      afterIndex < end &&
      isHexCharCode(textFileContent.charCodeAt(afterIndex))
    ) {
      continue;
    }

    bytes[count] = (highNibble << 4) | lowNibble;
    count += 1;
    i += 1;
  }

  return bytes.subarray(0, count);
}

export async function findInterestingEdids(
  options: FindEdidOptions = {},
): Promise<void> {
  const cwd = options.cwd ?? ROOT_DIR;
  const globPattern =
    options.globPattern ?? 'submodules/linuxhw-edid/Digital/**/*';

  let longestBytes = new Uint8Array();
  let longestPath = '';

  const edidVerSet = new Set<number>();
  const didVerSet = new Set<number>();
  const hdmiVerSet = new Set<number>();
  const eotfSet = new Set<string>();
  const staticMetadataDescriptorSet = new Set<string>();

  for await (const relativePath of glob(globPattern, { cwd })) {
    const absolutePath = resolve(cwd, relativePath);

    let fileText: string;
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        continue;
      }

      fileText = await readFile(absolutePath, 'utf8');
    } catch {
      continue;
    }

    const edidBytes = getEdidBytes(fileText);
    if (edidBytes.byteLength === 0) {
      continue;
    }

    const parsed = parseEdid(edidBytes);

    const unspecified: string[] = parsed.productInfo.unspecifiedStrings ?? [];
    if (unspecified.length) {
      if (unspecified.some((str) => /[^a-zA-Z0-9 _.+'"/-]/.test(str))) {
        console.log(unspecified, `"${relativePath}"`);
      }
    }

    const support = parsed.featureSupport;
    const edidVer = support.edidVersion;
    const didVer = support.displayIdVersion;
    const hdmiVer = support.hdmiVersion;

    parsed.extensions.forEach((ext) => {
      ext.dataBlockCollection?.forEach((data) => {
        if (isExtendedTagBlock(data)) {
          data.supportedEOTFs?.forEach((eotf) => eotfSet.add(eotf));
          data.supportedStaticMetadataDescriptors?.forEach((desc) =>
            staticMetadataDescriptorSet.add(desc),
          );
        }
      });
    });

    if (edidVer) {
      edidVerSet.add(edidVer);
    }
    if (didVer) {
      didVerSet.add(didVer);
    }
    if (hdmiVer) {
      hdmiVerSet.add(hdmiVer);
    }

    if (!didVer) {
      continue;
    }

    didVerSet.add(didVer);

    if (didVer !== 2.0) {
      continue;
    }

    if (edidBytes.byteLength <= longestBytes.byteLength) {
      continue;
    }

    longestBytes = edidBytes;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    longestPath = relativePath;
  }

  // console.log();
  // console.log([...allNonPrintableChars].sort());
  // console.log();

  if (Date.now() < 0) {
    console.log(
      'DisplayID versions:',
      [...didVerSet].sort().map((ver) => ver.toFixed(1)),
    );
    console.log(
      'EDID versions:',
      [...edidVerSet].sort().map((ver) => ver.toFixed(1)),
    );
    console.log(
      'HDMI versions:',
      [...hdmiVerSet].sort().map((ver) => ver.toFixed(1)),
    );
  }

  const parsed = parseEdid(longestBytes);
  const didVer = (parsed.featureSupport.displayIdVersion ?? 0).toFixed(1);
  const hdmiVer = (parsed.featureSupport.hdmiVersion ?? 0).toFixed(1);

  if (Date.now() < 0) {
    const mfg = parsed.vendorInfo.goodName
      .toUpperCase()
      .replaceAll(/\W+/g, '_');
    const model = (parsed.productInfo.modelName ?? 'UNKNOWN')
      .toUpperCase()
      .replaceAll(/\W+/g, '_');
    let str = outdent`
    /**
     * - DisplayID ${didVer}
     * - HDMI ${hdmiVer}
     */
    export const ${mfg}_${model}_BYTES = new Uint8Array([
  `;
    let i = 0;
    for (const b of longestBytes) {
      if (i % 128 === 0) {
        str += '\n//\n  ';
      }
      str += '0x' + b.toString(16).padStart(2, '0').toLowerCase() + ', ';
      i++;
    }
    str += '\n]);\n';

    console.log(str);
  }
}

const maybeEntryPath = process.argv[1] ?? '';
const isEntrypoint =
  maybeEntryPath.length > 0 &&
  import.meta.url === pathToFileURL(resolve(maybeEntryPath)).href;

if (isEntrypoint) {
  await findInterestingEdids({
    cwd: ROOT_DIR,
    globPattern: 'submodules/linuxhw-edid/Digital/**/*',
  });
}
