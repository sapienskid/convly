import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Character } from '../store';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { User, MessageSquarePlus, Edit3 } from 'lucide-react';

interface CharacterFlowNodeProps {
  data: {
    character: Character;
    isSelected: boolean;
    onEdit?: () => void;
    onAddMessage?: () => void;
    selectedTool?: string;
  };
  selected?: boolean;
}

const CharacterFlowNodeComponent = ({ data, selected }: CharacterFlowNodeProps) => {
  const { character, onEdit, onAddMessage, selectedTool } = data;

  // Memoized event handlers for performance
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  const handleAddMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddMessage?.();
  }, [onAddMessage]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  return (
    <div className={`relative group ${selectedTool === 'connect' ? 'cursor-crosshair' : ''}`}>
      {/* Connection Handles - Large and prominent for better UX */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={`w-8 h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={`w-8 h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={`w-8 h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={`w-8 h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={`w-8 h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={`w-8 h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={`w-8 h-8 !bg-white !border-3 !border-blue-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={`w-8 h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />

      {/* Character Node Card - Figma-style minimal design */}
      <div 
        className={`
          bg-white border rounded-lg p-4 min-w-[240px] shadow-sm hover:shadow-md 
          transition-all duration-200 cursor-pointer backdrop-blur-sm
          ${selectedTool === 'connect' ? 'hover:ring-2 hover:ring-green-300 hover:border-green-400' : ''}
          ${selected 
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
        onDoubleClick={handleDoubleClick}
      >
        {/* Header with icon and selection indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-50 rounded flex items-center justify-center">
              <User className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Speaker
            </span>
          </div>
          {selected && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Character Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={character.avatar} alt={character.username} />
            <AvatarFallback 
              className="text-white text-sm font-medium"
              style={{ backgroundColor: character.roleColor }}
            >
              {character.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div 
              className="font-semibold truncate text-sm"
              style={{ color: character.roleColor }}
            >
              {character.username}
            </div>
            <div className="text-xs text-gray-500">
              Ready to speak
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
              title="Edit character"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMessage}
              className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
              title="Add message"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            #{character.id.slice(-4)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export memoized component for performance
export const CharacterFlowNode = memo(CharacterFlowNodeComponent);