import React, { useState } from 'react';
import { Character } from '../store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Upload } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCharacter: (character: Omit<Character, 'id' | 'position'>) => void;
}

const roleColors = [
  { name: 'Default', value: '#dcddde' },
  { name: 'Administrator', value: '#f04747' },
  { name: 'Moderator', value: '#7289da' },
  { name: 'VIP', value: '#f1c40f' },
  { name: 'Member', value: '#43b581' },
  { name: 'Bot', value: '#7289da' },
];

export function CharacterModal({ isOpen, onClose, onAddCharacter }: CharacterModalProps) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [roleColor, setRoleColor] = useState('#dcddde');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) return;

    onAddCharacter({
      username: username.trim(),
      avatar: avatar || '',
      roleColor
    });

    // Reset form
    setUsername('');
    setAvatar('');
    setRoleColor('#dcddde');
    onClose();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Character</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={avatar} />
                <AvatarFallback 
                  className="text-white text-lg"
                  style={{ backgroundColor: roleColor }}
                >
                  {username.slice(0, 2).toUpperCase() || 'AA'}
                </AvatarFallback>
              </Avatar>
              
              <label className="absolute bottom-4 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Upload an avatar or leave blank for initials
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          {/* Role Color */}
          <div className="space-y-2">
            <Label htmlFor="role">Role & Color</Label>
            <Select value={roleColor} onValueChange={setRoleColor}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: roleColor }}
                    ></div>
                    <span>
                      {roleColors.find(r => r.value === roleColor)?.name || 'Custom'}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleColors.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: role.value }}
                      ></div>
                      <span>{role.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="bg-[#36393f] rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Preview:</p>
            <div className="flex items-start space-x-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={avatar} />
                <AvatarFallback 
                  className="text-white text-xs"
                  style={{ backgroundColor: roleColor }}
                >
                  {username.slice(0, 2).toUpperCase() || 'AA'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-baseline space-x-2 mb-1">
                  <span 
                    className="text-sm font-medium" 
                    style={{ color: roleColor }}
                  >
                    {username || 'Username'}
                  </span>
                  <span className="text-xs text-gray-400">Today at 12:00 PM</span>
                </div>
                <p className="text-white text-sm">
                  This is how the character will appear in chat
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!username.trim()}>
              Add Character
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}