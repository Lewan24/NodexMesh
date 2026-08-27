import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  BoardItem,
  TextItem,
} from '@/entities/board/types';

import {
  DEFAULT_TEXT_CARD_WIDTH,
  isLightColor,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_STYLES,
} from '@/features/blocks/text/utils/textUtils';

interface TextBlockProps {
  item: TextItem;

  zoom?: number;

  isSelected?: boolean;

  onUpdate: (
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;

  onDelete: () => void;

  onBlockResize?: (
    event: React.MouseEvent,
    width: number,
    height: null,
  ) => void;
}

export default function TextBlock({
  item,

  onUpdate,
  onDelete,

  onBlockResize,
}: TextBlockProps) {
  const [
    editing,
    setEditing,
  ] = useState(
    !item.content ||
    item.content ===
      'Heading',
  );

  const [
    showControls,
    setShowControls,
  ] = useState(false);

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [
    editing,
  ]);

  const update =
    useCallback(
      (
        patch:
          Partial<TextItem>,
      ) => {
        onUpdate(
          current => {
            if (
              current.type !==
              'text'
            ) {
              return current;
            }

            return {
              ...current,
              ...patch,
            };
          },
        );
      },
      [
        onUpdate,
      ],
    );

  const isCard =
    Boolean(
      item.color,
    );

  const light =
    isCard &&
    item.color
      ? isLightColor(
          item.color,
        )
      : true;

  const textColor =
    isCard
      ? light
        ? '#1e293b'
        : '#f1f5f9'
      : 'var(--color-text-primary)';

  const mutedColor =
    isCard
      ? light
        ? 'rgba(30,41,59,0.4)'
        : 'rgba(241,245,249,0.4)'
      : 'var(--color-text-faint)';

  const cardWidth =
    item.width ??
    DEFAULT_TEXT_CARD_WIDTH;

  const finishEditing =
    useCallback(() => {
      setEditing(
        false,
      );
    }, []);

  const handleKeyDown =
    useCallback(
      (
        event:
          React.KeyboardEvent<HTMLInputElement>,
      ) => {
        if (
          event.key ===
            'Enter' ||
          event.key ===
            'Escape'
        ) {
          setEditing(
            false,
          );
        }
      },
      [],
    );

  return (
    <div
      className="
        group
        relative
      "
      style={{
        minWidth:
          140,

        width:
          isCard
            ? cardWidth
            : undefined,
      }}
      onMouseEnter={() =>
        setShowControls(
          true,
        )
      }
      onMouseLeave={() =>
        setShowControls(
          false,
        )
      }
    >
      <div
        className="
          transition-all
          duration-150
        "
        style={
          isCard
            ? {
                backgroundColor:
                  item.color,

                borderRadius:
                  16,

                padding:
                  '14px 18px',

                boxShadow:
                  '0 8px 24px rgba(0,0,0,0.12)',
              }
            : {
                padding:
                  12,
              }
        }
      >
        {/* Top accent */}

        {isCard &&
          item.topColor && (
          <div
            style={{
              height: 5,

              backgroundColor:
                item.topColor,

              margin:
                '-14px -18px 12px',

              borderRadius:
                '16px 16px 0 0',
            }}
          />
        )}

        {/* Text */}

        {editing ? (
          <input
            ref={
              inputRef
            }
            value={
              item.content
            }
            onChange={
              event =>
                update({
                  content:
                    event.target
                      .value,
                })
            }
            onBlur={
              finishEditing
            }
            onKeyDown={
              handleKeyDown
            }
            onMouseDown={
              event =>
                event.stopPropagation()
            }
            className={`
              bg-transparent
              outline-none
              leading-tight
              ${
                TEXT_SIZE_STYLES[
                  item.size
                ]
              }
            `}
            style={{
              minWidth:
                80,

              width:
                '100%',

              color:
                textColor,

              caretColor:
                'var(--color-accent)',
            }}
          />
        ) : (
          <span
            className={`
              block
              leading-tight
              select-none
              cursor-text
              ${
                TEXT_SIZE_STYLES[
                  item.size
                ]
              }
              ${
                isCard
                  ? 'whitespace-pre-wrap break-words'
                  : 'text-nowrap'
              }
            `}
            style={{
              color:
                item.content
                  ? textColor
                  : mutedColor,
            }}
            onDoubleClick={() =>
              setEditing(
                true,
              )
            }
          >
            {item.content ||
              'Text'}
          </span>
        )}
      </div>

      {/* Width resize handle */}

      {isCard &&
        onBlockResize && (
        <div
          className="
            absolute
            opacity-0
            group-hover:opacity-100
            transition-opacity
            cursor-ew-resize
          "
          style={{
            top: 0,
            bottom: 0,
            right: -7,

            width: 16,

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',
          }}
          onMouseDown={
            event => {
              if (
                event.button !==
                0
              ) {
                return;
              }

              event.stopPropagation();

              onBlockResize(
                event,
                cardWidth,
                null,
              );
            }
          }
        >
          <div
            className="
              w-1.5
              rounded-full
            "
            style={{
              height:
                28,

              backgroundColor:
                light
                  ? 'rgba(30,41,59,0.4)'
                  : 'rgba(241,245,249,0.4)',
            }}
          />
        </div>
      )}

      {/* Floating controls */}

      {showControls &&
        !editing && (
        <div
          className="
            relative
            flex
            items-center
            gap-1
            z-20
          "
          style={{
            marginTop:
              isCard
                ? 6
                : 2,
          }}
          onMouseDown={
            event =>
              event.stopPropagation()
          }
        >
          <div
            className="
              flex
              items-center
              gap-1
              px-1
              py-1
              rounded-lg
            "
            style={{
              backgroundColor:
                'var(--color-surface-translucent)',

              border:
                '1px solid var(--color-border)',

              animation:
                'slide-up 0.15s ease forwards',
            }}
          >
            {TEXT_SIZE_LABELS.map(
              size => (
                <button
                  key={
                    size
                  }
                  onClick={() =>
                    update({
                      size,
                    })
                  }
                  className="
                    text-[9px]
                    px-1.5
                    py-0.5
                    rounded-md
                    font-bold
                    uppercase
                    tracking-wider
                    transition-all
                    duration-100
                  "
                  style={{
                    backgroundColor:
                      item.size ===
                      size
                        ? 'var(--color-accent)'
                        : 'transparent',

                    color:
                      item.size ===
                      size
                        ? 'white'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {size}
                </button>
              ),
            )}

            <button
              onClick={
                onDelete
              }
              className="
                ml-1
                transition-colors
              "
              style={{
                color:
                  'var(--color-text-faint)',
              }}
              onMouseEnter={
                event => {
                  event.currentTarget.style.color =
                    'var(--color-danger-strong)';
                }
              }
              onMouseLeave={
                event => {
                  event.currentTarget.style.color =
                    'var(--color-text-faint)';
                }
              }
              title="Delete text"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}