import { Position, XYPosition, InternalNode } from '@xyflow/react';

// Get the handle position based on the node's position and the handle's position
function getHandlePosition(node: InternalNode, handlePosition: Position): XYPosition {
  const nodePosition = node.internals.positionAbsolute;
  const nodeBounds = {
    x: nodePosition.x,
    y: nodePosition.y,
    width: node.measured?.width || 200,
    height: node.measured?.height || 100,
  };

  switch (handlePosition) {
    case Position.Top:
      return {
        x: nodeBounds.x + nodeBounds.width / 2,
        y: nodeBounds.y
      };
    case Position.Bottom:
      return {
        x: nodeBounds.x + nodeBounds.width / 2,
        y: nodeBounds.y + nodeBounds.height
      };
    case Position.Left:
      return {
        x: nodeBounds.x,
        y: nodeBounds.y + nodeBounds.height / 2
      };
    case Position.Right:
      return {
        x: nodeBounds.x + nodeBounds.width,
        y: nodeBounds.y + nodeBounds.height / 2
      };
    default:
      return {
        x: nodeBounds.x + nodeBounds.width / 2,
        y: nodeBounds.y + nodeBounds.height / 2
      };
  }
}

// Calculate the intersection point of the line between the center of two nodes
function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode): XYPosition {
  // Get node dimensions from computed positions
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetNodePosition = targetNode.internals.positionAbsolute;
  
  const intersectionNodeBounds = {
    x: intersectionNodePosition.x,
    y: intersectionNodePosition.y,
    width: intersectionNode.measured?.width || 200,
    height: intersectionNode.measured?.height || 100,
  };

  const w = intersectionNodeBounds.width / 2;
  const h = intersectionNodeBounds.height / 2;

  const x2 = intersectionNodeBounds.x + w;
  const y2 = intersectionNodeBounds.y + h;
  const x1 = targetNodePosition.x + (targetNode.measured?.width || 200) / 2;
  const y1 = targetNodePosition.y + (targetNode.measured?.height || 100) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// Returns the position (top,right,bottom or left) passed node compared to the intersection point
function getEdgePosition(node: InternalNode, intersectionPoint: XYPosition): Position {
  const nodePosition = node.internals.positionAbsolute;
  const nodeBounds = {
    x: nodePosition.x,
    y: nodePosition.y,
    width: node.measured?.width || 200,
    height: node.measured?.height || 100,
  };
  
  const nx = nodeBounds.x + nodeBounds.width / 2;
  const ny = nodeBounds.y + nodeBounds.height / 2;
  const px = intersectionPoint.x;
  const py = intersectionPoint.y;

  const dx = Math.abs(nx - px);
  const dy = Math.abs(ny - py);

  if (dx > dy) {
    return nx > px ? Position.Left : Position.Right;
  }
  return ny > py ? Position.Top : Position.Bottom;
}

// Returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

// New function that connects directly to handle positions for better UX
export function getHandleEdgeParams(source: InternalNode, target: InternalNode, sourceHandle?: Position, targetHandle?: Position) {
  // If handles are specified, use their positions directly
  if (sourceHandle && targetHandle) {
    const sourcePos = getHandlePosition(source, sourceHandle);
    const targetPos = getHandlePosition(target, targetHandle);
    
    return {
      sx: sourcePos.x,
      sy: sourcePos.y,
      tx: targetPos.x,
      ty: targetPos.y,
      sourcePos: sourceHandle,
      targetPos: targetHandle,
    };
  }

  // Fallback to intersection-based calculation
  return getEdgeParams(source, target);
}