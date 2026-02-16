export function howMany(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

export function getAllMatches(
  subject: string,
  regex: RegExp,
): RegExpExecArray[] {
  if (!regex.global) {
    throw new Error('The provided RegExp must have the global flag set.');
  }

  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  // Use RegExp.exec() to iterate over all matches
  while ((match = regex.exec(subject)) !== null) {
    matches.push(match);
  }

  return matches;
}
