import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Modal from '@/shared/components/dialogs/Modal';
import { translate } from '@/shared/i18n';
import { CANVAS_GRID_SIZE, noteModuleWidth } from '../constants';
import {
  DEFAULT_ARRANGEMENT,
  planArrangement,
  type ArrangementOptions,
  type LayoutUnit,
} from '../utils/selectionLayout';
import './arrangementDialog.css';

export default function ArrangementDialog({
  units,
  blockedReason,
  onApply,
  onClose,
}: {
  units: LayoutUnit[];
  blockedReason?: string;
  onApply: (options: ArrangementOptions) => string | undefined;
  onClose: () => void;
}) {
  useTranslation();
  const helpId = useId();
  const errorId = useId();
  const invalid = (value: string) => !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 1000;
  const [mode, setMode] = useState<ArrangementOptions['mode']>(DEFAULT_ARRANGEMENT.mode);
  const [gap, setGap] = useState(String(DEFAULT_ARRANGEMENT.gap));
  const [perRow, setPerRow] = useState(String(DEFAULT_ARRANGEMENT.perRow));
  const [widthModules, setWidthModules] = useState(String(DEFAULT_ARRANGEMENT.widthModules));
  const [fillGaps, setFillGaps] = useState(DEFAULT_ARRANGEMENT.fillGaps ?? true);
  const [commitError, setCommitError] = useState<string>();
  const options: ArrangementOptions = {
    mode,
    fillGaps,
    gap: Number(gap),
    perRow: Number(perRow),
    widthModules: Number(widthModules),
  };
  const preview = useMemo(() => {
    try {
      return {
        positions: planArrangement(units, {
          mode,
          fillGaps,
          gap: Number(gap),
          perRow: Number(perRow),
          widthModules: Number(widthModules),
        }),
        error: undefined,
      };
    } catch (error) {
      return { positions: undefined, error: error instanceof Error ? error.message : 'Cannot arrange this selection.' };
    }
  }, [units, mode, gap, perRow, widthModules, fillGaps]);
  const error = blockedReason ?? preview.error ?? commitError;
  const rectangles = units.slice(0, 50).flatMap((unit, index) => {
    const point = preview.positions?.get(unit.id);
    return point ? [{ ...unit.rect, ...point, id: unit.id, index }] : [];
  });
  const left = Math.min(0, ...rectangles.map((rect) => rect.x));
  const top = Math.min(0, ...rectangles.map((rect) => rect.y));
  const minX = rectangles.length ? Math.min(...rectangles.map((rect) => rect.x)) : left;
  const minY = rectangles.length ? Math.min(...rectangles.map((rect) => rect.y)) : top;
  const previewWidth = Math.max(1, ...rectangles.map((rect) => rect.x + rect.width - minX));
  const previewHeight = Math.max(1, ...rectangles.map((rect) => rect.y + rect.height - minY));

  return (
    <Modal centered label={translate('Distribute evenly')} onClose={onClose}>
      <form
        className="arrangement-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (blockedReason || preview.error) return;
          setCommitError(onApply(options));
        }}
      >
        <header>
          <h2>{translate('Distribute evenly')}</h2>
          <button type="button" aria-label={translate('Close')} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="arrangement-body">
          <p>{translate('Items and groups: {{value1}}', { value1: units.length })}</p>
          <label>
            {translate('Row layout')}
            <select
              autoFocus
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as ArrangementOptions['mode']);
                setCommitError(undefined);
              }}
            >
              <option value="width">{translate('Maximum width')}</option>
              <option value="count">{translate('Items per row')}</option>
            </select>
          </label>
          <div className="arrangement-fields">
            <label>
              {translate('Spacing in grid steps')}
              <input
                type="number"
                min={1}
                max={1000}
                step={1}
                required
                aria-invalid={invalid(gap)}
                value={gap}
                onChange={(event) => {
                  setGap(event.target.value);
                  setCommitError(undefined);
                }}
                aria-describedby={`${helpId} ${errorId}`}
              />
              <span>
                {Number.isInteger(Number(gap)) && Number(gap) > 0 ? `${Number(gap) * CANVAS_GRID_SIZE} px` : '—'}
              </span>
            </label>
            {mode === 'width' ? (
              <label>
                {translate('Maximum width in note modules')}
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  required
                  aria-invalid={invalid(widthModules)}
                  value={widthModules}
                  onChange={(event) => {
                    setWidthModules(event.target.value);
                    setCommitError(undefined);
                  }}
                  aria-describedby={`${helpId} ${errorId}`}
                />
                <span>
                  {Number.isInteger(Number(widthModules)) && Number(widthModules) > 0
                    ? `${noteModuleWidth(Number(widthModules))} px`
                    : '—'}
                </span>
              </label>
            ) : (
              <label>
                {translate('Items per row')}
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  required
                  aria-invalid={invalid(perRow)}
                  aria-describedby={errorId}
                  value={perRow}
                  onChange={(event) => {
                    setPerRow(event.target.value);
                    setCommitError(undefined);
                  }}
                />
              </label>
            )}
          </div>
          <label className="arrangement-fill-gaps">
            <input
              type="checkbox"
              checked={fillGaps}
              onChange={(event) => {
                setFillGaps(event.target.checked);
                setCommitError(undefined);
              }}
            />
            {translate('Fill gaps')}
          </label>
          <p className="arrangement-help">{translate('Fill empty space below shorter items for a compact layout.')}</p>
          <p id={helpId} className="arrangement-help">
            {translate(
              'One width module is one default note. The width includes one grid step between modules. One grid step is {{value1}} px.',
              { value1: CANVAS_GRID_SIZE },
            )}
          </p>
          <p className="arrangement-help">
            {translate(
              'Items keep their sizes. With gap filling disabled, they follow reading order. Groups and frame contents move together. Wider items get their own row. Positions and minimum gaps follow the grid.',
            )}
          </p>
          {preview.positions && (
            <svg
              role="img"
              aria-label={translate('Arrangement preview')}
              className="arrangement-preview"
              viewBox={`${minX - 16} ${minY - 16} ${previewWidth + 32} ${previewHeight + 32}`}
            >
              {rectangles.map((rect) => (
                <g key={rect.id}>
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={Math.max(4, rect.width)}
                    height={Math.max(4, rect.height)}
                    rx={4}
                  />
                  {rect.width > 30 && rect.height > 30 && (
                    <text
                      x={rect.x + rect.width / 2}
                      y={rect.y + rect.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.min(28, rect.height / 3)}
                    >
                      {rect.index + 1}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}
          {units.length > 50 && (
            <p className="arrangement-help">{translate('Preview shows the first 50 items or groups.')}</p>
          )}
          {error && (
            <p id={errorId} role="alert" className="arrangement-error">
              {translate(error)}
            </p>
          )}
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button className="btn-accent" type="submit" disabled={!!blockedReason || !!preview.error}>
            {translate('Apply arrangement')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
