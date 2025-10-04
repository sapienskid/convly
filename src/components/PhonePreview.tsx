import { Character, Message, Connection } from '../store';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { analyzeMessageFlow, MessageFlowInfo } from '../utils/messageFlow';

interface PhonePreviewProps {
  characters: Character[];
  messages: Message[];
  connections: Connection[];
  previewState: 'preview' | 'loading' | 'video';
  isGenerating: boolean;
  customizeSettings?: any;
}

export function PhonePreview({ characters, messages, connections, previewState, customizeSettings = {} }: PhonePreviewProps) {
  // Use the new message flow analysis for proper ordering
  const messageFlowInfo: MessageFlowInfo[] = analyzeMessageFlow(messages, connections);
  
  const backgroundColor = customizeSettings.backgroundColor || '#36393f';
  const primaryColor = customizeSettings.primaryColor || '#5865f2';
  const textColor = customizeSettings.textColor || '#dcddde';

  const renderDiscordChat = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor }}>
      {/* Discord Header */}
      <div 
        className="p-3 border-b flex items-center flex-shrink-0"
        style={{ 
          backgroundColor: backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`,
          borderBottomColor: backgroundColor === '#36393f' ? '#202225' : `${backgroundColor}44`
        }}
      >
        <div 
          className="w-6 h-6 rounded-full mr-3 flex items-center justify-center"
          style={{ backgroundColor: primaryColor }}
        >
          <span className="text-white text-xs">#</span>
        </div>
        <span className="text-sm" style={{ color: textColor }}>
          {customizeSettings.channelName || 'general'}
        </span>
      </div>

      {/* Messages Area - Enhanced with smooth scrolling */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="p-4 space-y-3 min-h-full">
          {messageFlowInfo.length === 0 ? (
            <div className="text-center text-sm mt-8 space-y-2" style={{ color: `${textColor}80` }}>
              <div>Welcome to #{customizeSettings.channelName || 'general'}!</div>
              <div className="text-xs" style={{ color: `${textColor}60` }}>
                This is the start of your conversation.
              </div>
            </div>
          ) : (
            messageFlowInfo.map((flowInfo) => {
              const { message } = flowInfo;
              const character = characters.find(c => c.id === message.characterId);
              
              // Handle unassigned messages
              const displayCharacter = character || {
                id: 'unassigned',
                username: 'Unknown',
                avatar: '',
                roleColor: '#99aab5' // Discord's default gray color
              };

              return (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={displayCharacter.avatar} />
                    <AvatarFallback 
                      className="text-white text-xs font-medium"
                      style={{ backgroundColor: displayCharacter.roleColor }}
                    >
                      {displayCharacter.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span 
                        className="text-sm font-medium" 
                        style={{ 
                          color: character ? displayCharacter.roleColor : '#99aab5',
                          opacity: character ? 1 : 0.7
                        }}
                      >
                        {displayCharacter.username}
                        {!character && ' (Unassigned)'}
                      </span>
                      <span className="text-xs" style={{ color: `${textColor}60` }}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <div 
                      className="text-sm leading-relaxed break-words"
                      style={{ 
                        color: textColor,
                        opacity: character ? 1 : 0.8
                      }}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Discord Input */}
      <div 
        className="p-4 flex-shrink-0"
        style={{ 
          backgroundColor: backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`
        }}
      >
        <div 
          className="rounded-lg p-3"
          style={{ 
            backgroundColor: backgroundColor === '#36393f' ? '#40444b' : `${backgroundColor}33`
          }}
        >
          <span className="text-sm" style={{ color: `${textColor}60` }}>
            Message #{customizeSettings.channelName || 'general'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderVideoPlayer = () => (
    <div className="h-full flex flex-col relative" style={{ backgroundColor }}>
      {/* Video Overlay with animated Discord chat */}
      <div className="absolute inset-0 z-10">
        {renderDiscordChat()}
      </div>
      
      {/* Simulated Video Layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-10"
          aria-hidden="true"
        />
        <div 
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-white ml-1"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* iPhone Frame */}
      <div className="w-80 h-[600px] bg-black rounded-[2.5rem] p-2 shadow-2xl">
        {/* Screen */}
        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
          {/* Status Bar */}
          <div className="bg-black h-6 flex items-center justify-between px-6 text-white text-xs">
            <span>9:41</span>
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full opacity-30"></div>
              </div>
              <div className="w-6 h-3 border border-white rounded-sm">
                <div className="w-4 h-1.5 bg-white rounded-sm m-0.5"></div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-24px)]">
            {previewState === 'preview' && renderDiscordChat()}
            {previewState === 'loading' && (
              <div className="h-full flex items-center justify-center relative" style={{ backgroundColor }}>
                {renderDiscordChat()}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div 
                    className="rounded-lg p-6 text-center max-w-xs"
                    style={{ 
                      backgroundColor: backgroundColor === '#36393f' ? '#2f3136' : `${backgroundColor}dd`
                    }}
                  >
                    <div 
                      className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                      style={{ borderColor: `${primaryColor}40`, borderTopColor: 'transparent' }}
                    ></div>
                    <p className="mb-2" style={{ color: textColor }}>Generating your video...</p>
                    <Progress value={65} className="w-full h-2" />
                  </div>
                </div>
              </div>
            )}
            {previewState === 'video' && renderVideoPlayer()}
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  );
}