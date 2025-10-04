import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { 
  MousePointer,
  Hand,
  Users,
  MessageSquarePlus,
  Download,
  Settings,
  Zap,
  Link
} from 'lucide-react';

interface BottomToolbarProps {
  selectedTool: 'select' | 'character' | 'message' | 'pan' | 'connect';
  onToolSelect: (tool: 'select' | 'character' | 'message' | 'pan' | 'connect') => void;
  selectedElement?: string | null;
  elementCount?: {
    characters: number;
    messages: number;
    connections: number;
  };
  onExport?: () => void;
  onSettings?: () => void;
}

export function BottomToolbar({
  selectedTool,
  onToolSelect,
  elementCount,
  onExport,
  onSettings
}: BottomToolbarProps) {
  const tools = [
    { 
      id: 'select', 
      icon: MousePointer, 
      label: 'Select', 
      shortcut: 'V',
      description: 'Select, move & connect elements. Hold Shift+Drag for proximity connections',
      color: 'text-gray-700'
    },
    { 
      id: 'pan', 
      icon: Hand, 
      label: 'Pan', 
      shortcut: 'H',
      description: 'Navigate around the canvas',
      color: 'text-gray-700'
    },
    { 
      id: 'connect', 
      icon: Link, 
      label: 'Connect', 
      shortcut: 'L',
      description: 'Drag nodes near each other to auto-connect',
      color: 'text-green-600'
    },
    { 
      id: 'character', 
      icon: Users, 
      label: 'Character', 
      shortcut: 'C',
      description: 'Add new characters',
      color: 'text-blue-600'
    },
    { 
      id: 'message', 
      icon: MessageSquarePlus, 
      label: 'Message', 
      shortcut: 'M',
      description: 'Add chat messages',
      color: 'text-purple-600'
    }
  ];

  const handleToolClick = (toolId: string) => {
    onToolSelect(toolId as any);
  };

  return (
    <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
      {/* Left Stats - Element Count */}
      <div className="flex items-center gap-6">
        {elementCount && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-gray-700">{elementCount.characters}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {elementCount.characters} character{elementCount.characters !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span className="font-medium text-gray-700">{elementCount.messages}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {elementCount.messages} message{elementCount.messages !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium text-gray-700">{elementCount.connections}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {elementCount.connections} connection{elementCount.connections !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Center Main Tool Selection - Figma Style */}
      <div className="flex items-center">
        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
          <TooltipProvider>
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === tool.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleToolClick(tool.id)}
                    className={`
                      h-10 w-10 rounded-md transition-all duration-200 
                      ${selectedTool === tool.id 
                        ? 'bg-white shadow-sm border border-gray-200 text-gray-900' 
                        : 'hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white border-gray-700">
                  <div className="space-y-1">
                    <div className="font-medium">{tool.label}</div>
                    <div className="text-xs text-gray-300">{tool.description}</div>
                    <div className="text-xs">
                      Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">{tool.shortcut}</kbd>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Right Actions - Minimal */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {onExport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  className="h-10 w-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Export animation
              </TooltipContent>
            </Tooltip>
          )}

          {onSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSettings}
                  className="h-10 w-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Settings
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}