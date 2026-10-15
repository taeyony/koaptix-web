/** Match every entered word against one real name; never invent an alias. */
export function compactComplexName(value: unknown): string {
  return String(value ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

export function getComplexNameSearchTerms(query: string): string[] {
  const compact = compactComplexName(query);
  const terms = [...new Set(query.normalize("NFC").trim().toLowerCase().split(/\s+/).filter(Boolean))];
  return compact.length >= 2 && compact.length <= 100 && terms.length <= 8 ? terms : [];
}

export function matchesComplexNameQuery(name: unknown, query: string): boolean {
  const terms = getComplexNameSearchTerms(query);
  const normalized = compactComplexName(name);
  if (terms.length > 0 && terms.every(term => normalized.includes(term))) return true;
  const parts = getComplexNameAbbreviationParts(query);
  let offset = 0;
  return parts.length > 0 && parts.every(part => {
    const index = normalized.indexOf(part, offset);
    if (index < 0) return false;
    offset = index + part.length;
    return true;
  });
}

/** A bounded omitted-middle search: keep the first/last two characters intact. */
export function getComplexNameAbbreviationParts(query: string): string[] {
  const terms = getComplexNameSearchTerms(query);
  if (terms.length !== 1 || !/^[가-힣0-9]{4,16}$/.test(terms[0])) return [];
  const term = terms[0];
  return [term.slice(0, 2), ...term.slice(2, -2), term.slice(-2)];
}
