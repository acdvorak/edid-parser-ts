import { createReadStream } from 'node:fs';
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as cheerio from 'cheerio';
import { sortJsonc } from 'sort-jsonc';
import toTitleCase from 'titlecase';

import { sanitizeName } from '../util/names';
import { caseInsensitive } from '../util/strings';
import { isTruthy } from '../util/truthy';
import { NOTABLE_VENDORS } from '../vids/notable-const';

const __filename = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__filename, '../../');

function escape(str: string): string {
  return JSON.stringify(str);
}

function toJSON(o: unknown): string {
  return sortJsonc(JSON.stringify(o, null, 2), { spaces: 2 });
}

function hasAtLeast1<E>(array: E[]): array is [E, ...E[]] {
  return array.length >= 1;
}

function isLength2<E>(array: E[]): array is [E, E] {
  return array.length === 2;
}

function hasAtLeast3<E>(array: E[]): array is [E, E, E, ...E[]] {
  return array.length >= 3;
}

function is3LetterVid(name: string): boolean {
  if (name.length !== 3 || /[^A-Z]/.test(name)) {
    return false;
  }
  return true;
}

async function writeTextFile(
  filePath: string,
  fileContent: string,
): Promise<void> {
  const dirPath = dirname(filePath);
  await mkdir(dirPath, { recursive: true });
  if (!fileContent.endsWith('\n')) {
    fileContent += '\n';
  }
  await writeFile(filePath, fileContent, 'utf8');
}

async function writeJsonFile(
  filePath: string,
  jsonData: object,
): Promise<void> {
  await writeTextFile(filePath, toJSON(jsonData));
}

function makeMapsAndTypes(
  dataset: 'acd' | 'hwdata' | 'linuxhw' | 'lansweeper' | 'merged',
  entries: Array<[string, string]>,
): {
  constTs: string;
  typesTs: string;
} {
  const vids: string[] = [...new Set<string>(entries.map(([vid]) => vid))].sort(
    caseInsensitive,
  );
  const names: string[] = [
    ...new Set<string>(entries.map(([, name]) => name)),
  ].sort(caseInsensitive);

  const upper = dataset.toUpperCase();
  const pascal = toTitleCase(dataset);

  const constJson = toJSON(Object.fromEntries(entries)).trim();
  const constTs = `
export const ${upper}_VENDOR_MAP = ${constJson} as const;
`;

  const vidLines = [...vids]
    .filter(isTruthy)
    .sort(caseInsensitive)
    .map((vid) => `  | ${escape(vid)}`)
    .join('\n');

  const nameLines = [...names]
    .filter(isTruthy)
    .sort(caseInsensitive)
    .map((name) => `  | ${escape(name)}`)
    .join('\n');

  const vidTypesTs = `
/** Vendor IDs from the "${dataset}" dataset. */
export type ${pascal}VendorId =
${vidLines}
;
`;

  const nameTypesTs = `
/** Vendor names from the "${dataset}" dataset. */
export type ${pascal}VendorName =
${nameLines}
;
`;

  const typesTs = [vidTypesTs, nameTypesTs].map((s) => s.trim()).join('\n\n');

  return { constTs, typesTs };
}

