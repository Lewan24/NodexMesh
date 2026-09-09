import type { ReactNode } from "react"
import type { BaseItem } from "@/entities/board/types"

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
      className="rounded-xl shadow-xl border flex flex-col overflow-hidden"
      style={{
        width: item.width,
        height: autoHeight ? undefined : item.height,
        minHeight: autoHeight ? item.height ?? minHeight : minHeight,
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        color: "var(--color-text-primary)",
      }}
    >
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
