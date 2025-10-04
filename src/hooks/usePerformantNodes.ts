import { useMemo, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { Character, Message } from '../store';

interface UsePerformantNodesProps {
  characters: Character[];
  messages: Message[];
  selectedElement: string | null;
  selectedTool: string;
  onCharacterEdit?: (characterId: string) => void;
  onAddMessage?: (characterId: string) => void;
  onMessageTextUpdate?: (id: string, text: string) => void;
  onCharacterRotate?: (id: string, rotation: number) => void;
  onMessageRotate?: (id: string, rotation: number) => void;
}

export function usePerformantNodes({
  characters,
  messages,
  selectedElement,
  selectedTool,
  onCharacterEdit,
  onAddMessage,
  onMessageTextUpdate,
  onCharacterRotate,
  onMessageRotate,
}: UsePerformantNodesProps) {
  // Memoized callback handlers to prevent unnecessary re-renders
  const handleCharacterEdit = useCallback((characterId: string) => {
    onCharacterEdit?.(characterId);
  }, [onCharacterEdit]);

  const handleAddMessage = useCallback((characterId: string) => {
    onAddMessage?.(characterId);
  }, [onAddMessage]);

  const handleTextUpdate = useCallback((id: string, text: string) => {
    onMessageTextUpdate?.(id, text);
  }, [onMessageTextUpdate]);

  // Character data memoization with stable references
  const characterData = useMemo(() => 
    characters.map(character => ({
      character,
      isSelected: selectedElement === character.id,
      onEdit: () => handleCharacterEdit(character.id),
      onAddMessage: () => handleAddMessage(character.id),
      onRotate: onCharacterRotate ? (rotation: number) => onCharacterRotate(character.id, rotation) : undefined,
    })), [characters, selectedElement, handleCharacterEdit, handleAddMessage, onCharacterRotate]
  );

  // Message data memoization with character lookup optimization
  const messageData = useMemo(() => {
    const characterMap = new Map(characters.map(c => [c.id, c]));
    return messages.map(message => ({
      message,
      character: message.characterId ? characterMap.get(message.characterId) : undefined,
      isSelected: selectedElement === message.id,
      onTextUpdate: handleTextUpdate,
      onRotate: onMessageRotate ? (rotation: number) => onMessageRotate(message.id, rotation) : undefined,
    }));
  }, [messages, characters, selectedElement, handleTextUpdate, onMessageRotate]);

  // Optimized nodes conversion with performance considerations
  const nodes: Node[] = useMemo(() => {
    const isDraggingDisabled = selectedTool === 'message' || selectedTool === 'character';
    
    const characterNodes: Node[] = characterData.map((data, index) => ({
      id: data.character.id,
      type: 'character',
      position: data.character.position,
      data,
      selected: data.isSelected,
      draggable: !isDraggingDisabled,
      selectable: true,
      // Add stable keys for React optimization
      key: `char-${data.character.id}-${index}`,
    }));

    const messageNodes: Node[] = messageData.map((data, index) => ({
      id: data.message.id,
      type: 'message',
      position: data.message.position,
      data,
      selected: data.isSelected,
      draggable: !isDraggingDisabled,
      selectable: true,
      // Add stable keys for React optimization
      key: `msg-${data.message.id}-${index}`,
    }));

    return [...characterNodes, ...messageNodes];
  }, [characterData, messageData, selectedTool]);

  return nodes;
}