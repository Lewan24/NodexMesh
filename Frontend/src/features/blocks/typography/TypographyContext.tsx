import { createContext, useContext } from 'react';
import type { TypographySettings, TextSection } from '@/entities/board/types';
import { getSectionStyle } from './sectionTypography';
export const TypographyContext = createContext<TypographySettings | undefined>(undefined);
export function useSectionStyle(section: TextSection) {
  return getSectionStyle(useContext(TypographyContext), section);
}
