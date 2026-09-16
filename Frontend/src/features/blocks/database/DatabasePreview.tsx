import { useId } from 'react';
import type { DatabaseTable, DatabaseRelation } from '@/entities/board/types';

/** Fixed SVG geometry avoids React Flow measurements inheriting the outer canvas zoom. */
export default function DatabasePreview({
  tables,
  relations,
}: {
  tables: DatabaseTable[];
  relations: DatabaseRelation[];
}) {
  const marker = useId().replace(/:/g, '');
  if (!tables.length) return null;
  const left = Math.min(...tables.map((table) => table.position.x)) - 48;
  const top = Math.min(...tables.map((table) => table.position.y)) - 48;
  const right = Math.max(...tables.map((table) => table.position.x + 288)) + 112;
  const bottom = Math.max(...tables.map((table) => table.position.y + 40 + table.fields.length * 32)) + 48;
  return (
    <svg
      role="img"
      aria-label="Database schema preview"
      width="100%"
      height="100%"
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0L8 4L0 8Z" fill="var(--color-accent)" />
        </marker>
      </defs>
      {relations.map((relation) => {
        const source = tables.find((table) => table.id === relation.source),
          target = tables.find((table) => table.id === relation.target);
        if (!source || !target) return null;
        const a = source.fields.findIndex((field) => field.id === relation.sourceField),
          b = target.fields.findIndex((field) => field.id === relation.targetField);
        if (a < 0 || b < 0) return null;
        const forward = source.position.x < target.position.x;
        const x = source.position.x + (forward ? 288 : 0),
          x2 = target.position.x + (forward ? 0 : 288);
        const y = source.position.y + 56 + a * 32,
          y2 = target.position.y + 56 + b * 32;
        const offset = Math.max(40, Math.abs(x2 - x) / 2) * (forward ? 1 : -1);
        if (source.id === target.id || Math.abs(source.position.x - target.position.x) < 288) {
          const start = source.position.x + 288,
            end = target.position.x + 288;
          const outside = Math.max(start, end) + 80;
          return (
            <g key={relation.id}>
              <path
                d={`M${start} ${y} C${outside} ${y} ${outside} ${y2} ${end} ${y2}`}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2"
                markerEnd={`url(#${marker})`}
              />
              <text
                x={outside - 12}
                y={(y + y2) / 2 - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text-primary)"
              >
                {relation.cardinality}
              </text>
            </g>
          );
        }
        return (
          <g key={relation.id}>
            <path
              d={`M${x} ${y} C${x + offset} ${y} ${x2 - offset} ${y2} ${x2} ${y2}`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              markerEnd={`url(#${marker})`}
            />
            <text
              x={(x + x2) / 2}
              y={(y + y2) / 2 - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-text-primary)"
            >
              {relation.cardinality}
            </text>
          </g>
        );
      })}
      {tables.map((table) => (
        <g key={table.id} transform={`translate(${table.position.x} ${table.position.y})`}>
          <rect width="288" height={40 + table.fields.length * 32} rx="2" fill="var(--color-surface)" />
          <rect width="288" height="40" fill="var(--color-accent)" />
          <text x="12" y="26" fontSize="15" fill="white">
            {table.name.slice(0, 30)}
          </text>
          {table.fields.map((field, index) => (
            <g key={field.id} transform={`translate(0 ${40 + index * 32})`}>
              <text x="10" y="21" fontSize="11" fill="var(--color-accent)">
                {field.primaryKey
                  ? 'PK'
                  : relations.some((r) => r.source === table.id && r.sourceField === field.id)
                    ? 'FK'
                    : ''}
              </text>
              <text x="38" y="21" fontSize="12" fill="var(--color-text-primary)">
                {field.name.slice(0, 18)}
              </text>
              <text x="278" y="21" textAnchor="end" fontSize="11" fill="var(--color-text-secondary)">
                {field.dataType.slice(0, 16)}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
