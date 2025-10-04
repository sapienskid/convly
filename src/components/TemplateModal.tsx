import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Play, Smartphone, MessageCircle } from 'lucide-react';

interface AppTheme {
  id: string;
  name: string;
  category: string;
  description: string;
  backgroundColor: string;
  messageStyle: string;
  fontFamily: string;
  preview: string;
  features: string[];
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: any) => void;
}

const messagingAppTemplates: AppTheme[] = [
  {
    id: 'discord',
    name: 'Discord Style',
    category: 'Gaming',
    description: 'Dark theme with gaming-focused design',
    backgroundColor: '#36393f',
    messageStyle: 'bubbles',
    fontFamily: 'Whitney, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Dark theme', 'Username colors', 'Timestamps', 'Avatar bubbles']
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Style',
    category: 'Social',
    description: 'Clean bubble design with green accents',
    backgroundColor: '#e5ddd5',
    messageStyle: 'bubbles',
    fontFamily: 'Roboto, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Message bubbles', 'Green accents', 'Time stamps', 'Read receipts']
  },
  {
    id: 'telegram',
    name: 'Telegram Style',
    category: 'Social',
    description: 'Minimalist design with blue theme',
    backgroundColor: '#ffffff',
    messageStyle: 'bubbles',
    fontFamily: 'Roboto, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Clean design', 'Blue accents', 'Minimalist UI', 'Profile photos']
  },
  {
    id: 'slack',
    name: 'Slack Style',
    category: 'Business',
    description: 'Professional workspace design',
    backgroundColor: '#ffffff',
    messageStyle: 'linear',
    fontFamily: 'Lato, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Professional look', 'Thread support', 'Reactions', 'File sharing']
  },
  {
    id: 'imessage',
    name: 'iMessage Style',
    category: 'Social',
    description: 'iOS native messaging design',
    backgroundColor: '#ffffff',
    messageStyle: 'bubbles',
    fontFamily: 'SF Pro Display, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['iOS design', 'Blue/gray bubbles', 'Tapback reactions', 'Message effects']
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Business',
    description: 'Corporate communication design',
    backgroundColor: '#f3f2f1',
    messageStyle: 'linear',
    fontFamily: 'Segoe UI, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Corporate style', 'Purple accents', 'Meeting integration', 'File collaboration']
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    category: 'Social',
    description: 'Modern social media messaging',
    backgroundColor: '#ffffff',
    messageStyle: 'bubbles',
    fontFamily: 'Instagram Sans, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Stories integration', 'Media sharing', 'Gradient accents', 'Heart reactions']
  },
  {
    id: 'tiktok',
    name: 'TikTok Chat',
    category: 'Social',
    description: 'Trendy social media design',
    backgroundColor: '#000000',
    messageStyle: 'bubbles',
    fontFamily: 'Proxima Nova, sans-serif',
    preview: '/api/placeholder/200/300',
    features: ['Dark theme', 'Pink/cyan accents', 'Video previews', 'Emoji reactions']
  }
];

const categories = ['All', 'Gaming', 'Social', 'Business'];

export function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTemplates = messagingAppTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: AppTheme) => {
    // Create a basic template structure for the selected app style
    const templateData = {
      id: template.id,
      title: template.name,
      appTheme: template,
      characters: [],
      messages: [],
      connections: []
    };
    
    onSelectTemplate(templateData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Messaging App Templates
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a messaging app design style for your video
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search app styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-8"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleSelectTemplate(template)}
              >
                {/* Preview Image */}
                <div 
                  className="h-32 flex items-center justify-center relative"
                  style={{ backgroundColor: template.backgroundColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
                  <MessageCircle className="w-12 h-12 text-white/80" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white bg-black/50 rounded-full p-1" />
                  </div>
                </div>

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm mb-1">{template.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground mb-3">
                    {template.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-2 py-0">
                          {feature}
                        </Badge>
                      ))}
                      {template.features.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          +{template.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates found matching your criteria.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Create from Scratch */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={onClose}
            >
              <div className="text-center">
                <p className="font-medium text-sm">Create Custom Style</p>
                <p className="text-xs text-muted-foreground">Start with a blank canvas and customize everything</p>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}