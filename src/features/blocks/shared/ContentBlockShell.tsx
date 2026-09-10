import type { ReactNode, CSSProperties } from "react"
import type { BaseItem } from "@/entities/board/types"
import { getFontFamilyCss } from '../typography/typographyUtils';
import { isLightColor } from '../kanban/utils/kanbanUtils';

export default function ContentBlockShell({
  item,
  title,
  children,
  onDelete,
  autoHeight = false,
  minHeight = 120,
}: {
  item: BaseItem
  title: ReactNode
  children: ReactNode
  onDelete: () => void
  autoHeight?: boolean
  minHeight?: number
}) {
  return (
    <section
      className="content-block-shell item-rounded shadow-xl border flex flex-col overflow-hidden"
      style={{
        width: item.width,

        height:
          autoHeight
            ? undefined
            : item.height,

        minHeight,

        background:
          item.color ??
          "var(--color-surface)",

        borderColor:
          "var(--color-border)",

        color:
          item.color
            ? (
                isLightColor(item.color)
                  ? '#1e293b'
                  : '#f8fafc'
              )
            : "var(--color-text-primary)",

        fontFamily:
          getFontFamilyCss(
            item.typography?.fontFamily,
          ),

        fontSize:
          item.typography?.fontSize,

        '--block-font-size':
          item.typography?.fontSize
            ? `${item.typography.fontSize}px`
            : undefined,

        '--block-background':
          item.color ??
          'var(--color-surface)',

        fontWeight:
          item.typography?.bold
            ? 700
            : undefined,

        fontStyle:
          item.typography?.italic
            ? 'italic'
            : undefined,

        textAlign:
          item.typography?.textAlign,
      } as CSSProperties}
    >
      {item.topColor && <div className="h-[5px] shrink-0" style={{ background: item.topColor }} />}
      <header
        className="flex items-center gap-2 px-4 py-2 border-b cursor-grab text-sm font-medium"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          aria-hidden="true"
          className="opacity-35 select-none"
          title="Drag block"
        >
          ⠿
        </span>
        <div className="flex-1 min-w-0">{title}</div>
        <button
          type="button"
          title="Delete block"
          aria-label="Delete block"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="px-2 rounded hover:bg-black/10"
        >
          ×
        </button>
      </header>
      {children}
    </section>
  )
}
