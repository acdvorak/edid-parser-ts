import { toTitleCase } from 'titlecase';

const COMPANY_SUFFIX_CANONICAL = new Map<string, string>([
  // German term for "stock corporation".
  // Used in Germany, Austria, and Switzerland.
  ['ag', 'AG'],
  // Danish term for a "private limited liability company".
  // Similar to a "Ltd." in the UK or an "LLC" in the United States.
  ['aps', 'ApS'],
  // A "joint-stock company" or "public limited company".
  // Common in Norway, Denmark, Slovakia, and the Czech Republic.
  ['as', 'A.S.'],
  // Dutch term for a private limited liability company.
  // Used in the Netherlands and Belgium.
  ['bv', 'BV'],
  // English abbreviation of "company", a generic, non-specific term that does
  // not define the legal structure.
  // Used in the United States.
  ['co', 'Co.'],
  // English abbreviation of "corporation", signifying that the business is a
  // legal entity separate from its owners (shareholders).
  // Used in the United States.
  ['corp', 'Corp.'],
  // Icelandic term for a private limited company.
  ['ehf', 'Ehf.'],
  // German term meaning "company with limited liability".
  // Used in Germany, Austria, and Switzerland
  ['gmbh', 'GmbH'],
  // Icelandic term for a public limited company.
  // Similar to "PLC" in the UK or "Inc." in the US.
  ['hf', 'hf.'],
  // English abbreviation of "incorporated", indicating that a business is
  // legally registered as a corporation with a state government.
  // Used in the United States.
  ['inc', 'Inc.'],
  // English abbreviation of "international".
  ['intl', `Int'l`],
  // German abbreviation for "Kommanditgesellschaft" (limited partnership).
  // Used in Germany, Austria, and Switzerland.
  ['kg', 'KG'],
  // English abbreviation for "limited liability company".
  // Used in the United States.
  ['llc', 'LLC'],
  // English abbreviation for "limited liability partnership".
  // Used in the United States and the United Kingdom.
  ['llp', 'LLP'],
  // English abbreviation for "limited".
  // Used in the United Kingdom, Canada, and India.
  ['ltd', 'Ltd.'],
  // Portuguese/Spanish abbreviation for "Limitada" (limited company).
  // Used in Brazil and Portugal.
  ['ltda', 'Ltda.'],
  // Finnish abbreviation for "Osakeyhtiö" (limited company).
  // Used in Finland.
  ['oy', 'Oy'],
  // English abbreviation for "public limited company".
  // Used in the United Kingdom and Ireland.
  ['plc', 'PLC'],
  // English abbreviation for "private limited".
  // Used in India.
  ['ptl', 'PTL'],
  // English abbreviation for "private".
  // Used in Singapore and Malaysia.
  ['pte', 'Pte'],
  // English abbreviation for "proprietary" (proprietary limited company).
  // Used in Australia and South Africa.
  ['pty', 'Pty.'],
  // French/Spanish abbreviation for "Société Anonyme" / "Sociedad Anónima".
  // Used in France, Spain, and Switzerland.
  ['sa', 'SA'],
  // Malay abbreviation for "Sendirian Berhad" (private limited company).
  // Used in Malaysia.
  ['sdnbhd', 'Sdn. Bhd.'],
  // Spanish abbreviation for "Sociedad Limitada" (limited company).
  // Used in Spain.
  ['sl', 'S.L.'],
  // Italian abbreviation for "Società per Azioni" (joint-stock company).
  // Used in Italy.
  ['spa', 'S.p.A.'],
  // Italian abbreviation for "Società a responsabilità limitata".
  // Used in Italy.
  ['srl', 'S.r.l.'],
  // Czech/Slovak abbreviation for "společnost s ručením omezeným".
  // Used in the Czech Republic and Slovakia.
  ['sro', 's.r.o.'],
  // English contraction of "international".
  // Used in the United States and Canada.
  [`int'l`, `Int'l`],
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSuffixPatternFromKey(key: string): string {
  const chars = key.toLowerCase().replace(/[\u2019]/g, `'`);
  let pattern = '';

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i] ?? '';
    const nextChar = chars[i + 1];

    if (char === `'`) {
      pattern += `(?:['\u2019]|[./])?`;
      continue;
    }

    pattern += /[a-z0-9]/.test(char) ? char : escapeRegex(char);

    if (nextChar && /[a-z0-9]/.test(char) && /[a-z0-9]/.test(nextChar)) {
      pattern += '[./]?';
    }
  }

  return pattern;
}