async function generateVidJsonFromMarkdown(
  out: 'markdown',
  kind: 'analog' | 'digital',
): Promise<void> {
  const sourcePath = resolve(
    ROOT_DIR,
    kind === 'analog'
      ? 'submodules/linuxhw-edid/AnalogDisplay.md'
      : 'submodules/linuxhw-edid/DigitalDisplay.md',
  );

  const outputDir = resolve(ROOT_DIR, 'data');
  const brandsJsonPath = resolve(outputDir, `${out}_${kind}_vid_brands.json`);
  const countsJsonPath = resolve(outputDir, `${out}_${kind}_vid_counts.json`);

  const vidToNameSetMap = new Map<string, Set<string>>();
  const vidCounts = new Map<string, number>();

  const input = createReadStream(sourcePath, {
    encoding: 'utf8',
    highWaterMark: 1 << 20,
  });

  const lines = createInterface({
    input,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of lines) {
    const start = line.indexOf('<');
    if (start === -1) {
      continue;
    }

    const end = line.indexOf('>', start);
    if (end === -1) {
      continue;
    }

    const extracted = line.slice(start, end + 1);
    const parts = extracted.split('/');
    if (!hasAtLeast3(parts)) {
      continue;
    }

    const brandName = sanitizeName(parts[1]);
    const modelCode = parts[2];

    if (!brandName || !modelCode || modelCode.length < 3) {
      continue;
    }

    const vid = modelCode.slice(0, 3);
    if (!is3LetterVid(vid)) {
      continue;
    }

    let nameSet = vidToNameSetMap.get(vid);
    if (!nameSet) {
      nameSet = new Set<string>();
      vidToNameSetMap.set(vid, nameSet);
    }

    if (brandName !== vid) {
      nameSet.add(brandName);
    }

    vidCounts.set(vid, (vidCounts.get(vid) ?? 0) + 1);
  }

  const vidToBrandsObj: Record<string, string[]> = {};
  for (const [vid, nameSet] of vidToNameSetMap) {
    if (nameSet.size > 0) {
      const nameArray = [...nameSet] as [string, ...string[]];
      vidToBrandsObj[vid] = nameArray;
    }
  }

  const vidCountObject: Record<string, number> = {};
  for (const [vid, count] of vidCounts) {
    vidCountObject[vid] = count;
  }

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJsonFile(brandsJsonPath, vidToBrandsObj),
    writeJsonFile(countsJsonPath, vidCountObject),
  ]);

  console.log(brandsJsonPath);
  console.log(countsJsonPath);
}

async function generateVidJsonFromEdidText(
  out: 'plaintext',
  kind: 'analog' | 'digital',
): Promise<void> {
  const outputDir = resolve(ROOT_DIR, 'data');
  const brandsPath = resolve(outputDir, `${out}_${kind}_vid_brands.json`);
  const countsPath = resolve(outputDir, `${out}_${kind}_vid_counts.json`);
  const displayTypeDir = kind === 'analog' ? 'Analog' : 'Digital';

  const vendors = new Map<string, Set<string>>();
  const vidCounts = new Map<string, number>();

  for await (const filePath of glob(
    `submodules/linuxhw-edid/${displayTypeDir}/*/*/*`,
    {
      cwd: ROOT_DIR,
    },
  )) {
    const parts = filePath.split('/');
    const brandName = sanitizeName(parts.at(-3) ?? '');
    const modelCode = parts.at(-2);

    if (!brandName || !modelCode || modelCode.length < 3) {
      continue;
    }

    const vid = modelCode.slice(0, 3);
    if (!is3LetterVid(vid)) {
      continue;
    }

    let nameSet = vendors.get(vid);
    if (!nameSet) {
      nameSet = new Set<string>();
      vendors.set(vid, nameSet);
    }

    if (brandName !== vid) {
      nameSet.add(brandName);
    }

    vidCounts.set(vid, (vidCounts.get(vid) ?? 0) + 1);
  }

  const vidToBrandsObj: Record<string, string[]> = {};
  for (const [vid, nameSet] of vendors) {
    if (nameSet.size > 0) {
      vidToBrandsObj[vid] = [...nameSet];
    }
  }

  const vidCountObject: Record<string, number> = {};
  for (const [vid, count] of vidCounts) {
    vidCountObject[vid] = count;
  }

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJsonFile(brandsPath, vidToBrandsObj),
    writeJsonFile(countsPath, vidCountObject),
  ]);

  console.log(brandsPath);
  console.log(countsPath);
}

