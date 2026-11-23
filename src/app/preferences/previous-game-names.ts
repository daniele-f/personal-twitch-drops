export function previousGameNames(currentName: string | null | undefined, names: unknown): readonly string[] {
  if (!Array.isArray(names)) return [];
  return [...new Set(names
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name && name !== currentName?.trim()))];
}
