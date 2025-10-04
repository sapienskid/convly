import { memo, useCallback, useState } from 'react';
import { EdgeProps, useStore, getBezierPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from '@xyflow/react';
import { getHandleEdgeParams } from '../utils/edgeUtils';
import { Connection as AppConnection } from '../store';
import { X } from 'lucide-react';

interface FloatingEdgeData extends Record<string, unknown> {
  connection?: AppConnection;
}

interface FloatingEdgeProps extends EdgeProps {
  data?: FloatingEdgeData;
}

const FloatingEdgeComponent = ({ 
  id, 
  source, 
  target, 
  markerEnd, 
  style,
  data,
  selected
}: FloatingEdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  
  const { sourceNode, targetNode } = useStore(
    useCallback(
      (s) => ({
        sourceNode: s.nodeLookup.get(source),
        targetNode: s.nodeLookup.get(target),
      }),
      [source, target]
    ),
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const connection = data?.connection;
  
  // Use handle-based positioning if available, otherwise fallback to intersection-based
  const { sx, sy, tx, ty, sourcePos, targetPos } = getHandleEdgeParams(sourceNode, targetNode);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  const isFlow = connection?.type === 'flow';

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Use React Flow's deleteElements function
    deleteElements({ edges: [{ id }] });
  }, [id, deleteElements]);

  return (
    <>
      {/* Main edge path with increased hit area for better UX */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 4 : isHovered ? 3 : 2,
          stroke: selected ? '#6366f1' : isHovered ? '#8b5cf6' : style?.stroke,
          strokeDasharray: isFlow ? '8,4' : undefined,
        }}
        className="cursor-pointer transition-all duration-150 ease-in-out"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Invisible larger hit area for easier hover detection */}
      <BaseEdge
        id={`${id}-hit-area`}
        path={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 20, // Much larger hit area
          fill: 'none',
        }}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Delete button appears when selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="group relative flex items-center justify-center w-8 h-8 bg-white hover:bg-red-50 border-2 border-red-200 hover:border-red-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95"
              title="Delete connection"
            >
              <X className="w-4 h-4 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-full bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const FloatingEdge = memo(FloatingEdgeComponent);