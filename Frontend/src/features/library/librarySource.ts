const referencePattern = /^library:\/\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i;
export function parseLibrarySource(value: string) {
  const match = referencePattern.exec(value);
  return match ? { projectId: match[1], id: match[2] } : null;
}
export const librarySource = (projectId: string, id: string) => `library://${projectId}/${id}`;
