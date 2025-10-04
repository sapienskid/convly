import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Palette, 
  Type, 
  Layout, 
  Settings, 
  Camera, 
  Users,
  MessageSquare
} from 'lucide-react';

interface CustomizeSettings {
  // Chat Room Settings
  chatTopic: string;
  chatDescription: string;
  serverName: string;
  channelName: string;
  
  // Theme Settings
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  messageBackgroundColor: string;
  
  // Typography
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  
  // Layout
  messageSpacing: number;
  avatarSize: number;
  borderRadius: number;
  
  // Features
  showTimestamps: boolean;
  showAvatars: boolean;
  showUsernames: boolean;
  showOnlineStatus: boolean;
  enableReactions: boolean;
  enableTypingIndicator: boolean;
  
  // Video Settings
  videoQuality: string;
  frameRate: number;
  duration: number;
  format: string;
}

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySettings: (settings: CustomizeSettings) => void;
  currentSettings?: Partial<CustomizeSettings>;
}

const defaultSettings: CustomizeSettings = {
  chatTopic: "General Chat",
  chatDescription: "A place for general conversation",
  serverName: "My Discord Server",
  channelName: "general",
  backgroundColor: "#36393f",
  primaryColor: "#5865f2",
  secondaryColor: "#7289da",
  textColor: "#dcddde",
  messageBackgroundColor: "#40444b",
  fontFamily: "Whitney",
  fontSize: 14,
  lineHeight: 1.4,
  messageSpacing: 8,
  avatarSize: 40,
  borderRadius: 8,
  showTimestamps: true,
  showAvatars: true,
  showUsernames: true,
  showOnlineStatus: true,
  enableReactions: true,
  enableTypingIndicator: true,
  videoQuality: "1080p",
  frameRate: 30,
  duration: 60,
  format: "mp4"
};

const colorPresets = [
  { name: "Discord Dark", bg: "#36393f", primary: "#5865f2", secondary: "#7289da", text: "#dcddde" },
  { name: "WhatsApp", bg: "#e5ddd5", primary: "#25d366", secondary: "#128c7e", text: "#303030" },
  { name: "Telegram", bg: "#ffffff", primary: "#0088cc", secondary: "#54a9eb", text: "#000000" },
  { name: "Slack", bg: "#ffffff", primary: "#4a154b", secondary: "#1264a3", text: "#1d1c1d" },
  { name: "Dark Mode", bg: "#1a1a1a", primary: "#bb86fc", secondary: "#03dac6", text: "#ffffff" },
  { name: "Light Mode", bg: "#ffffff", primary: "#6200ea", secondary: "#3700b3", text: "#000000" }
];

const fontOptions = [
  "Whitney", "Roboto", "Inter", "Poppins", "Open Sans", "Lato", "Montserrat", "Source Sans Pro"
];

