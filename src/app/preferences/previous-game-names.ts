export function previousGameNames(currentName: string | null | undefined, names: unknown): readonly string[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  if (currentName) seen.add(currentName.trim().toLowerCase());

  const previous: string[] = [];
  for (const value of names) {
    if (typeof value !== 'string') continue;
    const name = value.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    previous.push(name);
  }
  return previous;
}