function buildSpacedSuffixPatternFromCanonical(
  canonical: string,
): string | null {
  const words = canonical
    .toLowerCase()
    .replace(/[\u2019]/g, `'`)
    .split(/\s+/)
    .map((word: string) => word.replace(/[^a-z0-9']/g, ''))
    .filter((word: string) => word.length > 0);

  if (words.length < 2) {
    return null;
  }

  return words.map(buildSuffixPatternFromKey).join('(?:\\s+|[./])*');
}

function buildCompanySuffixRegex(
  suffixCanonical: ReadonlyMap<string, string>,
): RegExp {
  const patterns = new Set<string>();

  for (const [key, canonical] of suffixCanonical) {
    patterns.add(buildSuffixPatternFromKey(key));

    const spacedPattern = buildSpacedSuffixPatternFromCanonical(canonical);
    if (spacedPattern) {
      patterns.add(spacedPattern);
    }
  }

  const sortedPatterns = [...patterns].sort(
    (a: string, b: string) => b.length - a.length,
  );

  return new RegExp(
    `(?<!\\w)(?:${sortedPatterns.join('|')})[./]?(?!\\w)`,
    'gi',
  );
}

function buildCompanyCoLtdRegex(
  suffixCanonical: ReadonlyMap<string, string>,
): RegExp {
  const coPatterns: string[] = [];
  const ltdPatterns: string[] = [];

  for (const [key, canonical] of suffixCanonical) {
    if (getCompanySuffixLookupKey(canonical) === 'co') {
      coPatterns.push(buildSuffixPatternFromKey(key));
    }

    if (getCompanySuffixLookupKey(canonical) === 'ltd') {
      ltdPatterns.push(buildSuffixPatternFromKey(key));
    }
  }

  if (coPatterns.length === 0 || ltdPatterns.length === 0) {
    return /a^/gi;
  }

  coPatterns.sort((a: string, b: string) => b.length - a.length);
  ltdPatterns.sort((a: string, b: string) => b.length - a.length);

  return new RegExp(
    `(?<!\\w)(?:${coPatterns.join('|')})[./]?\\s*,?\\s*(?:${ltdPatterns.join('|')})[./]?(?!\\w)`,
    'gi',
  );
}

const COMPANY_SUFFIX_REGEX = buildCompanySuffixRegex(COMPANY_SUFFIX_CANONICAL);
const COMPANY_CO_LTD_REGEX = buildCompanyCoLtdRegex(COMPANY_SUFFIX_CANONICAL);

function getCompanySuffixLookupKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[./\s]/g, '')
    .replace(/[\u2019]/g, `'`);
}

export function normalizeCompanySuffixes(str: string): string {
  let clean = str.replace(COMPANY_SUFFIX_REGEX, (match: string) => {
    const canonical = COMPANY_SUFFIX_CANONICAL.get(
      getCompanySuffixLookupKey(match),
    );

    if (!canonical) {
      return match;
    }

    return ` ${canonical} `;
  });

  clean = clean.replace(COMPANY_CO_LTD_REGEX, ' Co., Ltd. ');

  // Shorten
  clean = clean
    .replace(/\b(Company)\b/gi, 'Co.')
    .replace(/\b(Corporation)\b/gi, 'Corp.')
    .replace(/\b(Limited)\b/gi, 'Ltd.');

  clean = clean.replace(/\bCo\.?(?:\s*[.,]\s*)*Ltd\.?\b/gi, 'Co., Ltd.');

  clean = clean.replace(/[.]{2,}/g, '.');

  clean = clean.replace(/\s{2,}/g, ' ').trim();

  return clean;
}

export function sanitizeName(str: string): string {
  let clean = str
    // Replace non-breaking spaces with regular spaces
    .replaceAll('\u00a0', ' ')
    // Replace figure dash, en dash, and em dash with regular hyphen
    .replaceAll(`‒`, '-')
    .replaceAll(`–`, '-')
    .replaceAll(`—`, '-')
    // Replace smart quotes with dumb quotes
    .replace(/[‘’]/g, `'`)
    .replace(/[“”]/g, `"`)
    // Remove underscores
    .replaceAll('_', '')
    // Remove trailing periods and commas
    .replace(/[,.]+$/, '')
    // Remove leading non-word chars
    .replace(/^\W+/, '')
    // Trim
    .trim();

  // Convert to Title Case if there are multiple words and they're all lowercase
  // or all uppercase.
  if (
    clean.includes(' ') &&
    (clean.toUpperCase() === clean || clean.toLowerCase() === clean)
  ) {
    clean = toTitleCase(clean.toLowerCase());
  }

  // Fix typos
  clean = clean
    .replace('Insturment', 'Instrument')
    .replace('Corpration', 'Corporation')
    .replace('Enterpise', 'Enterprise')
    .replace('Institut f r angewandte', 'Institut fur angewandte')
    .replaceAll('U. S.', 'U.S.');

  clean = normalizeCompanySuffixes(clean)
    .replace(/\s{2,}/g, ' ')
    .trim();

  clean = clean
    // Add missing space after comma
    .replace(/,(?=\w)/g, ', ')
    // Remove space before comma/period
    .replace(/ ([,.])/, '$1')
    // Replace two or more chars with a single one
    .replace(/\s{2,}/g, ' ')
    .replace(/,{2,}/g, ',')
    .replace(/[.]{2,}/g, '.')
    // Remove spaces within parens
    .replaceAll('( ', '(')
    .replaceAll(' )', ')');

  // Custom replacements
  clean = clean
    .replace(/^Lacie/i, 'LaCie')
    .replace(/^Mitac/i, 'MiTAC')
    .replace(/^Gigabyte Technology/i, 'Gigabyte')
    .replace(/^FCL COMPONENTS/i, 'FCL Components')
    .replace(/^G2TOUCH KOREA/i, 'G2Touch Korea')
    .replace(/^HKC OVERSEAS/i, 'HKC Overseas')
    .replace(/^DOME Imaging Systems/i, 'Dome Imaging Systems')
    .replace(/^KDS USA/i, 'KDS USA')
    .replace(/^ADLAS \/ AZALEA/i, 'ADLAS / AZALEA')
    .replace('/iEi', '/ iEi');

  // Remove placeholder names
  clean = clean.replace(/^(Other|Others)$/, '');

  clean = clean.trim();

  if (
    /Do not use/i.test(clean) ||
    /Indicates an identity defined by/i.test(clean)
  ) {
    return '';
  }

  return clean;
}
