import { createContext, useContext, type ReactNode } from 'react';
import type { BoardItem } from '@/entities/board/types';
import type { TodoDisplay } from '@/entities/project/types';
import { translate } from '@/shared/i18n';
import { getLineRenderGeometry } from '../line/utils/lineRenderGeometry';
import './itemTodo.css';

// Older projects stored "checkbox". It now renders as an internal checkmark too.
export const TodoDisplayContext = createContext<TodoDisplay>('checkmark');

export default function ItemTodo({ item, children }: { item: BoardItem; children: ReactNode }) {
  const display = useContext(TodoDisplayContext);
  if (!item.todo) return children;
  const done = item.todo.done;
  const mode = display === 'strike' ? 'strike' : 'checkmark';
  const line = item.type === 'line' ? getLineRenderGeometry(item.x, item.y, item.x2, item.y2) : undefined;
  return (
    <div className="item-todo" data-todo-display={mode} data-todo-done={done}>
      <span className="sr-only">{translate(done ? 'Completed TODO item' : 'Incomplete TODO item')}</span>
      <div className="item-todo-content">{children}</div>
      {done && (
        <div
          className="item-todo-completion"
          aria-hidden="true"
          style={
            line ? { left: line.svgLeft, top: line.svgTop, width: line.svgWidth, height: line.svgHeight } : undefined
          }
        >
          {mode === 'strike' ? (
            <svg className="item-todo-strike" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M 0 100 L 100 0" />
            </svg>
          ) : (
            <svg className="item-todo-checkmark" viewBox="0 0 100 100">
              <path d="M 23 51 L 42 70 L 79 30" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
