import pl from './content/pl.json';
import en from './content/en.json';

export interface GuideSection {
  title: string;
  paragraphs?: string[];
  steps?: string[];
  example?: string;
  tip?: string;
}
export interface GuideChapter {
  id: string;
  title: string;
  summary: string;
  admin?: boolean;
  image?: { file: string; alt: string; caption: string };
  sections: GuideSection[];
}

export function guideChapters(language: string): GuideChapter[] {
  return language.startsWith('pl') ? pl : en;
}

export function searchGuide(chapters: GuideChapter[], query: string): GuideChapter[] {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ł/g, 'l');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return chapters.filter((chapter) => {
    const text = normalize(
      [
        chapter.title,
        chapter.summary,
        ...chapter.sections.flatMap((section) => [
          section.title,
          ...(section.paragraphs ?? []),
          ...(section.steps ?? []),
          section.example ?? '',
          section.tip ?? '',
        ]),
      ].join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}