async function updateLinuxhwDb(): Promise<void> {
  // Generate JSON files that will be merged into a single list.
  await generateVidJsonFromMarkdown('markdown', 'analog');
  await generateVidJsonFromMarkdown('markdown', 'digital');
  await generateVidJsonFromEdidText('plaintext', 'analog');
  await generateVidJsonFromEdidText('plaintext', 'digital');

  const digitalCounts = JSON.parse(
    await readFile('data/plaintext_digital_vid_counts.json', 'utf8'),
  ) as Record<string, number>;

  console.log();
  console.log('--------------------------------------------------------------');
  console.log();
  console.log('Top VIDs:');
  console.log();
  const countEntries = Object.entries(digitalCounts).sort(
    ([, a], [, b]) => b - a,
  );
  for (const [vid, count] of countEntries) {
    if (count < 100) {
      continue;
    }
    console.log(`${vid}: ${count}`);
  }
  console.log();
  console.log('--------------------------------------------------------------');
  console.log();
  console.log();
  console.log('Notable VIDs:');
  console.log();
  for (const curVid of NOTABLE_VENDORS.map(({ vid }) => vid)) {
    console.log(`${curVid}: ${digitalCounts[curVid]}`);
  }
  console.log();
  console.log('--------------------------------------------------------------');
  console.log();

  type NameCaseKind = 'none' | 'lower' | 'upper' | 'mixed';

  const classifyNameCase = (name: string): NameCaseKind => {
    let hasUppercase = false;
    let hasLowercase = false;

    for (let i = 0; i < name.length; i += 1) {
      const code = name.charCodeAt(i);

      if (code >= 65 && code <= 90) {
        hasUppercase = true;
      } else if (code >= 97 && code <= 122) {
        hasLowercase = true;
      }

      if (hasUppercase && hasLowercase) {
        return 'mixed';
      }
    }

    if (hasLowercase) {
      return 'lower';
    }

    if (hasUppercase) {
      return 'upper';
    }

    return 'none';
  };

  const allBrandFilePaths: string[] = [];
  for await (const filePath of glob('data/*_brands.json', { cwd: ROOT_DIR })) {
    allBrandFilePaths.push(filePath);
  }
  allBrandFilePaths.sort(caseInsensitive);

  const dataSets: Array<Record<string, string[]>> = await Promise.all(
    allBrandFilePaths.map(async (filePath) => {
      const raw = await readFile(resolve(ROOT_DIR, filePath), 'utf8');
      return JSON.parse(raw) as Record<string, string[]>;
    }),
  );

  const merged = new Map<
    string,
    Map<string, { name: string; kind: NameCaseKind }>
  >();

  for (const data of dataSets) {
    for (const [vid, brandNames] of Object.entries(data)) {
      let namesByCaseFold = merged.get(vid);
      if (!namesByCaseFold) {
        namesByCaseFold = new Map<
          string,
          { name: string; kind: NameCaseKind }
        >();
        merged.set(vid, namesByCaseFold);
      }

      for (const name of brandNames) {
        const key = name.toLowerCase();
        const existing = namesByCaseFold.get(key);
        const kind = classifyNameCase(name);
        if (!existing) {
          namesByCaseFold.set(key, { name, kind });
          continue;
        }

        if (existing.name === name) {
          continue;
        }

        if (kind === 'lower') {
          continue;
        }

        if (
          (existing.kind === 'lower' || existing.kind === 'upper') &&
          kind === 'mixed'
        ) {
          namesByCaseFold.set(key, { name, kind });
        }
      }
    }
  }

  const mergedEntries = new Array<[string, string]>();
  const mergedObject: Record<string, string[]> = {};
  for (const [vid, namesByCaseFold] of merged) {
    const names = [...namesByCaseFold.values()].map(({ name }) => name);
    if (hasAtLeast1(names)) {
      mergedObject[vid] = names;
      mergedEntries.push([vid, names[0]]);
    }
  }

  const { constTs, typesTs } = makeMapsAndTypes('linuxhw', mergedEntries);

  const constPath = resolve(ROOT_DIR, 'gen/vids/linuxhw-const.ts');
  const typesPath = resolve(ROOT_DIR, 'gen/vids/linuxhw-types.ts');

  await Promise.all([
    writeTextFile(constPath, constTs),
    writeTextFile(typesPath, typesTs),
  ]);

  console.log(constPath);
  console.log(typesPath);
}

