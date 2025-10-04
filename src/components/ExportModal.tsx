import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Clock, Zap } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

export function ExportModal({ isOpen, onClose, onGenerate }: ExportModalProps) {
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [animationSpeed, setAnimationSpeed] = useState([1]);
  const [includeTyping, setIncludeTyping] = useState(true);
  const [includeSounds, setIncludeSounds] = useState(true);
  const [backgroundMusic, setBackgroundMusic] = useState('none');

  const soundOptions = [
    { id: 'notification', name: 'Discord Notification', duration: '0.5s' },
    { id: 'typing', name: 'Typing Sound', duration: 'variable' },
    { id: 'whoosh', name: 'Message Whoosh', duration: '0.3s' },
    { id: 'pop', name: 'Pop Sound', duration: '0.2s' }
  ];

  const musicOptions = [
    { id: 'none', name: 'No Music' },
    { id: 'chill', name: 'Chill Vibes' },
    { id: 'dramatic', name: 'Dramatic Tension' },
    { id: 'upbeat', name: 'Upbeat Energy' },
    { id: 'ambient', name: 'Ambient Background' }
  ];

  const getEstimatedTime = () => {
    const baseTime = 45; // seconds
    const qualityMultiplier = quality === '4K' ? 3 : quality === '1080p' ? 2 : 1;
    const effectsMultiplier = (includeTyping ? 1.3 : 1) * (includeSounds ? 1.2 : 1);
    return Math.ceil(baseTime * qualityMultiplier * effectsMultiplier);
  };

  const handleGenerate = () => {
    onGenerate();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Quality */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Video Quality</Label>
            <div className="grid grid-cols-3 gap-3">
              {['720p', '1080p', '4K'].map((q) => (
                <Button
                  key={q}
                  variant={quality === q ? "default" : "outline"}
                  onClick={() => setQuality(q)}
                  className="h-12 flex flex-col"
                >
                  <span className="font-medium">{q}</span>
                  <span className="text-xs opacity-70">
                    {q === '720p' && 'Fast'}
                    {q === '1080p' && 'Balanced'}
                    {q === '4K' && 'Best Quality'}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Animation Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Animation</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="speed">Animation Speed</Label>
                <span className="text-sm text-muted-foreground">
                  {animationSpeed[0]}x
                </span>
              </div>
              <Slider
                id="speed"
                value={animationSpeed}
                onValueChange={setAnimationSpeed}
                max={3}
                min={0.5}
                step={0.25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5x (Slow)</span>
                <span>1x (Normal)</span>
                <span>3x (Fast)</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="typing">Typing Animation</Label>
                <p className="text-sm text-muted-foreground">
                  Show typing indicators before messages
                </p>
              </div>
              <Switch
                id="typing"
                checked={includeTyping}
                onCheckedChange={setIncludeTyping}
              />
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Audio</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sounds">Sound Effects</Label>
                <p className="text-sm text-muted-foreground">
                  Include Discord notification sounds
                </p>
              </div>
              <Switch
                id="sounds"
                checked={includeSounds}
                onCheckedChange={setIncludeSounds}
              />
            </div>

            {includeSounds && (
              <div className="ml-4 space-y-2">
                <Label className="text-sm">Available Sounds</Label>
                <div className="grid grid-cols-2 gap-2">
                  {soundOptions.map((sound) => (
                    <div key={sound.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{sound.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {sound.duration}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Background Music</Label>
              <Select value={backgroundMusic} onValueChange={setBackgroundMusic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {musicOptions.map((music) => (
                    <SelectItem key={music.id} value={music.id}>
                      {music.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={format === 'mp4' ? "default" : "outline"}
                onClick={() => setFormat('mp4')}
                className="h-12 flex flex-col"
              >
                <span className="font-medium">MP4</span>
                <span className="text-xs opacity-70">Best for YouTube</span>
              </Button>
              <Button
                variant={format === 'gif' ? "default" : "outline"}
                onClick={() => setFormat('gif')}
                className="h-12 flex flex-col"
              >
                <span className="font-medium">GIF</span>
                <span className="text-xs opacity-70">For social media</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Generation Info */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estimated Generation Time</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Processing your {quality} video with effects...
              </span>
              <Badge variant="secondary">
                ~{getEstimatedTime()}s
              </Badge>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            size="lg"
            className="w-full h-12 bg-[#7289da] hover:bg-[#677bc4] text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}