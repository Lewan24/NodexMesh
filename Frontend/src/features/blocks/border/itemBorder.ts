import type { ItemBorder } from '@/entities/board/types';

const hex = /^#[\da-f]{6}$/i;
export function validItemBorder(value: unknown): value is ItemBorder {
  if (!value || typeof value !== 'object') return false;
  const border = value as ItemBorder;
  return (
    Number.isFinite(border.width) &&
    border.width >= 0 &&
    border.width <= 20 &&
    hex.test(border.color) &&
    ['solid', 'dashed', 'dotted', 'double'].includes(border.style) &&
    (border.animation === undefined || ['none', 'pulse'].includes(border.animation)) &&
    (!border.gradient ||
      (border.style === 'solid' &&
        hex.test(border.gradient.from) &&
        hex.test(border.gradient.to) &&
        Number.isFinite(border.gradient.angle) &&
        border.gradient.angle >= 0 &&
        border.gradient.angle <= 360))
  );
}

/** An inset overlay preserves the item's saved and measured geometry. */
export function itemBorderRule(border: ItemBorder | undefined, scope: string): string {
  if (!validItemBorder(border) || !border.width || !/^[\w-]+$/.test(scope)) return '';
  const target = `[data-item-css-scope="${scope}"] > :not(style):not(dialog)`;
  const name = `border-${scope}-pulse`;
  const gradient = border.gradient;
  return `
    ${target}:not(.absolute):not(.fixed) { position: relative; }
    ${target}::after {
      content: ''; position: absolute; inset: 0; box-sizing: border-box;
      pointer-events: none; z-index: 30; border-radius: var(--radius-xs, 2px);
      ${
        gradient
          ? `padding: ${border.width}px; background: linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to});
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;`
          : `border: ${border.width}px ${border.style} ${border.color};`
      }
      ${border.animation === 'pulse' ? `animation: ${name} 2s ease-in-out infinite;` : ''}
    }
    ${
      border.animation === 'pulse'
        ? `@keyframes ${name} { 50% { opacity: .4; } }
      @media (prefers-reduced-motion: reduce) { ${target}::after { animation: none; } }`
        : ''
    }
  `;
}
