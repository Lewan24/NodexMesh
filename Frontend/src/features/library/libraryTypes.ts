export interface LibraryAsset {
  id: string;
  name: string;
  contentType: string;
  size: number;
  shared: boolean;
  sharePath?: string | null;
}

export interface ProjectLibrary {
  assets: LibraryAsset[];
  canManage: boolean;
  canShare: boolean;
}
