import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Palette, User, ImageIcon, Eye, Save, X } from 'lucide-react';

interface CharacterEditModalProps {
  characterId: string;
  onClose: () => void;
}

export function CharacterEditModal({
  characterId,
  onClose
}: CharacterEditModalProps) {
  const { characters, updateCharacter } = useAppStore();
  const character = characters.find(c => c.id === characterId);
  const [formData, setFormData] = useState({
    username: character?.username || 'New User',
    avatar: character?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
    roleColor: character?.roleColor || 'hsl(var(--primary))'
  });

  useEffect(() => {
    if (character) {
      setFormData({
        username: character.username,
        avatar: character.avatar,
        roleColor: character.roleColor
      });
    }
  }, [character]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCharacter(characterId, formData);
    onClose();
  };

  const defaultAvatars = [
    'https://cdn.discordapp.com/embed/avatars/0.png',
    'https://cdn.discordapp.com/embed/avatars/1.png',
    'https://cdn.discordapp.com/embed/avatars/2.png',
    'https://cdn.discordapp.com/embed/avatars/3.png',
    'https://cdn.discordapp.com/embed/avatars/4.png',
    'https://cdn.discordapp.com/embed/avatars/5.png'
  ];

  const roleColors = [
    'hsl(var(--primary))',   // Primary
    '#ed4245',               // Red
    '#57f287',              // Green
    '#fee75c',              // Yellow
    '#eb459e',              // Pink
    '#ff7a00',              // Orange
    '#00d4ff',              // Cyan
    '#9c59b6'               // Purple
  ];

  if (!character) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="w-6 h-6 text-primary" />
            </div>
            Edit Character
          </DialogTitle>
          <DialogDescription className="text-base">
            Customize your Discord character's appearance and settings to match your vision.
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-6" />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Username Section */}
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Username</Label>
              </div>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                className="h-12 text-lg"
                data-editing="true"
                required
              />
            </CardContent>
          </Card>

          {/* Avatar Section */}
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Avatar</Label>
              </div>
              
              {/* Avatar Grid */}
              <div className="grid grid-cols-6 gap-3">
                {defaultAvatars.map((avatar, index) => (
                  <Button
                    key={avatar}
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, avatar }))}
                    className={`w-14 h-14 rounded-full p-0 transition-all ${
                      formData.avatar === avatar 
                        ? 'ring-2 ring-primary ring-offset-2 scale-110' 
                        : 'hover:scale-105'
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${index + 1}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </Button>
                ))}
              </div>
              
              {/* Custom Avatar URL */}
              <div className="space-y-3 pt-4">
                <Label className="text-sm font-medium text-muted-foreground">
                  Custom Avatar URL
                </Label>
                <Input
                  value={formData.avatar}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-10"
                  data-editing="true"
                />
              </div>
            </CardContent>
          </Card>

          {/* Role Color Section */}
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Role Color</Label>
              </div>
              
              {/* Color Grid */}
              <div className="grid grid-cols-4 gap-3">
                {roleColors.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    onClick={() => setFormData(prev => ({ ...prev, roleColor: color }))}
                    className={`w-16 h-16 p-0 border-2 rounded-lg transition-all ${
                      formData.roleColor === color 
                        ? 'ring-2 ring-primary ring-offset-2 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              
              {/* Custom Color */}
              <div className="flex gap-3 pt-4">
                <div className="relative">
                  <input
                    type="color"
                    value={formData.roleColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleColor: e.target.value }))}
                    className="w-12 h-12 rounded-lg border-2 border-input cursor-pointer"
                  />
                  <Badge variant="secondary" className="absolute -bottom-2 -right-2 text-xs">
                    Custom
                  </Badge>
                </div>
                <Input
                  value={formData.roleColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleColor: e.target.value }))}
                  placeholder="Enter color value"
                  className="flex-1 h-12"
                  data-editing="true"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Preview</Label>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={formData.avatar}
                      alt="Preview"
                      className="w-12 h-12 rounded-full border-2 border-border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                      }}
                    />
                    <div 
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
                      style={{ backgroundColor: formData.roleColor }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className="text-lg font-bold"
                      style={{ color: formData.roleColor }}
                    >
                      {formData.username}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Discord User • Online
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-lg"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Character
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}