export function CustomizeModal({ isOpen, onClose, onApplySettings, currentSettings }: CustomizeModalProps) {
  const [settings, setSettings] = useState<CustomizeSettings>({
    ...defaultSettings,
    ...currentSettings
  });

  const updateSetting = (key: keyof CustomizeSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setSettings(prev => ({
      ...prev,
      backgroundColor: preset.bg,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      textColor: preset.text
    }));
  };

  const handleApply = () => {
    onApplySettings(settings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customize Chat Room
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="room" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="room" className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Room
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Palette className="w-4 h-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-1">
              <Type className="w-4 h-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-1">
              <Layout className="w-4 h-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              Video
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 max-h-[500px] overflow-y-auto">
            <TabsContent value="room" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Chat Room Details
                  </CardTitle>
                  <CardDescription>
                    Configure your chat room information and branding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serverName">Server Name</Label>
                      <Input
                        id="serverName"
                        value={settings.serverName}
                        onChange={(e) => updateSetting('serverName', e.target.value)}
                        placeholder="My Awesome Server"
                      />
                    </div>
                    <div>
                      <Label htmlFor="channelName">Channel Name</Label>
                      <Input
                        id="channelName"
                        value={settings.channelName}
                        onChange={(e) => updateSetting('channelName', e.target.value)}
                        placeholder="general"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="chatTopic">Chat Topic</Label>
                    <Input
                      id="chatTopic"
                      value={settings.chatTopic}
                      onChange={(e) => updateSetting('chatTopic', e.target.value)}
                      placeholder="What's this chat about?"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="chatDescription">Description</Label>
                    <Textarea
                      id="chatDescription"
                      value={settings.chatDescription}
                      onChange={(e) => updateSetting('chatDescription', e.target.value)}
                      placeholder="Describe your chat room..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Color Presets</CardTitle>
                  <CardDescription>Quick color schemes for popular messaging apps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {colorPresets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        className="h-auto p-3 flex flex-col items-center"
                        onClick={() => applyColorPreset(preset)}
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.bg }} />
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} />
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }} />
                        </div>
                        <span className="text-xs">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.backgroundColor}
                          onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.backgroundColor}
                          onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                          placeholder="#36393f"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => updateSetting('primaryColor', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.primaryColor}
                          onChange={(e) => updateSetting('primaryColor', e.target.value)}
                          placeholder="#5865f2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.secondaryColor}
                          onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.secondaryColor}
                          onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                          placeholder="#7289da"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.textColor}
                          onChange={(e) => updateSetting('textColor', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.textColor}
                          onChange={(e) => updateSetting('textColor', e.target.value)}
                          placeholder="#dcddde"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label>Font Family</Label>
                    <Select value={settings.fontFamily} onValueChange={(value) => updateSetting('fontFamily', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Font Size: {settings.fontSize}px</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      min={10}
                      max={24}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Line Height: {settings.lineHeight}</Label>
                    <Slider
                      value={[settings.lineHeight]}
                      onValueChange={([value]) => updateSetting('lineHeight', value)}
                      min={1}
                      max={2}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label>Message Spacing: {settings.messageSpacing}px</Label>
                    <Slider
                      value={[settings.messageSpacing]}
                      onValueChange={([value]) => updateSetting('messageSpacing', value)}
                      min={0}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Avatar Size: {settings.avatarSize}px</Label>
                    <Slider
                      value={[settings.avatarSize]}
                      onValueChange={([value]) => updateSetting('avatarSize', value)}
                      min={20}
                      max={60}
                      step={2}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Border Radius: {settings.borderRadius}px</Label>
                    <Slider
                      value={[settings.borderRadius]}
                      onValueChange={([value]) => updateSetting('borderRadius', value)}
                      min={0}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center justify-between">
                      <Label>Show Timestamps</Label>
                      <Switch
                        checked={settings.showTimestamps}
                        onCheckedChange={(checked) => updateSetting('showTimestamps', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show Avatars</Label>
                      <Switch
                        checked={settings.showAvatars}
                        onCheckedChange={(checked) => updateSetting('showAvatars', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Show Usernames</Label>
                      <Switch
                        checked={settings.showUsernames}
                        onCheckedChange={(checked) => updateSetting('showUsernames', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Online Status</Label>
                      <Switch
                        checked={settings.showOnlineStatus}
                        onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Video Export Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Video Quality</Label>
                      <Select value={settings.videoQuality} onValueChange={(value) => updateSetting('videoQuality', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p HD</SelectItem>
                          <SelectItem value="1080p">1080p Full HD</SelectItem>
                          <SelectItem value="1440p">1440p 2K</SelectItem>
                          <SelectItem value="2160p">2160p 4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Frame Rate</Label>
                      <Select value={settings.frameRate.toString()} onValueChange={(value) => updateSetting('frameRate', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 FPS</SelectItem>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="60">60 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Max Duration: {settings.duration} seconds</Label>
                    <Slider
                      value={[settings.duration]}
                      onValueChange={([value]) => updateSetting('duration', value)}
                      min={15}
                      max={300}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>Export Format</Label>
                    <Select value={settings.format} onValueChange={(value) => updateSetting('format', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="mov">MOV</SelectItem>
                        <SelectItem value="gif">GIF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSettings(defaultSettings)}>
                Reset to Default
              </Button>
              <Button onClick={handleApply}>
                Apply Settings
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}