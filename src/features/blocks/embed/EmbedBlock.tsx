import { useState } from "react"
import type { EmbedItem } from "@/entities/board/types"
import type { BlockUpdateHandler } from "../types"
import ContentBlockShell from "../shared/ContentBlockShell"
import { getEmbedUrl } from "./embedUrl"

export default function EmbedBlock({
  item,
  onUpdate,
  onDelete,
}: {
  item: EmbedItem
  onUpdate: BlockUpdateHandler
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(!item.url)
  const [interactive, setInteractive] = useState(false)
  const [draft, setDraft] = useState(item.url)
  const [error, setError] = useState("")
  const src = getEmbedUrl(item.url)
  const update = (patch: Partial<EmbedItem>) =>
    onUpdate((current) =>
      current.type === "embed" ? { ...current, ...patch } : current,
    )
  return (
    <ContentBlockShell
      item={item}
      onDelete={onDelete}
      title={
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate">
            {item.showLabel ? item.title || "Embed" : "Embed"}
          </span>
          <button
            className="text-xs px-2"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              setDraft(item.url)
              setEditing(!editing)
            }}
          >
            Settings
          </button>
          {src && (
            <button
              className="text-xs px-2"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setInteractive(!interactive)}
            >
              {interactive ? "Move" : "Interact"}
            </button>
          )}
        </div>
      }
    >
      {editing ? (
        <form
          className="p-4 space-y-3 text-sm overflow-auto"
          data-wheel-scroll="true"
          onMouseDown={(e) => { if ((e.target as HTMLElement).closest('input, button, label')) e.stopPropagation() }}
          onSubmit={(e) => {
            e.preventDefault()
            if (!getEmbedUrl(draft)) {
              setError("Enter a valid website or video URL (https://…).")
              return
            }
            update({ url: draft })
            setError("")
            setEditing(false)
          }}
        >
          <label className="block">
            Website or video URL
            <input
              aria-label="Embed URL"
              className="block w-full p-2 mt-1 rounded border bg-transparent"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={item.showLabel}
              onChange={(e) => update({ showLabel: e.target.checked })}
            />{" "}
            Show label
          </label>
          {item.showLabel && (
            <input
              aria-label="Embed label"
              className="w-full p-2 border rounded bg-transparent"
              placeholder="Label"
              value={item.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          )}
          {error && (
            <p role="alert" className="text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="rounded px-3 py-2 bg-violet-600 text-white"
          >
            Apply
          </button>
          <p className="text-xs opacity-60">
            Some websites do not allow embedding. Use Open in new tab if the
            preview is unavailable.
          </p>
        </form>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-0 bg-black/5">
            {src && (
              <iframe
                key={src}
                title={item.title || "Embedded content"}
                src={src}
                className="w-full h-full border-0"
                style={{ pointerEvents: interactive ? "auto" : "none" }}
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
            {!interactive && (
              <button
                className="absolute bottom-3 right-3 rounded-full bg-violet-600 text-white text-xs px-3 py-2 shadow-lg"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setInteractive(true)}
              >
                Interact
              </button>
            )}
          </div>
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 opacity-60"
              onMouseDown={(e) => e.stopPropagation()}
            >
              Open in new tab ↗
            </a>
          )}
        </div>
      )}
    </ContentBlockShell>
  )
}
