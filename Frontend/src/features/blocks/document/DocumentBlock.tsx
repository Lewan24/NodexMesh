import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { DocumentItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';
import './document.css';

export default function DocumentBlock({
  item,
  onUpdate,
  onDelete,
}: {
  item: DocumentItem;
  onUpdate: BlockUpdateHandler;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const autoHeight = item.autoHeight ?? false;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: item.content,
    editable: editing,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed || !editor.schema) return;
      // Capture HTML now: React may execute the updater after this editor is destroyed.
      const content = editor.getHTML();
      onUpdate((current) => (current.type === 'document' ? { ...current, content } : current));
    },
  });
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema && editor.getHTML() !== item.content)
      editor.commands.setContent(item.content, { emitUpdate: false });
  }, [editor, item.content]);
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.schema) return;
    editor.setEditable(editing, false);
    if (editing) editor.commands.focus();
  }, [editor, editing]);

  const commands =
    editor && !editor.isDestroyed && editor.schema
      ? [
          {
            label: 'B',
            title: 'Bold',
            active: editor.isActive('bold'),
            run: () => editor.chain().focus().toggleBold().run(),
          },
          {
            label: 'I',
            title: 'Italic',
            active: editor.isActive('italic'),
            run: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            label: 'U',
            title: 'Underline',
            active: editor.isActive('underline'),
            run: () => editor.chain().focus().toggleUnderline().run(),
          },
          {
            label: 'H1',
            title: 'Heading 1',
            active: editor.isActive('heading', { level: 1 }),
            run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          },
          {
            label: 'H2',
            title: 'Heading 2',
            active: editor.isActive('heading', { level: 2 }),
            run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          },
          {
            label: '• List',
            title: 'Bullet list',
            active: editor.isActive('bulletList'),
            run: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            label: '1. List',
            title: 'Numbered list',
            active: editor.isActive('orderedList'),
            run: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            label: '❞',
            title: 'Quote',
            active: editor.isActive('blockquote'),
            run: () => editor.chain().focus().toggleBlockquote().run(),
          },
          {
            label: '<>',
            title: 'Inline code',
            active: editor.isActive('code'),
            run: () => editor.chain().focus().toggleCode().run(),
          },
          {
            label: 'Clear',
            title: 'Clear formatting',
            active: false,
            run: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
          },
        ]
      : [];
  return (
    <ContentBlockShell
      item={item}
      autoHeight={autoHeight}
      minHeight={240}
      onDelete={onDelete}
      title={
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              aria-label="Document title"
              disabled={item.locked}
              className="bg-transparent outline-none w-full"
              value={item.title}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdate((current) => (current.type === 'document' ? { ...current, title: e.target.value } : current))
              }
            />
          ) : (
            <span className="flex-1 truncate" onDoubleClick={() => setEditing(true)}>
              {item.title}
            </span>
          )}
          <button
            type="button"
            className="shrink-0 rounded px-2 py-1 text-xs hover:bg-violet-500/10"
            aria-pressed={autoHeight}
            title="Fit content and grow automatically while writing"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() =>
              onUpdate((current) =>
                current.type === 'document' ? { ...current, autoHeight: true, height: undefined } : current,
              )
            }
          >
            Auto-fit
          </button>
          <button
            type="button"
            className="shrink-0 rounded px-2 py-1 text-xs hover:bg-violet-500/10"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      }
    >
      {editing && (
        <div
          className="flex flex-wrap gap-1 p-2 border-b"
          style={{ borderColor: 'var(--color-border)' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {commands.map((command) => (
            <button
              key={command.title}
              type="button"
              title={command.title}
              aria-label={command.title}
              aria-pressed={command.active}
              onClick={command.run}
              className="px-2 py-1 rounded text-xs hover:bg-violet-500/15"
              style={{ background: command.active ? 'var(--color-accent-soft-strong)' : undefined }}
            >
              {command.label}
            </button>
          ))}
        </div>
      )}
      <div
        className={`flex-1 min-h-0 ${autoHeight ? '' : 'overflow-auto'} ${editing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'}`}
        data-wheel-scroll={!autoHeight}
        onDoubleClick={() => setEditing(true)}
        onMouseDown={(e) => {
          if (editing) e.stopPropagation();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <EditorContent
          editor={editor}
          className={`document-editor ${editing ? '' : 'pointer-events-none select-none'}`}
        />
      </div>
    </ContentBlockShell>
  );
}
