import { memo } from 'react';
import { ConnectionLineComponentProps, getSmoothStepPath } from '@xyflow/react';

const CustomConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeDasharray="8,4"
        className="animated-connection-line"
        d={edgePath}
        style={{
          animation: 'dash-flow 1s linear infinite',
        }}
      />
      <defs>
        <style>
          {`
            @keyframes dash-flow {
              to {
                stroke-dashoffset: -12;
              }
            }
          `}
        </style>
      </defs>
    </g>
  );
};

export const CustomConnectionLine = memo(CustomConnectionLineComponent);