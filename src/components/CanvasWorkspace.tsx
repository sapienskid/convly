import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Character, Message, Connection as AppConnection } from '../store';
import { CharacterFlowNode } from './CharacterFlowNode';
import { MessageFlowNode } from './MessageFlowNode';
import { FloatingEdge } from './FloatingEdge';
import { CustomConnectionLine } from './CustomConnectionLine';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from './ui/context-menu';
import { usePerformantNodes } from '../hooks/usePerformantNodes';

interface CanvasWorkspaceProps {
  characters: Character[];
  messages: Message[];
  connections: AppConnection[];
  selectedTool: 'select' | 'character' | 'message' | 'pan' | 'connect';
  selectedElement: string | null;
  onCharacterMove: (id: string, position: { x: number; y: number }) => void;
  onMessageMove: (id: string, position: { x: number; y: number }) => void;
  onMessageTextUpdate: (id: string, text: string) => void;
  onElementSelect: (id: string | null) => void;
  onAddMessage?: (characterId: string) => void;
  onAddMessageAtPosition?: (position: { x: number; y: number }) => void;
  onAddCharacterAtPosition?: (position: { x: number; y: number }) => string;
  onDeleteElement?: (id: string, type: 'character' | 'message') => void;
  onConnectionCreate?: (from: string, to: string, sourceHandle?: string, targetHandle?: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onCharacterEdit?: (characterId: string) => void;
  onCharacterRotate?: (id: string, rotation: number) => void;
  onMessageRotate?: (id: string, rotation: number) => void;
}

function CanvasWorkspaceInner({
  characters,
  messages,
  connections,
  selectedTool,
  selectedElement,
  onCharacterMove,
  onMessageMove,
  onMessageTextUpdate,
  onElementSelect,
  onAddMessage,
  onAddMessageAtPosition,
  onAddCharacterAtPosition,
  onDeleteElement,
  onConnectionCreate,
  onConnectionDelete,
  onCharacterEdit,
  onCharacterRotate,
  onMessageRotate
}: CanvasWorkspaceProps) {
  // Local state for UI interactions
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [rightClickedElement, setRightClickedElement] = useState<{ id: string; type: 'character' | 'message' } | null>(null);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [dragConnectionStart, setDragConnectionStart] = useState<{ nodeId: string; position: { x: number; y: number } } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [tempEdges, setTempEdges] = useState<Edge[]>([]);
  
  const { screenToFlowPosition } = useReactFlow();

  // Proximity connection constants
  const MIN_DISTANCE = 400; // ~5cm on most screens for easier use

  // CRITICAL: Memoized node and edge types outside component to prevent re-renders
  const nodeTypes = useMemo(() => ({
    character: CharacterFlowNode,
    message: MessageFlowNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    floating: FloatingEdge,
  }), []);

  // PERFORMANCE: Memoized callback handlers to prevent child re-renders
  const handleCharacterEdit = useCallback((characterId: string) => {
    onCharacterEdit?.(characterId);
  }, [onCharacterEdit]);

  const handleAddMessage = useCallback((characterId: string) => {
    onAddMessage?.(characterId);
  }, [onAddMessage]);

  const handleTextUpdate = useCallback((id: string, text: string) => {
    onMessageTextUpdate?.(id, text);
  }, [onMessageTextUpdate]);

  // PERFORMANCE: Use optimized performant nodes hook instead of inline logic
  const nodes: Node[] = usePerformantNodes({
    characters,
    messages,
    selectedElement,
    selectedTool,
    onCharacterEdit: handleCharacterEdit,
    onAddMessage: handleAddMessage,
    onMessageTextUpdate: handleTextUpdate,
    onCharacterRotate,
    onMessageRotate,
  });

  // Get closest edge for proximity connection - simplified approach
  const getClosestEdge = useCallback((draggedNode: Node) => {
    let closestNode: Node | null = null;
    let minDistance = Infinity;
    
    // Check against all nodes except the dragged one
    nodes.forEach(node => {
      if (node.id !== draggedNode.id) {
        const dx = node.position.x - draggedNode.position.x;
        const dy = node.position.y - draggedNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MIN_DISTANCE && distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      }
    });

    if (!closestNode) {
      return null;
    }

    // At this point closestNode is guaranteed to be non-null
    const foundNode = closestNode as Node;

    // Determine edge direction based on x position
    const closeNodeIsSource = foundNode.position.x < draggedNode.position.x;
    
    return {
      id: closeNodeIsSource
        ? `${foundNode.id}-${draggedNode.id}`
        : `${draggedNode.id}-${foundNode.id}`,
      source: closeNodeIsSource ? foundNode.id : draggedNode.id,
      target: closeNodeIsSource ? draggedNode.id : foundNode.id,
      type: 'floating' as const,
      style: {
        stroke: '#94a3b8',
        strokeWidth: 2,
        strokeDasharray: '8,4',
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: '#94a3b8',
        width: 12,
        height: 12,
      },
      className: 'temp',
      animated: true,
    };
  }, [nodes, MIN_DISTANCE]);

  // PERFORMANCE: Optimized edges with floating edge type for better arrow positioning
  const edges: Edge[] = useMemo(() => {
    const permanentEdges = connections.map(connection => ({
      id: connection.id,
      source: connection.from,
      target: connection.to,
      type: 'floating', // Use floating edges for dynamic positioning
      style: {
        stroke: connection.color,
        strokeWidth: 2,
        strokeDasharray: connection.type === 'flow' ? '8,4' : undefined,
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: connection.color,
        width: 12,
        height: 12,
      },
      animated: connection.type === 'flow',
      data: { connection },
      selected: selectedElement === connection.id,
    }));

    return [...permanentEdges, ...tempEdges];
  }, [connections, selectedElement, tempEdges]);

  // PERFORMANCE: Static configuration objects
  const snapGrid = useMemo(() => [16, 16] as [number, number], []);
  const connectionLineStyle = useMemo(() => ({
    strokeWidth: 2,
    stroke: '#6366f1',
    strokeDasharray: '8,4',
  }), []);

  // PERFORMANCE: Optimized React Flow event handlers with proper batching
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Batch position updates for better performance
    const positionUpdates: { id: string; position: { x: number; y: number }; type: 'character' | 'message' }[] = [];
    
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        const character = characters.find(c => c.id === change.id);
        const message = messages.find(m => m.id === change.id);
        
        if (character || message) {
          positionUpdates.push({
            id: change.id,
            position: change.position,
            type: character ? 'character' : 'message'
          });
        }
      }
    });

    // Apply all position updates at once to minimize re-renders
    if (positionUpdates.length > 0) {
      positionUpdates.forEach(({ id, position, type }) => {
        if (type === 'character' && onCharacterMove) {
          onCharacterMove(id, position);
        } else if (type === 'message' && onMessageMove) {
          onMessageMove(id, position);
        }
      });
    }
  }, [characters, messages, onCharacterMove, onMessageMove]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'remove' && onConnectionDelete) {
        onConnectionDelete(change.id);
      }
    });
  }, [onConnectionDelete]);

  // PERFORMANCE: Optimized connection handling with bidirectional support
  const handleConnect = useCallback((params: Connection) => {
    if (params.source && params.target && onConnectionCreate) {
      // Allow connections in both directions - React Flow will handle the visual direction
      onConnectionCreate(params.source, params.target);
    }
  }, [onConnectionCreate]);

  // PERFORMANCE: Optimized node interaction handlers
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if ((isShiftPressed && selectedTool === 'select') || selectedTool === 'connect') {
      event.stopPropagation();
      
      if (!isDraggingConnection) {
        // Start connection
        setIsDraggingConnection(true);
        setDragConnectionStart({
          nodeId: node.id,
          position: { x: event.clientX, y: event.clientY }
        });
      } else if (dragConnectionStart && dragConnectionStart.nodeId !== node.id) {
        // Complete connection
        if (onConnectionCreate) {
          onConnectionCreate(dragConnectionStart.nodeId, node.id);
        }
        setIsDraggingConnection(false);
        setDragConnectionStart(null);
      }
    }
  }, [isShiftPressed, selectedTool, isDraggingConnection, dragConnectionStart, onConnectionCreate]);

  // Proximity connection: Show preview edge while dragging
  const onNodeDrag = useCallback((_event: React.MouseEvent | React.TouchEvent, node: Node) => {
    // Enable proximity connections in connect mode or shift+select
    const isProximityMode = selectedTool === 'connect' || (selectedTool === 'select' && isShiftPressed);
    if (isProximityMode) {
      const closeEdge = getClosestEdge(node);
      setTempEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== 'temp');
        if (closeEdge) {
          // Check if connection already exists to avoid duplicate preview
          const exists = connections.some(c =>
            (c.from === closeEdge.source && c.to === closeEdge.target) || 
            (c.from === closeEdge.target && c.to === closeEdge.source)
          );
          if (!exists) {
            nextEdges.push(closeEdge);
          }
        }
        return nextEdges;
      });
    } else {
      // Clear temp edges if not in proximity mode
      setTempEdges((es) => es.filter((e) => e.className !== 'temp'));
    }
  }, [selectedTool, isShiftPressed, getClosestEdge, connections]);

    // New: Proximity-based connection creation - drag from anywhere on node
  const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
    // Enable proximity connections in connect mode or shift+select
    const isProximityMode = selectedTool === 'connect' || (selectedTool === 'select' && isShiftPressed);
    if (isProximityMode) {
      event.stopPropagation();
      setIsDraggingConnection(true);
      setDragConnectionStart({
        nodeId: node.id,
        position: { x: event.clientX, y: event.clientY }
      });
    }
  }, [selectedTool, isShiftPressed]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent | React.TouchEvent, draggedNode: Node) => {
    // Clear temporary edges
    setTempEdges((es) => es.filter((e) => e.className !== 'temp'));

    // Enable proximity connections in connect mode or shift+select
    const isProximityMode = selectedTool === 'connect' || (selectedTool === 'select' && isShiftPressed);
    if (isProximityMode && isDraggingConnection && dragConnectionStart) {
      const closeEdge = getClosestEdge(draggedNode);
      
      if (closeEdge && onConnectionCreate) {
        // Check if connection already exists
        const exists = connections.some(c =>
          (c.from === closeEdge.source && c.to === closeEdge.target) || 
          (c.from === closeEdge.target && c.to === closeEdge.source)
        );

        if (!exists) {
          onConnectionCreate(closeEdge.source, closeEdge.target);
        }
      }

      setIsDraggingConnection(false);
      setDragConnectionStart(null);
    }
  }, [selectedTool, isShiftPressed, isDraggingConnection, dragConnectionStart, getClosestEdge, onConnectionCreate, connections]);

  const onSelectionChange = useCallback((selection: { nodes: Node[]; edges: Edge[] }) => {
    if (selection.nodes.length > 0) {
      onElementSelect(selection.nodes[0].id);
    } else if (selection.edges.length > 0) {
      onElementSelect(selection.edges[0].id);
    } else {
      onElementSelect(null);
    }
  }, [onElementSelect]);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    onElementSelect(edge.id);
  }, [onElementSelect]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // Cancel connection mode on pane click
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
      setDragConnectionStart(null);
      return;
    }
    
    if (selectedTool === 'message' && onAddMessageAtPosition) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddMessageAtPosition(position);
    } else if (selectedTool === 'character' && onAddCharacterAtPosition) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddCharacterAtPosition(position);
    }
  }, [selectedTool, isDraggingConnection, onAddMessageAtPosition, onAddCharacterAtPosition, screenToFlowPosition]);

  // PERFORMANCE: Optimized context menu handlers
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    
    const character = characters.find(c => c.id === node.id);
    const message = messages.find(m => m.id === node.id);
    
    if (character) {
      setRightClickedElement({ id: node.id, type: 'character' });
    } else if (message) {
      setRightClickedElement({ id: node.id, type: 'message' });
    }
    
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    onElementSelect(node.id);
  }, [characters, messages, onElementSelect]);

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setRightClickedElement(null);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    onElementSelect(null);
  }, [onElementSelect]);

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    onElementSelect(edge.id);
  }, [onElementSelect]);

  // Keyboard shortcuts and delete handling
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is currently editing text in any input field
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.hasAttribute('data-editing')
      );

      // Delete selected elements - only if not editing text
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
        if (selectedElement && onDeleteElement) {
          const character = characters.find(c => c.id === selectedElement);
          const message = messages.find(m => m.id === selectedElement);
          const connection = connections.find(c => c.id === selectedElement);

          if (character) {
            onDeleteElement(selectedElement, 'character');
          } else if (message) {
            onDeleteElement(selectedElement, 'message');
          } else if (connection && onConnectionDelete) {
            onConnectionDelete(selectedElement);
          }
          onElementSelect(null);
        }
      }
      
      // Tool shortcuts - only if no input is focused
      if (!document.activeElement?.matches('input, textarea')) {
        switch (e.key.toLowerCase()) {
          case 'v':
            onElementSelect(null);
            break;
          case 'l':
            // Switch to connect tool
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setIsDraggingConnection(false);
        setDragConnectionStart(null);
      }
    };

    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDownGlobal);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyDownGlobal);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElement, characters, messages, connections, onDeleteElement, onConnectionDelete, onElementSelect]);

  return (
    <div className="h-full w-full relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={onNodeClick}
              onNodeDrag={onNodeDrag}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              onEdgeClick={onEdgeClick}
              onSelectionChange={onSelectionChange}
              onPaneClick={onPaneClick}
              onNodeContextMenu={onNodeContextMenu}
              onPaneContextMenu={onPaneContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode={ConnectionMode.Loose}
              snapToGrid={true}
              snapGrid={snapGrid}
              defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
              minZoom={0.1}
              maxZoom={2}
              className={`
                ${selectedTool === 'message' || selectedTool === 'character' ? 'cursor-crosshair' : ''}
                ${selectedTool === 'pan' ? 'cursor-grab' : ''}
                ${selectedTool === 'connect' ? 'cursor-crosshair' : ''}
                ${isShiftPressed && selectedTool === 'select' ? 'cursor-crosshair' : ''}
                ${isDraggingConnection ? 'cursor-crosshair' : ''}
                transition-all duration-200
              `}
              panOnDrag={selectedTool === 'pan' ? true : [1, 2]}
              selectionOnDrag={selectedTool === 'select' && !isShiftPressed && !isDraggingConnection}
              panOnScroll={false}
              zoomOnDoubleClick={false}
              nodesDraggable={true} // Always allow dragging for proximity connections
              nodesConnectable={selectedTool === 'select' || selectedTool === 'connect'}
              elementsSelectable={selectedTool === 'select' || selectedTool === 'connect'}
              connectionLineStyle={connectionLineStyle}
              onlyRenderVisibleElements={true}
              zoomOnPinch={true}
              panOnScrollSpeed={0.5}
              zoomOnScroll={true}
              preventScrolling={false}
              nodeOrigin={[0.5, 0.5]}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineComponent={CustomConnectionLine}
              defaultEdgeOptions={{
                type: 'floating',
                animated: false,
                style: { strokeWidth: 2 },
                deletable: true,
              }}
              deleteKeyCode={['Delete', 'Backspace']}
              multiSelectionKeyCode={['Meta', 'Ctrl']}
              selectionKeyCode={null}
              proOptions={{ hideAttribution: true }}
              fitView={false}
              fitViewOptions={{ padding: 0.1 }}
            >
              <Background 
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="#f1f5f9"
                className="opacity-60"
              />
              <Controls 
                position="bottom-right"
                className="bg-white border border-gray-200 rounded-lg shadow-lg m-4"
                showZoom={true}
                showFitView={true}
                showInteractive={false}
              />
            </ReactFlow>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          {rightClickedElement ? (
            <>
              {rightClickedElement.type === 'character' && (
                <>
                  {onCharacterEdit && (
                    <ContextMenuItem onClick={() => {
                      onCharacterEdit(rightClickedElement.id);
                      setContextMenuPosition(null);
                    }}>
                      Edit Character
                    </ContextMenuItem>
                  )}
                  {onAddMessage && (
                    <ContextMenuItem onClick={() => {
                      onAddMessage(rightClickedElement.id);
                      setContextMenuPosition(null);
                    }}>
                      Add Message
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuItem 
                onClick={() => {
                  if (onDeleteElement) {
                    onDeleteElement(rightClickedElement.id, rightClickedElement.type);
                    onElementSelect(null);
                  }
                  setContextMenuPosition(null);
                }}
                className="text-destructive focus:text-destructive"
              >
                Delete {rightClickedElement.type === 'character' ? 'Character' : 'Message'}
              </ContextMenuItem>
            </>
          ) : selectedElement && selectedElement.startsWith('conn-') ? (
            <>
              <ContextMenuItem 
                onClick={() => {
                  if (onConnectionDelete) {
                    onConnectionDelete(selectedElement);
                    onElementSelect(null);
                  }
                  setContextMenuPosition(null);
                }}
                className="text-destructive focus:text-destructive"
              >
                Delete Connection
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={() => {
                if (contextMenuPosition && onAddMessageAtPosition) {
                  const position = screenToFlowPosition({
                    x: contextMenuPosition.x,
                    y: contextMenuPosition.y,
                  });
                  onAddMessageAtPosition(position);
                }
                setContextMenuPosition(null);
              }}>
                Add Message
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                if (contextMenuPosition && onAddCharacterAtPosition) {
                  const position = screenToFlowPosition({
                    x: contextMenuPosition.x,
                    y: contextMenuPosition.y,
                  });
                  onAddCharacterAtPosition(position);
                }
                setContextMenuPosition(null);
              }}>
                Add Character
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  );
}