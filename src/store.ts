import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Character {
  id: string;
  username: string;
  avatar: string;
  roleColor: string;
  position: { x: number; y: number };
  rotation?: number; // Rotation in degrees
}

export interface Message {
  id: string;
  characterId?: string;
  text: string;
  position: { x: number; y: number };
  timestamp: string;
  rotation?: number; // Rotation in degrees
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  type: 'assignment' | 'flow';
  color: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface AppState {
  // Core entities
  characters: Character[];
  messages: Message[];
  connections: Connection[];

  // UI state
  selectedTool: 'select' | 'character' | 'message' | 'pan' | 'connect';
  selectedElement: string | null;
  editingCharacter: string | null;

  // Preview state
  previewState: 'preview' | 'loading' | 'video';
  isGenerating: boolean;

  // Customization
  customizeSettings: {
    backgroundColor: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
  };

  // Actions
  setCharacters: (characters: Character[]) => void;
  setMessages: (messages: Message[]) => void;
  setConnections: (connections: Connection[]) => void;
  setSelectedTool: (tool: 'select' | 'character' | 'message' | 'pan' | 'connect') => void;
  setSelectedElement: (element: string | null) => void;
  setEditingCharacter: (character: string | null) => void;
  setPreviewState: (state: 'preview' | 'loading' | 'video') => void;
  setIsGenerating: (generating: boolean) => void;
  setCustomizeSettings: (settings: Partial<AppState['customizeSettings']>) => void;

  // Entity actions
  addCharacter: (character: Omit<Character, 'id'>) => string;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  updateCharacterPosition: (id: string, position: { x: number; y: number }) => void;
  updateCharacterRotation: (id: string, rotation: number) => void;
  deleteCharacter: (id: string) => void;

  addMessage: (message: Omit<Message, 'id'>) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  updateMessagePosition: (id: string, position: { x: number; y: number }) => void;
  updateMessageRotation: (id: string, rotation: number) => void;
  updateMessageText: (id: string, text: string) => void;
  deleteMessage: (id: string) => void;

  addConnection: (connection: Omit<Connection, 'id'>) => string;
  deleteConnection: (id: string) => void;

  // Utility actions
  addCharacterAtPosition: (position: { x: number; y: number }) => string;
  addMessageAtPosition: (position: { x: number; y: number }) => string;
  addMessageForCharacter: (characterId: string) => string;
  createConnection: (from: string, to: string, sourceHandle?: string, targetHandle?: string) => void;
  deleteElement: (id: string, type: 'character' | 'message') => void;

  // Template and customization actions
  handleGenerateVideo: () => void;
  handleTemplateSelect: (template: any) => void;
  handleApplyCustomization: (settings: any) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state with demo content
      characters: [
        {
          id: 'char-demo-1',
          username: 'Alex Chen',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          roleColor: '#3b82f6',
          position: { x: 100, y: 100 }
        },
        {
          id: 'char-demo-2', 
          username: 'Sarah Wilson',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c9ce?w=150&h=150&fit=crop&crop=face',
          roleColor: '#8b5cf6',
          position: { x: 100, y: 300 }
        }
      ],
      messages: [
        {
          id: 'msg-demo-1',
          characterId: 'char-demo-1',
          text: 'Hey everyone! Welcome to our Discord chat animation builder 🎉',
          position: { x: 400, y: 80 },
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-demo-2',
          characterId: 'char-demo-2', 
          text: 'This looks amazing! Can\'t wait to create some cool animations 🚀',
          position: { x: 400, y: 280 },
          timestamp: new Date().toISOString()
        }
      ],
      connections: [
        {
          id: 'conn-demo-1',
          from: 'char-demo-1',
          to: 'msg-demo-1',
          type: 'assignment',
          color: '#3b82f6'
        },
        {
          id: 'conn-demo-2',
          from: 'char-demo-2',
          to: 'msg-demo-2', 
          type: 'assignment',
          color: '#8b5cf6'
        },
        {
          id: 'conn-demo-3',
          from: 'msg-demo-2', // Reversed: arrow points from msg-demo-2 to msg-demo-1
          to: 'msg-demo-1',
          type: 'flow',
          color: '#10b981'
        }
      ],
      selectedTool: 'select',
      selectedElement: null,
      editingCharacter: null,
      previewState: 'preview',
      isGenerating: false,
      customizeSettings: {
        backgroundColor: 'hsl(var(--muted))',
        primaryColor: 'hsl(var(--primary))',
        secondaryColor: 'hsl(var(--secondary))',
        textColor: 'hsl(var(--foreground))'
      },

      // Setters
      setCharacters: (characters) => set({ characters }),
      setMessages: (messages) => set({ messages }),
      setConnections: (connections) => set({ connections }),
      setSelectedTool: (selectedTool) => set({ selectedTool }),
      setSelectedElement: (selectedElement) => set({ selectedElement }),
      setEditingCharacter: (editingCharacter) => set({ editingCharacter }),
      setPreviewState: (previewState) => set({ previewState }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setCustomizeSettings: (settings) => set((state) => ({
        customizeSettings: { ...state.customizeSettings, ...settings }
      })),

      // Entity actions
      addCharacter: (character) => {
        const id = `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newCharacter = { ...character, id };
        set((state) => ({ characters: [...state.characters, newCharacter] }));
        return id;
      },

      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map(char =>
            char.id === id ? { ...char, ...updates } : char
          )
        }));
      },

      updateCharacterPosition: (id, position) => {
        set((state) => ({
          characters: state.characters.map(char =>
            char.id === id ? { ...char, position } : char
          )
        }));
      },

      updateCharacterRotation: (id, rotation) => {
        set((state) => ({
          characters: state.characters.map(char =>
            char.id === id ? { ...char, rotation } : char
          )
        }));
      },

      deleteCharacter: (id) => {
        set((state) => ({
          characters: state.characters.filter(char => char.id !== id),
          messages: state.messages.filter(msg => msg.characterId !== id),
          connections: state.connections.filter(conn => conn.from !== id && conn.to !== id)
        }));
      },

      addMessage: (message) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newMessage = { ...message, id };
        set((state) => ({ messages: [...state.messages, newMessage] }));
        return id;
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
      },

      updateMessagePosition: (id, position) => {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, position } : msg
          )
        }));
      },

      updateMessageRotation: (id, rotation) => {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, rotation } : msg
          )
        }));
      },

      updateMessageText: (id, text) => {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, text } : msg
          )
        }));
      },

      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== id),
          connections: state.connections.filter(conn => conn.from !== id && conn.to !== id)
        }));
      },

      addConnection: (connection) => {
        const id = `conn-${Date.now()}`;
        const newConnection = { ...connection, id };
        set((state) => ({ connections: [...state.connections, newConnection] }));
        return id;
      },

      deleteConnection: (id) => {
        const { connections, messages } = get();
        const connection = connections.find(c => c.id === id);

        if (connection) {
          // If this is an assignment connection, remove the character assignment from the message
          if (connection.type === 'assignment') {
            const message = messages.find(m => m.id === connection.to);
            if (message) {
              get().updateMessage(message.id, { characterId: '' });
            }
          }
        }

        set((state) => ({
          connections: state.connections.filter(conn => conn.id !== id)
        }));
      },

      // Utility actions
      addCharacterAtPosition: (position) => {
        const { characters } = get();
        const adjustedPosition = {
          x: Math.max(50, position.x + (Math.random() - 0.5) * 40),
          y: Math.max(50, position.y + (Math.random() - 0.5) * 40)
        };

        const colors = ['hsl(var(--primary))', '#5865f2', '#57f287', '#fee75c', '#f23c50', '#eb459e', '#00d9ff'];
        const newCharacter = {
          username: `User ${characters.length + 1}`,
          avatar: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 6)}.png`,
          roleColor: colors[Math.floor(Math.random() * colors.length)],
          position: adjustedPosition
        };

        const id = get().addCharacter(newCharacter);
        get().setSelectedElement(id);
        return id;
      },

      addMessageAtPosition: (position) => {
        const { messages } = get();
        const adjustedPosition = {
          x: Math.max(50, position.x + (Math.random() - 0.5) * 40),
          y: Math.max(50, position.y + (Math.random() - 0.5) * 40)
        };

        const newMessage = {
          characterId: '',
          text: `Hello, this is message ${messages.length + 1}!`,
          position: adjustedPosition,
          timestamp: new Date().toISOString()
        };

        const id = get().addMessage(newMessage);
        get().setSelectedElement(id);
        return id;
      },

      addMessageForCharacter: (characterId) => {
        const { characters, messages } = get();
        const character = characters.find(c => c.id === characterId);
        if (!character) return '';

        const characterMessages = messages.filter(m => m.characterId === characterId);
        const baseX = character.position.x + 300;
        const baseY = character.position.y + (characterMessages.length * 140);

        const newMessage = {
          characterId,
          text: 'New message...',
          position: { x: baseX, y: baseY },
          timestamp: new Date().toISOString()
        };

        const id = get().addMessage(newMessage);
        get().setSelectedElement(id);
        return id;
      },

      createConnection: (from, to, sourceHandle, targetHandle) => {
        const { connections, characters, messages } = get();

        // Prevent duplicate connections
        const exists = connections.some(c =>
          (c.from === from && c.to === to) || (c.from === to && c.to === from)
        );

        if (exists || from === to) return;

        const fromElement = characters.find(c => c.id === from) || messages.find(m => m.id === from);
        const toElement = characters.find(c => c.id === to) || messages.find(m => m.id === to);

        if (!fromElement || !toElement) return;

        let type: 'flow' | 'assignment' = 'flow';
        let color = 'hsl(var(--muted-foreground))';
        let finalFrom = from;
        let finalTo = to;

        // Character to Message = Assignment connection (speaker assignment)
        if ('username' in fromElement && 'text' in toElement) {
          type = 'assignment';
          color = fromElement.roleColor;
          get().updateMessage(to, { characterId: from });
        } 
        // Message to Character = Assignment connection (speaker assignment) - reverse direction for proper arrow pointing
        else if ('text' in fromElement && 'username' in toElement) {
          type = 'assignment';
          color = toElement.roleColor;
          get().updateMessage(from, { characterId: to });
          // Reverse direction: arrow points from character to message for visual consistency
          finalFrom = to;
          finalTo = from;
        }
        // Message to Message = Flow connection (conversation flow) - reverse direction for proper arrow pointing
        else if ('text' in fromElement && 'text' in toElement) {
          type = 'flow';
          const flowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
          color = flowColors[Math.floor(Math.random() * flowColors.length)];
          // Reverse direction: arrow points from dragged-to to dragged-from for conversation flow
          finalFrom = to;
          finalTo = from;
        }
        // Character to Character = Flow connection (character interaction) - reverse direction for proper arrow pointing
        else if ('username' in fromElement && 'username' in toElement) {
          type = 'flow';
          color = '#10b981';
          // Reverse direction: arrow points from dragged-to to dragged-from for interaction flow
          finalFrom = to;
          finalTo = from;
        }

        get().addConnection({ 
          from: finalFrom, 
          to: finalTo, 
          type, 
          color,
          sourceHandle,
          targetHandle
        });
      },

      deleteElement: (id, type) => {
        if (type === 'character') {
          get().deleteCharacter(id);
        } else {
          get().deleteMessage(id);
        }
      },

      // Template and customization actions
      handleGenerateVideo: () => {
        get().setIsGenerating(true);
        get().setPreviewState('loading');

        setTimeout(() => {
          get().setPreviewState('video');
          get().setIsGenerating(false);
        }, 3000);
      },

      handleTemplateSelect: (template) => {
        const { customizeSettings } = get();

        if (template.appTheme) {
          get().setCustomizeSettings({
            backgroundColor: template.appTheme.backgroundColor || customizeSettings.backgroundColor,
            primaryColor: template.appTheme.primaryColor || customizeSettings.primaryColor,
            secondaryColor: template.appTheme.secondaryColor || customizeSettings.secondaryColor,
            textColor: template.appTheme.textColor || customizeSettings.textColor
          });
        }

        // Clear existing data and load template
        get().setCharacters([]);
        get().setMessages([]);
        get().setConnections([]);

        setTimeout(() => {
          get().setCharacters(template.characters || []);
          get().setMessages(template.messages || []);
          get().setConnections(template.connections || []);
        }, 100);
      },

      handleApplyCustomization: (settings) => {
        get().setCustomizeSettings(settings);
      }
    }),
    { name: 'convly-store' }
  )
);

// Selectors for optimized re-renders
export const useCharacters = () => useAppStore((state) => state.characters);
export const useMessages = () => useAppStore((state) => state.messages);
export const useConnections = () => useAppStore((state) => state.connections);
export const useSelectedTool = () => useAppStore((state) => state.selectedTool);
export const useSelectedElement = () => useAppStore((state) => state.selectedElement);
export const usePreviewState = () => useAppStore((state) => state.previewState);
export const useIsGenerating = () => useAppStore((state) => state.isGenerating);
export const useCustomizeSettings = () => useAppStore((state) => state.customizeSettings);

// Memoized selectors for complex computations
export const useCharacterById = (id: string) => 
  useAppStore((state) => state.characters.find(char => char.id === id));

export const useMessageById = (id: string) => 
  useAppStore((state) => state.messages.find(msg => msg.id === id));

export const useMessagesForCharacter = (characterId: string) =>
  useAppStore((state) => state.messages.filter(msg => msg.characterId === characterId));

export const useConnectionsForElement = (elementId: string) =>
  useAppStore((state) => state.connections.filter(conn => 
    conn.from === elementId || conn.to === elementId
  ));