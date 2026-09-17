import type { BoardItem } from '@/entities/board/types';
import type { ItemAppearance, ItemDataMap, ItemLink, Revision } from '@/entities/board/records';

/** Matches the API's ProjectRole exactly (see Backend/docs/API.md §5). Owner is never
 * assignable through the invite/role endpoints — it always comes from ProjectRecord.ownerId. */
export type MemberRole = 'Editor' | 'Commenter' | 'Viewer';

export interface ProjectMember {
  userId: string;
  /** Masked to e.g. "a***e@example.com" for everyone except the project owner and the
   * member's own row — see API.md §6.2. Never assume this is the full address. */
  email: string;
  displayName: string | null;
  role: MemberRole;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  projectId: string;
  label: string | null;
  createdAt: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  isActive: boolean;
}

/** Returned only once, at creation — the raw token is unrecoverable afterwards. */
export interface CreatedShareLink {
  link: ShareLink;
  token: string;
}

// ---------------- anonymous, read-only ----------------

export interface PublicProject {
  id: string;
  name: string;
  color: string | null;
  updatedAt: string;
}

export interface PublicBoard {
  id: string;
  name: string;
  sortOrder: number;
}

/** Deliberately narrower than ItemRecord: no createdBy/updatedBy/deletedAt (user GUIDs a
 * public viewer has no use for and shouldn't see). */
export type PublicItem = {
  [K in keyof ItemDataMap]: {
    id: string;
    boardId: string;
    parentItemId: string | null;
    frameId: string | null;
    sortOrder: number;
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    zIndex: number;
    locked: boolean;
    type: K;
    schemaVersion: 1;
    appearance: ItemAppearance;
    data: ItemDataMap[K];
    revision: Revision;
    updatedAt: string;
  };
}[keyof ItemDataMap];

export interface PublicAppearance {
  font: string;
  light: Record<string, unknown> | null;
  dark: Record<string, unknown> | null;
}

export interface PublicBoardSnapshot {
  project: PublicProject;
  board: PublicBoard;
  items: PublicItem[];
  links: ItemLink[];
  tags: { id: string; projectId: string; name: string; normalizedName: string }[];
  itemTags: { itemId: string; tagId: string }[];
  appearance: PublicAppearance | null;
}

export interface PublicProjectSnapshot {
  project: PublicProject;
  boards: PublicBoard[];
}

/** Read-only canvas projection for the public viewer — the same shape as the
 * authenticated `Project` type, minus fields a public viewer has no use for. */
export interface PublicProjectView {
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
}
