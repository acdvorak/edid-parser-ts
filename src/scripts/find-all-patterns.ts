import { glob, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '../../');

interface FindEdidOptions {
  cwd?: string;
  globPattern?: string;
}

/**
 * Recursively globs files and prints paths for files containing all substrings.
 */
export async function printFilesContainingAllSubstrings(
  patterns: RegExp[],
  options: FindEdidOptions = {},
): Promise<string[]> {
  const cwd = options.cwd ?? ROOT_DIR;
  const globPattern =
    options.globPattern ?? 'submodules/linuxhw-edid/Digital/**/*';

  const matchedPaths: string[] = [];

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

    if (patterns.every((regex) => regex.test(fileText))) {
      matchedPaths.push(relativePath);
      console.log(relativePath);
    }
  }

  return matchedPaths;
}

/**
 * Finds matches in submodules/linuxhw-edid/Digital/ recursively.
 */
export async function printDigitalFilesContainingAllSubstrings(
  patterns: string[],
): Promise<string[]> {
  return printFilesContainingAllSubstrings(
    patterns.map((pattern) => new RegExp(pattern)),
    {
      cwd: ROOT_DIR,
      globPattern: 'submodules/linuxhw-edid/Digital/**/*',
    },
  );
}

const maybeEntryPath = process.argv[1] ?? '';
const isEntrypoint =
  maybeEntryPath.length > 0 &&
  import.meta.url === pathToFileURL(resolve(maybeEntryPath)).href;

if (isEntrypoint) {
  const needles = process.argv.slice(2);

  if (needles.length === 0) {
    console.error(
      'Usage: tsx src/scripts/find-edids.ts <regex1> <regex2> [...regexN]',
    );
    process.exitCode = 1;
  } else {
    await printDigitalFilesContainingAllSubstrings(needles);
  }
}
