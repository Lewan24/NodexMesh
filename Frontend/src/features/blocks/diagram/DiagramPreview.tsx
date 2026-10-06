import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import type { DiagramEdge, DiagramNode } from '@/entities/board/types';
import { readableText } from '../typography/textContrast';
import { useSectionStyle } from '../typography/TypographyContext';
import { diagramNodeSize, diagramEdgeAppearance, getDiagramPreviewEdgeGeometry } from './diagramGeometry';

export { getDiagramPreviewEdgeGeometry } from './diagramGeometry';

/** Uses the editor's exact shape dimensions, handle anchors and path generators. */
export default function DiagramPreview({ nodes, edges }: { nodes: DiagramNode[]; edges: DiagramEdge[] }) {
  useTranslation();
  const labelStyle = useSectionStyle('labels');
  const markerPrefix = useId().replace(/:/g, '');
  if (!nodes.length) return null;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const connections = edges.flatMap((edge, index) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    return source && target
      ? [{ edge, geometry: getDiagramPreviewEdgeGeometry(edge, source, target), marker: `${markerPrefix}-${index}` }]
      : [];
  });
  const bounds = nodes.flatMap((node) => {
    const { width, height } = diagramNodeSize(node);
    return [node.position, { x: node.position.x + width, y: node.position.y + height }];
  });
  for (const { edge, geometry } of connections) {
    bounds.push(...geometry.points);
    if (edge.label) {
      const halfWidth = Math.max(32, edge.label.length * 4);
      bounds.push(
        { x: geometry.label.x - halfWidth, y: geometry.label.y - 16 },
        { x: geometry.label.x + halfWidth, y: geometry.label.y + 16 },
      );
    }
  }
  const left = Math.min(...bounds.map((point) => point.x)) - 32;
  const top = Math.min(...bounds.map((point) => point.y)) - 32;
  const right = Math.max(...bounds.map((point) => point.x)) + 32;
  const bottom = Math.max(...bounds.map((point) => point.y)) + 32;
  return (
    <svg
      role="img"
      aria-label={translate('Diagram preview')}
      width="100%"
      height="100%"
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {connections.map(({ edge, marker }) => (
          <marker
            key={marker}
            id={marker}
            markerWidth="16"
            markerHeight="16"
            viewBox="0 0 16 16"
            refX="16"
            refY="8"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0 0L16 8L0 16Z" fill={diagramEdgeAppearance(edge).color} />
          </marker>
        ))}
      </defs>
      {connections.map(({ edge, geometry, marker }) => {
        const appearance = diagramEdgeAppearance(edge);
        return (
          <path
            key={edge.id}
            d={geometry.path}
            fill="none"
            stroke={appearance.color}
            strokeWidth={appearance.strokeWidth}
            strokeDasharray={appearance.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={appearance.arrow ? `url(#${marker})` : undefined}
          />
        );
      })}
      {nodes.map((node) => {
        const size = diagramNodeSize(node);
        return (
          <foreignObject key={node.id} x={node.position.x} y={node.position.y} {...size}>
            <div
              className="diagram-shape"
              data-shape={node.data.shape}
              style={{ ...size, background: node.data.color, color: readableText(node.data.color), ...labelStyle }}
            >
              <span className="diagram-shape-label">{node.data.label || translate('Untitled')}</span>
            </div>
          </foreignObject>
        );
      })}
      {connections.map(({ edge, geometry }) =>
        edge.label ? (
          <text
            key={edge.id}
            x={geometry.label.x}
            y={geometry.label.y}
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-text-primary)"
            stroke="var(--color-surface)"
            strokeWidth="6"
            strokeLinejoin="round"
            paintOrder="stroke"
            style={labelStyle}
          >
            {edge.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
