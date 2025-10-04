import { Connection as ConnectionType, Character, Message } from '../store';

interface ConnectionProps {
  connection: ConnectionType;
  characters: Character[];
  messages: Message[];
  zoom: number;
  pan: { x: number; y: number };
  isSelected?: boolean;
  onClick?: () => void;
}

export function Connection({ 
  connection, 
  characters, 
  messages, 
  zoom, 
  pan, 
  isSelected = false,
  onClick 
}: ConnectionProps) {
  // Find the source and target elements
  const fromElement = characters.find(c => c.id === connection.from) || messages.find(m => m.id === connection.from);
  const toElement = characters.find(c => c.id === connection.to) || messages.find(m => m.id === connection.to);

  if (!fromElement || !toElement) return null;

  // Calculate positions with zoom and pan
  const fromPos = {
    x: (fromElement.position.x + 100) * (zoom / 100) + pan.x, // +100 for node center
    y: (fromElement.position.y + 40) * (zoom / 100) + pan.y   // +40 for vertical center
  };

  const toPos = {
    x: (toElement.position.x + 100) * (zoom / 100) + pan.x,
    y: (toElement.position.y + 40) * (zoom / 100) + pan.y
  };

  // Calculate control points for bezier curve
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  
  // Control points create a smooth curve
  const cp1x = fromPos.x + Math.min(Math.abs(dx) * 0.5, 100);
  const cp1y = fromPos.y;
  const cp2x = toPos.x - Math.min(Math.abs(dx) * 0.5, 100);
  const cp2y = toPos.y;

  const pathD = `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`;

  // Calculate arrow position and rotation
  const arrowSize = 8;
  const arrowAngle = Math.atan2(dy, dx);
  const arrowX = toPos.x - Math.cos(arrowAngle) * 20;
  const arrowY = toPos.y - Math.sin(arrowAngle) * 20;

  const strokeColor = isSelected ? '#7289da' : connection.color;
  const strokeDashArray = connection.type === 'flow' ? "8,4" : "0";
  const strokeWidth = connection.type === 'assignment' ? 3 : 2;

  return (
    <g 
      className={`transition-all duration-200 ${
        isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'
      }`}
      style={{ pointerEvents: 'all' }}
    >
      {/* Connection path */}
      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        fill="none"
        className="drop-shadow-sm"
        strokeDasharray={isSelected ? "0" : strokeDashArray}
      />
      
      {/* Arrow head */}
      <polygon
        points={`
          ${arrowX},${arrowY} 
          ${arrowX - arrowSize * Math.cos(arrowAngle - Math.PI/6)},${arrowY - arrowSize * Math.sin(arrowAngle - Math.PI/6)} 
          ${arrowX - arrowSize * Math.cos(arrowAngle + Math.PI/6)},${arrowY - arrowSize * Math.sin(arrowAngle + Math.PI/6)}
        `}
        fill={strokeColor}
        className="drop-shadow-sm"
      />
      
      {/* Invisible thick path for easier clicking */}
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth="12"
        fill="none"
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      />
    </g>
  );
}