async function updateLansweeperDb(): Promise<void> {
  const response = await fetch(
    'https://community.lansweeper.com/t5/managing-assets/list-of-3-letter-monitor-manufacturer-codes/ta-p/64429',
  );

  if (!response.ok) {
    console.error(
      'Failed to fetch Lansweeper list:',
      response.status,
      response.statusText,
    );
    return;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const $table = $('table');

  if ($table.length !== 1) {
    console.error(
      'Expected exactly 1 <table> element in Lansweeper HTML, but got:',
      $table.length,
    );
    return;
  }

  const entries = new Array<[string, string]>();

  $table.find('tr').each((_i, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find('td');
    const values = $tds.map((_j, td) => $(td).text().trim()).toArray();

    if (!isLength2(values)) {
      return;
    }

    const rowVids = values[0]
      .split(/\s+(or)\s+/g)
      .filter(isTruthy)
      .filter((vid) => vid.length === 3 && vid.toUpperCase() === vid);
    const name = sanitizeName(values[1]);

    for (const vid of rowVids) {
      entries.push([vid, name]);
    }
  });

  const { constTs, typesTs } = makeMapsAndTypes('lansweeper', entries);

  const constPath = resolve(ROOT_DIR, 'gen/vids/lansweeper-const.ts');
  const typesPath = resolve(ROOT_DIR, 'gen/vids/lansweeper-types.ts');

  await writeTextFile(constPath, constTs);
  await writeTextFile(typesPath, typesTs);

  console.log(constPath);
  console.log(typesPath);
}

async function updateHwdataDb(): Promise<void> {
  const pnpIdsPath = resolve(ROOT_DIR, 'submodules/hwdata-edid/pnp.ids');

  const input = createReadStream(pnpIdsPath, {
    encoding: 'utf8',
    highWaterMark: 1 << 20,
  });

  const lines = createInterface({
    input,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  const entries = new Array<[string, string]>();

  for await (const line of lines) {
    const firstTab = line.indexOf('\t');
    if (firstTab !== 3) {
      console.log({ firstTab });
      continue;
    }

    const vid = line.substring(0, 3);
    const name = sanitizeName(line.substring(4));

    if (!/^[A-Z]{3}$/.test(vid) || !name) {
      continue;
    }

    entries.push([vid, name]);
  }

  const { constTs, typesTs } = makeMapsAndTypes('hwdata', entries);

  const constPath = resolve(ROOT_DIR, 'gen/vids/hwdata-const.ts');
  const typesPath = resolve(ROOT_DIR, 'gen/vids/hwdata-types.ts');

  await writeTextFile(constPath, constTs);
  await writeTextFile(typesPath, typesTs);

  console.log(constPath);
  console.log(typesPath);
}

async function updateCustomDb(): Promise<void> {
  const entries = new Array<[string, string]>();

  for (const notableVendor of NOTABLE_VENDORS) {
    entries.push([notableVendor.vid, notableVendor.shortName]);
  }

  const { constTs, typesTs } = makeMapsAndTypes('acd', entries);

  const constPath = resolve(ROOT_DIR, 'gen/vids/acd-const.ts');
  const typesPath = resolve(ROOT_DIR, 'gen/vids/acd-types.ts');

  await writeTextFile(constPath, constTs);
  await writeTextFile(typesPath, typesTs);

  console.log(constPath);
  console.log(typesPath);
}

async function mergeVidTypes(): Promise<void> {
  const { ACD_VENDOR_MAP } = await import('../../gen/vids/acd-const');
  const { HWDATA_VENDOR_MAP } = await import('../../gen/vids/hwdata-const');
  const { LANSWEEPER_VENDOR_MAP } =
    await import('../../gen/vids/lansweeper-const');
  const { LINUXHW_VENDOR_MAP } = await import('../../gen/vids/linuxhw-const');

  const allEntries: Array<[string, string]> = [
    ...Object.entries(HWDATA_VENDOR_MAP),
    ...Object.entries(LANSWEEPER_VENDOR_MAP),
    ...Object.entries(LINUXHW_VENDOR_MAP),
    ...Object.entries(ACD_VENDOR_MAP),
  ];

  const { typesTs } = makeMapsAndTypes('merged', allEntries);

  const typesPath = resolve(ROOT_DIR, 'gen/vids/merged-vid-types.ts');

  await writeTextFile(typesPath, typesTs);

  console.log(typesPath);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  // User-submitted real-world EDID dumps.
  // https://github.com/linuxhw/EDID
  await updateLinuxhwDb();

  // Derived from UEFI CSV, with some custom patches applied.
  // https://github.com/vcrhonek/hwdata
  await updateHwdataDb();

  // Knowledge Base article, last updated in 2023.
  await updateLansweeperDb();

  // Custom names for popular/notable VIDs.
  await updateCustomDb();

  // Combine all VIDs and names into a single type definition.
  await mergeVidTypes();
}
