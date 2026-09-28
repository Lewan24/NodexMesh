import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pl from './locales/pl.json';

export type Language = 'pl' | 'en';
export const languageKey = 'nodexmesh_language';
export function readLanguage(storage?: Pick<Storage, 'getItem'>): Language {
  try {
    return storage?.getItem(languageKey) === 'en' ? 'en' : 'pl';
  } catch {
    return 'pl';
  }
}
function browserLanguage(): Language {
  try {
    return readLanguage(globalThis.localStorage);
  } catch {
    return 'pl';
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: { pl: { translation: pl }, en: { translation: en } },
    lng: browserLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['pl', 'en'],
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

function updateDocument(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}
updateDocument(i18n.language);
i18n.on('languageChanged', (language) => {
  updateDocument(language);
  try {
    globalThis.localStorage?.setItem(languageKey, language);
  } catch {
    /* Language still works without storage. */
  }
});

export function translate(key: string, values?: Record<string, unknown>): string {
  return i18n.t(key, values ?? {}) as string;
}
export function locale(): string {
  return i18n.resolvedLanguage === 'pl' ? 'pl-PL' : 'en-GB';
}
export async function changeLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
}
export default i18n;

const displayLabels: Record<string, string> = {
  star: 'Star',
  heart: 'Heart',
  check: 'Check mark',
  cross: 'Cross',
  plus: 'Plus',
  'arrow-right': 'Right arrow',
  'arrow-down': 'Down arrow',
  warning: 'Warning',
  info: 'Information',
  help: 'Help',
  idea: 'Idea',
  rocket: 'Rocket',
  flag: 'Flag',
  target: 'Target',
  trophy: 'Trophy',
  fire: 'Fire',
  lightning: 'Lightning',
  smile: 'Smile',
  home: 'Home',
  team: 'Team',
  mail: 'Mail',
  phone: 'Phone',
  calendar: 'Calendar',
  clock: 'Clock',
  folder: 'Folder',
  globe: 'Globe',
  settings: 'Settings',
  lock: 'Lock',
  cloud: 'Cloud',
  music: 'Music',
  camera: 'Camera',
  md: 'Medium',
  xl: 'Extra large',
  select: 'Select',
  from: 'From',
  to: 'To',
  todo: 'To do',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  owner: 'Owner',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
  admin: 'Administrator',
  user: 'User',
  users: 'Users',
  projects: 'Projects',
  board: 'Board',
  drawing: 'Drawing',
  timeline: 'Timeline',
  diagram: 'Diagram',
  mindmap: 'Mind map',
  database: 'Database diagram',
  document: 'Document',
  code: 'Code',
  embed: 'Embed',
  dispenser: 'Note dispenser',
  note: 'Note',
  kanban: 'Kanban',
  icon: 'Icon',
  image: 'Image',
  file: 'File',
  link: 'Link',
  'section-title': 'Section title',
  text: 'Text',
  frame: 'Frame',
  checklist: 'Checklist',
  line: 'Line/Arrow',
  column: 'Column',
  light: 'Light',
  dark: 'Dark',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
  up: 'Up',
  down: 'Down',
  center: 'Center',
  primary: 'Primary',
  secondary: 'Secondary',
  canvas: 'Canvas',
  default: 'Default',
  accent1: 'Accent 1',
  accent2: 'Accent 2',
  accent3: 'Accent 3',
  accent4: 'Accent 4',
  accent5: 'Accent 5',
  sm: 'Small',
  base: 'Medium',
  lg: 'Large',
  preset: 'Preset',
  emoji: 'Emoji',
  url: 'URL',
  svg: 'SVG',
};
/** Localize protocol labels without changing the stored value. */
export function displayLabel(value: string): string {
  return translate(displayLabels[value.toLowerCase()] ?? value);
}
