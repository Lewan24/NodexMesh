import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import type { ToolType } from '@/entities/board/toolTypes';
import { Star } from 'lucide-react';

interface ToolDragGhostProps {
  color?: string;
  tool: ToolType;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
}

interface GhostConfig {
  label: string;
  width: number;
  height: number;
}

const GHOST_CONFIG: Partial<Record<ToolType, GhostConfig>> = {
  timeline: {
    get label() {
      return translate('Timeline');
    },
    width: 260,
    height: 160,
  },
  database: {
    get label() {
      return translate('Database diagram');
    },
    width: 280,
    height: 180,
  },
  mindmap: {
    get label() {
      return translate('Mind map');
    },
    width: 300,
    height: 180,
  },
  diagram: {
    get label() {
      return translate('Diagram');
    },
    width: 260,
    height: 180,
  },
  document: {
    get label() {
      return translate('Document');
    },
    width: 240,
    height: 170,
  },
  embed: {
    get label() {
      return translate('Embed');
    },
    width: 240,
    height: 140,
  },
  code: {
    get label() {
      return translate('Code');
    },
    width: 220,
    height: 140,
  },
  dispenser: {
    get label() {
      return translate('Note dispenser');
    },
    width: 180,
    height: 130,
  },
  divider: {
    get label() {
      return translate('Divider');
    },
    width: 180,
    height: 36,
  },
  note: {
    get label() {
      return translate('Note');
    },
    width: 180,
    height: 110,
  },
  kanban: {
    get label() {
      return translate('Kanban');
    },
    width: 260,
    height: 150,
  },
  icon: {
    get label() {
      return translate('Icon / Emoji');
    },
    width: 96,
    height: 96,
  },
  image: {
    get label() {
      return translate('Image');
    },
    width: 200,
    height: 125,
  },
  link: {
    get label() {
      return translate('Link');
    },
    width: 200,
    height: 100,
  },
  text: {
    get label() {
      return translate('Text');
    },
    width: 150,
    height: 48,
  },
  frame: {
    get label() {
      return translate('Frame');
    },
    width: 260,
    height: 160,
  },
  checklist: {
    get label() {
      return translate('Checklist');
    },
    width: 190,
    height: 125,
  },
  column: {
    get label() {
      return translate('Column');
    },
    width: 210,
    height: 150,
  },
  line: {
    get label() {
      return translate('Line');
    },
    width: 180,
    height: 36,
  },
};

export default function ToolDragGhost({ color, tool, clientX, clientY, overCanvas }: ToolDragGhostProps) {
  useTranslation();
  const config = GHOST_CONFIG[tool];

  if (!config || tool === 'select') return null;

  if (tool === 'icon') {
    return (
      <div
        className="fixed pointer-events-none"
        style={{ left: clientX + 10, top: clientY + 10, zIndex: 9999, opacity: 0.7 }}
      >
        <Star size={96} color="var(--color-accent)" />
      </div>
    );
  }

  if (tool === 'line' || tool === 'divider') {
    return (
      <div
        className="fixed pointer-events-none"
        style={{
          left: clientX + 10,
          top: clientY,
          width: config.width,
          height: config.height,
          zIndex: 9999,
          opacity: overCanvas ? 0.9 : 0.55,
          transition: 'opacity 100ms ease',
        }}
      >
        <div
          className="absolute left-0 right-0 top-1/2"
          style={{
            height: 2,
            backgroundColor: 'var(--color-accent)',
            boxShadow: overCanvas ? '0 0 10px rgba(124,58,237,0.35)' : 'none',
          }}
        />

        {tool === 'line' && (
          <div
            className="absolute right-0 top-1/2"
            style={{
              width: 8,
              height: 8,
              borderTop: '2px solid var(--color-accent)',
              borderRight: '2px solid var(--color-accent)',
              transform: 'translateY(-50%) rotate(45deg)',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: clientX + 10,
        top: clientY + 10,
        width: config.width,
        height: config.height,
        zIndex: 9999,
        opacity: overCanvas ? 0.82 : 0.5,
        transform: overCanvas ? 'scale(1)' : 'scale(0.96)',
        transformOrigin: 'top left',
        borderRadius: 16,
        border: overCanvas ? '2px solid var(--color-accent)' : '2px dashed var(--color-border)',
        backgroundColor: color ?? 'var(--color-surface-translucent)',
        boxShadow: overCanvas
          ? '0 12px 36px rgba(0,0,0,0.18), 0 0 0 3px rgba(124,58,237,0.08)'
          : '0 8px 20px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(8px)',
        transition: 'opacity 100ms ease, transform 100ms ease, border-color 100ms ease',
      }}
    >
      {tool === 'frame' ? (
        <div
          className="absolute inset-2 rounded-xl"
          style={{ border: '2px dashed var(--color-accent)', backgroundColor: 'rgba(124,58,237,0.05)' }}
        />
      ) : (
        <>
          <div style={{ height: 5, backgroundColor: 'var(--color-accent)', borderRadius: '14px 14px 0 0' }} />

          <div className="p-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {config.label}
            </span>

            <GhostContent tool={tool} />
          </div>
        </>
      )}
    </div>
  );
}

function GhostContent({ tool }: { tool: ToolType }) {
  useTranslation();
  switch (tool) {
    case 'note':
      return (
        <div className="mt-3 space-y-2">
          <GhostLine width="90%" />
          <GhostLine width="72%" />
          <GhostLine width="82%" />
        </div>
      );

    case 'image':
      return (
        <div
          className="mt-2 rounded-lg"
          style={{ height: 65, backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
        />
      );

    case 'link':
      return (
        <div className="mt-3 space-y-2">
          <GhostLine width="75%" />
          <GhostLine width="55%" />
        </div>
      );

    case 'text':
      return <GhostLine width="80%" />;

    case 'checklist':
      return (
        <div className="mt-3 space-y-2">
          <GhostChecklistRow />
          <GhostChecklistRow />
          <GhostChecklistRow />
        </div>
      );

    case 'kanban':
      return (
        <div className="flex gap-2 mt-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex-1 rounded-lg"
              style={{
                height: 75,
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            />
          ))}
        </div>
      );

    case 'column':
      return (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-lg"
              style={{
                height: 24,
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
}

function GhostLine({ width }: { width: string }) {
  useTranslation();
  return <div className="rounded-full" style={{ width, height: 6, backgroundColor: 'var(--color-border)' }} />;
}

function GhostChecklistRow() {
  useTranslation();
  return (
    <div className="flex items-center gap-2">
      <div className="rounded" style={{ width: 10, height: 10, border: '1px solid var(--color-text-faint)' }} />

      <GhostLine width="70%" />
    </div>
  );
}
