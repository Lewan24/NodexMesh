export interface ProjectStatus {
  id: string;
  title: string;
  description?: string;
  customCss?: { enabled: boolean; source: string };
}
