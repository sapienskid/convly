import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Message, Character } from '../store';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { MessageSquare, Clock, AlertCircle } from 'lucide-react';

interface MessageFlowNodeProps {
  data: {
    message: Message;
    character?: Character;
    isSelected: boolean;
    onTextUpdate?: (id: string, text: string) => void;
    selectedTool?: string;
  };
  selected?: boolean;
}

const MessageFlowNodeComponent = ({ data, selected }: MessageFlowNodeProps) => {
  const { message, character, onTextUpdate, selectedTool } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoized event handlers for performance
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(message.text);
  }, [message.text]);

  const handleTextSubmit = useCallback(() => {
    if (onTextUpdate) {
      onTextUpdate(message.id, editText);
    }
    setIsEditing(false);
  }, [onTextUpdate, message.id, editText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.text);
    }
  }, [handleTextSubmit, message.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className={`relative group ${selectedTool === 'connect' ? 'cursor-crosshair' : ''}`}>
      {/* Connection Handles - Large and prominent for better UX */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={`w-8 h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
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
        className={`w-8 h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
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
        className={`w-8 h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
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
        className={`w-8 h-8 !bg-white !border-3 !border-purple-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={`w-8 h-8 !bg-white !border-3 !border-green-500 shadow-xl hover:!scale-110 transition-all duration-200 !rounded-full ${selectedTool === 'connect' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-10`}
        isConnectable={true}
      />

      {/* Message Node Card - Clean Figma-style design */}
      <div 
        className={`
          bg-white border rounded-lg p-4 max-w-xs shadow-sm hover:shadow-md 
          transition-all duration-200 cursor-pointer backdrop-blur-sm
          ${selectedTool === 'connect' ? 'hover:ring-2 hover:ring-green-300 hover:border-green-400' : ''}
          ${selected 
            ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
        onDoubleClick={handleDoubleClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-50 rounded flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Message
            </span>
          </div>
          {selected && (
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Character Assignment */}
        {character ? (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-md">
            <Avatar className="w-5 h-5 shrink-0">
              <AvatarImage src={character.avatar} alt={character.username} />
              <AvatarFallback 
                className="text-white text-xs font-medium"
                style={{ backgroundColor: character.roleColor }}
              >
                {character.username.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span 
              className="text-xs font-medium truncate"
              style={{ color: character.roleColor }}
            >
              {character.username}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-100 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-600 font-medium">
              No speaker assigned
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className="mb-3">
          {isEditing ? (
            <Textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={handleKeyDown}
              data-editing="true"
              className="min-h-[3rem] resize-none text-sm border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
              placeholder="Enter message content..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className="text-sm leading-relaxed break-words min-h-[3rem] p-3 bg-gray-50 rounded-md cursor-text hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
              onClick={handleDoubleClick}
            >
              {message.text || (
                <span className="text-gray-400 italic">Double-click to edit...</span>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {message.text?.length || 0} chars
          </div>
        </div>
      </div>
    </div>
  );
};

// Export memoized component for performance
export const MessageFlowNode = memo(MessageFlowNodeComponent);