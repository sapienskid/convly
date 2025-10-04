import { useState, useEffect } from 'react';
import { PhonePreview } from './PhonePreview';
import { TemplateModal } from './TemplateModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { 
  Layers, 
  Palette, 
  Download,
  Play,
  Pause,
  Volume2,
  SkipBack,
  SkipForward,
  Video,
  Loader2,
  Sparkles,
  Settings,
  Gauge,
  ChevronDown,
  Users,
  MessageSquare,
  VolumeX,
  LayoutPanelLeft,
  GalleryVertical,
  Type
} from 'lucide-react';
import { Character, Message, Connection } from '../store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface RightPanelProps {
  characters: Character[];
  messages: Message[];
  connections: Connection[];
  previewState: 'preview' | 'loading' | 'video';
  isGenerating: boolean;
  customizeSettings: any;
  onTemplateSelect: (template: any) => void;
  onCustomizationApply: (settings: any) => void;
  onGenerateVideo: () => void;
}

function RightPanelInternal({
  characters,
  messages,
  connections,
  previewState,
  isGenerating,
  customizeSettings,
  onTemplateSelect,
  onCustomizationApply,
  onGenerateVideo
}: RightPanelProps) {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const sidebar = useSidebar();
  
  // Video controls state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  
  // Collapsible panels state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    colors: true,
    layout: false,
    typography: false,
    chatRoom: false,
    quality: false,
    animation: false,
    audio: false,
    format: false,
    templates: false
  });

  useEffect(() => {
    if (sidebar && sidebar.state === 'collapsed') {
      const allClosed = Object.keys(openSections).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      setOpenSections(allClosed);
    }
  }, [sidebar]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };



  const handleVideoPlayPause = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '#';
    link.download = 'discord-chat-animation.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = Math.floor((videoProgress / 100) * 32);
  const totalTime = 32;

  return (
    <>
      {/* Phone Preview Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Preview Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-background to-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold tracking-tight">Preview</h2>
              <p className="text-xs text-muted-foreground">
                {previewState === 'preview' && 'Current chat visualization'}
                {previewState === 'loading' && 'Generating video...'}
                {previewState === 'video' && 'Final animation ready'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-medium border-primary/20 bg-primary/5">
                <Users className="w-3 h-3 mr-1" />
                {characters.length}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium border-primary/20 bg-primary/5">
                <MessageSquare className="w-3 h-3 mr-1" />
                {messages.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Phone Preview Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
          <div className="transform scale-90 origin-center">
            <PhonePreview
              characters={characters}
              messages={messages}
              connections={connections}
              previewState={previewState}
              isGenerating={isGenerating}
              customizeSettings={customizeSettings}
            />
          </div>
        </div>

        {/* Video Controls - Below Phone */}
        {previewState === 'video' && (
          <div className="px-2 pb-2">
            <Card className="border-border/50 shadow-sm bg-gradient-to-r from-background to-muted/20">
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Video className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Chat Animation</div>
                      <div className="text-[10px] text-muted-foreground">
                        1080p • {formatTime(totalTime)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-200 text-[10px]">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Ready
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 mb-1.5">
                  <Progress value={videoProgress} className="w-full h-1.5 bg-muted" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalTime)}</span>
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVideoProgress(Math.max(0, videoProgress - 10))}
                      className="h-6 w-6 p-0 border-border/50"
                    >
                      <SkipBack className="w-3 h-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={handleVideoPlayPause}
                      className="h-6 w-8 bg-primary hover:bg-primary/90"
                    >
                      {isVideoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVideoProgress(Math.min(100, videoProgress + 10))}
                      className="h-6 w-6 p-0 border-border/50"
                    >
                      <SkipForward className="w-3 h-3" />
                    </Button>
                    
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMuteToggle}
                        className="h-5 w-5 p-0"
                      >
                        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </Button>
                      <div className="w-10">
                        <Slider
                          value={[isMuted ? 0 : volume] as number[]}
                          onValueChange={(value: number[]) => {
                            setVolume(value[0]);
                            if (value[0] > 0) setIsMuted(false);
                          }}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleDownload}
                    size="sm"
                    className="gap-1 bg-primary hover:bg-primary/90 h-6 text-xs px-2"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Property Panel Sidebar */}
      <div>
        <Sidebar side="right" collapsible="icon" className="border-l border-border/30">
          <SidebarHeader className="pb-0 group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:py-2">
            <div className="flex items-center justify-start group-data-[state=expanded]:p-2">
              <SidebarTrigger className="h-10 w-10" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <ScrollArea className="h-full">
              {/* Colors Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.colors} 
                  onOpenChange={() => toggleSection('colors')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Colors</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.colors ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="background-color" className="text-xs font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-muted border" />
                        Background Color
                      </Label>
                      <div className="flex gap-1.5">
                        <input
                          id="background-color-picker"
                          type="color"
                          value={customizeSettings.backgroundColor || '#36393f'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            backgroundColor: e.target.value
                          })}
                          className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent shadow-sm"
                        />
                        <Input
                          id="background-color"
                          type="text"
                          value={customizeSettings.backgroundColor || '#36393f'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            backgroundColor: e.target.value
                          })}
                          placeholder="#36393f"
                          className="flex-1 border-border/50 h-8 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="primary-color" className="text-xs font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Primary Color
                      </Label>
                      <div className="flex gap-1.5">
                        <input
                          id="primary-color-picker"
                          type="color"
                          value={customizeSettings.primaryColor || '#5865f2'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            primaryColor: e.target.value
                          })}
                          className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent shadow-sm"
                        />
                        <Input
                          id="primary-color"
                          type="text"
                          value={customizeSettings.primaryColor || '#5865f2'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            primaryColor: e.target.value
                          })}
                          placeholder="#5865f2"
                          className="flex-1 border-border/50 h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Color Presets */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quick Presets</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { bg: '#36393f', primary: '#5865f2', name: 'Discord Dark' },
                          { bg: '#ffffff', primary: '#25d366', name: 'WhatsApp Light' },
                          { bg: '#f0f2f5', primary: '#0088cc', name: 'Telegram' },
                          { bg: '#1a1a1a', primary: '#ff6b6b', name: 'Dark Red' },
                          { bg: '#f8fafc', primary: '#3b82f6', name: 'Light Blue' },
                          { bg: '#0f0f23', primary: '#ffd700', name: 'Dark Gold' },
                        ].map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            className="w-full h-8 p-1 border-border/50 hover:border-primary/50"
                            onClick={() => onCustomizationApply({
                              ...customizeSettings,
                              backgroundColor: preset.bg,
                              primaryColor: preset.primary
                            })}
                            title={preset.name}
                          >
                            <div className="w-full h-full rounded flex">
                              <div 
                                className="flex-1 rounded-l" 
                                style={{ backgroundColor: preset.bg }}
                              />
                              <div 
                                className="flex-1 rounded-r" 
                                style={{ backgroundColor: preset.primary }}
                              />
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="secondary-color" className="text-xs font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        Secondary Color
                      </Label>
                      <div className="flex gap-1.5">
                        <input
                          id="secondary-color-picker"
                          type="color"
                          value={customizeSettings.secondaryColor || '#42454a'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            secondaryColor: e.target.value
                          })}
                          className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent shadow-sm"
                        />
                        <Input
                          id="secondary-color"
                          type="text"
                          value={customizeSettings.secondaryColor || '#42454a'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            secondaryColor: e.target.value
                          })}
                          placeholder="#42454a"
                          className="flex-1 border-border/50 h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message-bg-color" className="text-xs font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-muted" />
                        Message Background
                      </Label>
                      <div className="flex gap-1.5">
                        <input
                          id="message-bg-color-picker"
                          type="color"
                          value={customizeSettings.messageBackgroundColor || '#40444b'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            messageBackgroundColor: e.target.value
                          })}
                          className="w-8 h-8 rounded-md border border-border/50 cursor-pointer bg-transparent shadow-sm"
                        />
                        <Input
                          id="message-bg-color"
                          type="text"
                          value={customizeSettings.messageBackgroundColor || '#40444b'}
                          onChange={(e) => onCustomizationApply({
                            ...customizeSettings,
                            messageBackgroundColor: e.target.value
                          })}
                          placeholder="#40444b"
                          className="flex-1 border-border/50 h-8 text-xs"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>

              {/* Chat Room Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.chatRoom} 
                  onOpenChange={() => toggleSection('chatRoom')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Chat Room</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.chatRoom ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="server-name" className="text-xs font-medium">Server Name</Label>
                      <Input
                        id="server-name"
                        type="text"
                        value={customizeSettings.serverName || 'My Discord Server'}
                        onChange={(e) => onCustomizationApply({
                          ...customizeSettings,
                          serverName: e.target.value
                        })}
                        placeholder="My Discord Server"
                        className="border-border/50 h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="channel-name" className="text-xs font-medium">Channel Name</Label>
                      <Input
                        id="channel-name"
                        type="text"
                        value={customizeSettings.channelName || 'general'}
                        onChange={(e) => onCustomizationApply({
                          ...customizeSettings,
                          channelName: e.target.value
                        })}
                        placeholder="general"
                        className="border-border/50 h-8 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="chat-topic" className="text-xs font-medium">Chat Topic</Label>
                      <Input
                        id="chat-topic"
                        type="text"
                        value={customizeSettings.chatTopic || 'General Chat'}
                        onChange={(e) => onCustomizationApply({
                          ...customizeSettings,
                          chatTopic: e.target.value
                        })}
                        placeholder="What's this chat about?"
                        className="border-border/50 h-8 text-xs"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Typography Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.typography} 
                  onOpenChange={() => toggleSection('typography')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Type className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Typography</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.typography ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="font-family" className="text-xs font-medium">Font Family</Label>
                      <Select 
                        value={customizeSettings.fontFamily || 'Whitney'} 
                        onValueChange={(value) => onCustomizationApply({
                          ...customizeSettings,
                          fontFamily: value
                        })}
                      >
                        <SelectTrigger id="font-family" className="w-full border-border/50 h-8 text-xs">
                          <SelectValue placeholder="Font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Whitney">Whitney</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Font Size</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.fontSize || 14}px</span>
                      </div>
                      <Slider
                        value={[customizeSettings.fontSize || 14]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          fontSize: value
                        })}
                        max={24}
                        min={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Small</span>
                        <span>Large</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Line Height</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.lineHeight || 1.4}</span>
                      </div>
                      <Slider
                        value={[customizeSettings.lineHeight || 1.4]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          lineHeight: value
                        })}
                        max={2}
                        min={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Layout Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.layout} 
                  onOpenChange={() => toggleSection('layout')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <LayoutPanelLeft className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Layout</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.layout ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">Compact Mode</Label>
                          <p className="text-[10px] text-muted-foreground">Reduce spacing</p>
                        </div>
                        <Switch />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">Show Timestamps</Label>
                          <p className="text-[10px] text-muted-foreground">Display time</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">User Avatars</Label>
                        <p className="text-[10px] text-muted-foreground">Show profile pictures</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Separator className="my-1" />

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Message Spacing</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.messageSpacing || 8}px</span>
                      </div>
                      <Slider
                        value={[customizeSettings.messageSpacing || 8]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          messageSpacing: value
                        })}
                        max={20}
                        min={2}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Avatar Size</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.avatarSize || 40}px</span>
                      </div>
                      <Slider
                        value={[customizeSettings.avatarSize || 40]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          avatarSize: value
                        })}
                        max={64}
                        min={24}
                        step={4}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Border Radius</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.borderRadius || 8}px</span>
                      </div>
                      <Slider
                        value={[customizeSettings.borderRadius || 8]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          borderRadius: value
                        })}
                        max={20}
                        min={0}
                        step={2}
                        className="w-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Video Quality Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.quality} 
                  onOpenChange={() => toggleSection('quality')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Video Quality</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.quality ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Video Quality</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { value: '720p', label: '720p HD', desc: 'Fast' },
                          { value: '1080p', label: '1080p', desc: 'Balanced' },
                          { value: '4k', label: '4K Ultra', desc: 'Best Quality' },
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={customizeSettings.videoQuality === option.value ? "default" : "outline"}
                            onClick={() => onCustomizationApply({
                              ...customizeSettings,
                              videoQuality: option.value
                            })}
                            className="h-10 flex flex-col gap-0.5 p-1.5 text-xs"
                          >
                            <span className="font-medium">{option.label}</span>
                            <span className="text-[10px] opacity-70">{option.desc}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="frame-rate" className="text-xs font-medium">Frame Rate</Label>
                        <Select 
                          value={customizeSettings.frameRate || '30'}
                          onValueChange={(value) => onCustomizationApply({
                            ...customizeSettings,
                            frameRate: value
                          })}
                        >
                          <SelectTrigger id="frame-rate" className="w-full border-border/50 h-8 text-xs">
                            <SelectValue placeholder="FPS" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24">24 FPS</SelectItem>
                            <SelectItem value="30">30 FPS</SelectItem>
                            <SelectItem value="60">60 FPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Duration</Label>
                          <span className="text-xs text-muted-foreground">{customizeSettings.animationDuration || 30}s</span>
                        </div>
                        <Slider
                          value={[customizeSettings.animationDuration || 30]}
                          onValueChange={([value]) => onCustomizationApply({
                            ...customizeSettings,
                            animationDuration: value
                          })}
                          max={120}
                          min={10}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Animation Settings Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.animation} 
                  onOpenChange={() => toggleSection('animation')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Play className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Animation</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.animation ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Animation Speed</Label>
                        <span className="text-xs text-muted-foreground">{customizeSettings.animationSpeed || 1}x</span>
                      </div>
                      <Slider
                        value={[customizeSettings.animationSpeed || 1]}
                        onValueChange={([value]) => onCustomizationApply({
                          ...customizeSettings,
                          animationSpeed: value
                        })}
                        max={3}
                        min={0.5}
                        step={0.25}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0.5x (Slow)</span>
                        <span>1x (Normal)</span>
                        <span>3x (Fast)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">Typing Animation</Label>
                        <p className="text-[10px] text-muted-foreground">Show typing indicators</p>
                      </div>
                      <Switch 
                        checked={customizeSettings.includeTyping ?? true}
                        onCheckedChange={(checked) => onCustomizationApply({
                          ...customizeSettings,
                          includeTyping: checked
                        })}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Audio Settings Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.audio} 
                  onOpenChange={() => toggleSection('audio')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Audio</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.audio ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">Sound Effects</Label>
                        <p className="text-[10px] text-muted-foreground">Discord notifications</p>
                      </div>
                      <Switch 
                        checked={customizeSettings.includeSounds ?? true}
                        onCheckedChange={(checked) => onCustomizationApply({
                          ...customizeSettings,
                          includeSounds: checked
                        })}
                      />
                    </div>

                    {customizeSettings.includeSounds && (
                      <div className="ml-4 space-y-2">
                        <Label className="text-xs">Available Sounds</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { name: 'Notification', duration: '0.5s' },
                            { name: 'Typing', duration: 'variable' },
                            { name: 'Whoosh', duration: '0.3s' },
                            { name: 'Pop', duration: '0.2s' }
                          ].map((sound) => (
                            <div key={sound.name} className="flex items-center justify-between p-2 border border-border/50 rounded text-xs">
                              <span>{sound.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {sound.duration}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Background Music</Label>
                      <Select 
                        value={customizeSettings.backgroundMusic || 'none'}
                        onValueChange={(value) => onCustomizationApply({
                          ...customizeSettings,
                          backgroundMusic: value
                        })}
                      >
                        <SelectTrigger className="w-full border-border/50 h-8 text-xs">
                          <SelectValue placeholder="Select music" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Music</SelectItem>
                          <SelectItem value="chill">Chill Vibes</SelectItem>
                          <SelectItem value="dramatic">Dramatic Tension</SelectItem>
                          <SelectItem value="upbeat">Upbeat Energy</SelectItem>
                          <SelectItem value="ambient">Ambient Background</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Export Format Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.format} 
                  onOpenChange={() => toggleSection('format')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Export Format</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.format ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { format: 'mp4', label: 'MP4', desc: 'Best for YouTube', recommended: true },
                        { format: 'gif', label: 'GIF', desc: 'For social media', recommended: false },
                      ].map((option) => (
                        <Button
                          key={option.format}
                          variant={customizeSettings.exportFormat === option.format ? "default" : "outline"}
                          onClick={() => onCustomizationApply({
                            ...customizeSettings,
                            exportFormat: option.format
                          })}
                          className="h-10 flex flex-col gap-0.5 p-1.5 relative text-xs"
                        >
                          {option.recommended && (
                            <Badge className="absolute -top-1 -right-1 text-[10px] bg-primary px-1 py-0">
                              Best
                            </Badge>
                          )}
                          <span className="text-xs font-semibold">{option.label}</span>
                          <span className="text-[10px] text-muted-foreground">{option.desc}</span>
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">High Quality</Label>
                          <p className="text-[10px] text-muted-foreground">Better quality</p>
                        </div>
                        <Switch 
                          checked={customizeSettings.highQuality ?? true}
                          onCheckedChange={(checked) => onCustomizationApply({
                            ...customizeSettings,
                            highQuality: checked
                          })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">Include Audio</Label>
                          <p className="text-[10px] text-muted-foreground">Sound effects</p>
                        </div>
                        <Switch 
                          checked={customizeSettings.includeAudio ?? false}
                          onCheckedChange={(checked) => onCustomizationApply({
                            ...customizeSettings,
                            includeAudio: checked
                          })}
                        />
                      </div>
                    </div>
                    
                    {/* Export Estimation */}
                    <Card className="border-border/50 shadow-sm border-l-4 border-l-primary">
                      <CardContent className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                            <Gauge className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-xs">Estimation</h3>
                            <div className="grid grid-cols-2 gap-2 mt-0.5 text-[10px]">
                              <div>
                                <span className="text-muted-foreground">Size:</span>
                                <span className="ml-1 font-medium">~{(customizeSettings.exportFormat === 'gif' ? '8' : '15')}MB</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Time:</span>
                                <span className="ml-1 font-medium">~45s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Generate Video Button */}
                    <Button
                      onClick={onGenerateVideo}
                      disabled={isGenerating}
                      size="sm"
                      className="w-full h-10 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs font-semibold shadow-md disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Video
                        </>
                      )}
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
              
              {/* Templates Section */}
              <SidebarGroup>
                <Collapsible 
                  open={openSections.templates} 
                  onOpenChange={() => toggleSection('templates')}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Layers className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Templates</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.templates ? '' : '-rotate-90'}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 pb-1 px-2 space-y-3">
                    <div className="space-y-2">
                      {[
                        { name: 'Discord', color: '#5865f2', bg: '#36393f' },
                        { name: 'WhatsApp', color: '#25d366', bg: '#f0f2f5' },
                        { name: 'Telegram', color: '#0088cc', bg: '#ffffff' },
                      ].map((app) => (
                        <Button
                          key={app.name}
                          variant="outline"
                          className="w-full h-9 justify-start px-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                          onClick={() => {
                            onTemplateSelect({
                              appTheme: {
                                name: app.name,
                                backgroundColor: app.bg,
                                primaryColor: app.color,
                              }
                            });
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded mr-2 border border-border/30"
                            style={{ backgroundColor: app.color }}
                          />
                          <span className="text-xs font-medium">{app.name}</span>
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        className="w-full h-9 justify-center gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => setIsTemplateModalOpen(true)}
                      >
                        <GalleryVertical className="h-3.5 w-3.5" />
                        <span className="text-xs">Browse All Templates</span>
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            </ScrollArea>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    // Save project settings to localStorage
                    const projectData = {
                      characters,
                      messages,
                      connections,
                      customizeSettings,
                      timestamp: new Date().toISOString()
                    };
                    localStorage.setItem('convly-project', JSON.stringify(projectData));
                    // TODO: Show success toast notification
                    console.log('Project saved successfully');
                  }}
                  tooltip="Save Project"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Save Project</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>
      
      {/* Modals */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(template) => {
          onTemplateSelect(template);
          setIsTemplateModalOpen(false);
        }}
      />
    </>
  );
}

export function RightPanel(props: RightPanelProps) {
  return (
    <div className="bg-background flex h-full w-full">
      <SidebarProvider defaultOpen={false}>
        <RightPanelInternal {...props} />
      </SidebarProvider>
    </div>
  );
}