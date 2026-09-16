export function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase();
}

export function addTag(tags: string[] | undefined, value: string): string[] {
  const normalized = normalizeTag(value);

  if (!normalized) {
    return tags ?? [];
  }

  const current = tags ?? [];

  if (current.includes(normalized)) {
    return current;
  }

  return [...current, normalized];
}

export function removeTag(tags: string[] | undefined, tag: string): string[] {
  return (tags ?? []).filter((current) => current !== tag);
}

export function renameTag(tags: string[] | undefined, previousTag: string, nextValue: string): string[] {
  const normalized = normalizeTag(nextValue);

  if (!normalized) {
    return removeTag(tags, previousTag);
  }

  return Array.from(new Set((tags ?? []).map((tag) => (tag === previousTag ? normalized : tag))));
}
