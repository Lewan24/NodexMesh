import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { NoteItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { noteEditorContent } from './noteContent';

export default function NoteRichEditor({
  item,
  onChange,
  onDone,
}: {
  item: NoteItem;
  onChange: (content: string) => void;
  onDone: () => void;
}) {
  const changed = useRef(false);
  const synced = useRef({ content: item.content, format: item.contentFormat });
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false, heading: { levels: [1, 2, 3] } })],
    content: noteEditorContent(item),
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: 'textbox', 'aria-label': translate('Note text'), 'aria-multiline': 'true' } },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      changed.current = true;
      const content = editor.getHTML();
      synced.current = { content, format: 'tiptap-html' };
      onChange(content);
    },
  });
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.focus('end');
  }, [editor]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    // Compare the saved source, not serialized HTML: equivalent entities and empty
    // paragraphs must never reset the selection after our own save acknowledgement.
    if (synced.current.content === item.content && synced.current.format === item.contentFormat) return;
    synced.current = { content: item.content, format: item.contentFormat };
    changed.current = false;
    editor.commands.setContent(noteEditorContent({ content: item.content, contentFormat: item.contentFormat }), {
      emitUpdate: false,
    });
  }, [editor, item.content, item.contentFormat]);
  const finish = () => {
    if (editor && !editor.isDestroyed && changed.current) onChange(editor.getHTML());
    onDone();
  };
  const commands = editor
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
          label: 'S',
          title: 'Strikethrough',
          active: editor.isActive('strike'),
          run: () => editor.chain().focus().toggleStrike().run(),
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
          label: '•',
          title: 'Bullet list',
          active: editor.isActive('bulletList'),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: '1.',
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
          label: 'Tx',
          title: 'Clear formatting',
          active: false,
          run: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
        },
      ]
    : [];
  return (
    <div
      className="note-rich-editing"
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          finish();
        }
      }}
    >
      <div role="group" aria-label={translate('Note formatting')} className="note-formatting-bar">
        {commands.map((command) => (
          <button
            key={command.title}
            type="button"
            title={translate(command.title)}
            aria-label={translate(command.title)}
            aria-pressed={command.active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={command.run}
          >
            {command.label}
          </button>
        ))}
        <button type="button" className="note-formatting-done" onClick={finish}>
          {translate('Done')}
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="note-rich-text note-rich-input"
        data-wheel-scroll={Boolean(item.height)}
      />
    </div>
  );
}
