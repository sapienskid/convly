# Convly Svelte Implementation Plan

## Overview
Reimplementing the React Discord chat animation builder in SvelteKit with shadcn-svelte, Tailwind CSS v4, and SvelteFlow.

## Phase 1: State Management & Store (Priority: High)
- [ ] Create Svelte stores for app state (replacing Zustand)
  - [ ] `characters` store - writable store with Character[]
  - [ ] `messages` store - writable store with Message[]
  - [ ] `connections` store - writable store with Connection[]
  - [ ] `ui` store - selectedTool, selectedElement, editingCharacter
  - [ ] `preview` store - previewState, isGenerating
  - [ ] `customize` store - backgroundColor, primaryColor, etc.
- [ ] Implement store actions as functions
  - [ ] addCharacter, updateCharacter, deleteCharacter
  - [ ] addMessage, updateMessage, deleteMessage
  - [ ] addConnection, deleteConnection
  - [ ] Utility functions: addCharacterAtPosition, addMessageAtPosition, etc.

## Phase 2: Core Components (Priority: High)
- [ ] Canvas Flow Nodes
  - [ ] `CharacterFlowNode.svelte` - Speaker node with avatar, role color, actions
    - Multiple connection handles (8 per node: top/right/bottom/left × source/target)
    - Quick actions: Edit, Add Message
    - Double-click to edit
    - Visual feedback for selection and connect mode
  - [ ] `MessageFlowNode.svelte` - Message bubble with inline editing
    - Character assignment indicator
    - Inline text editing (double-click)
    - Timestamp display
    - Multiple connection handles
    - Unassigned warning state
  - [ ] Custom edge rendering (FloatingEdge)
    - Different styles for assignment vs flow connections
    - Color coding based on connection type

## Phase 3: Main Layout Components (Priority: High)
- [ ] `CanvasWorkspace.svelte` - Left panel with SvelteFlow
  - SvelteFlow integration with custom node types
  - Drag & drop functionality
  - Context menu for quick actions
  - Proximity-based connection detection (400px threshold)
  - Zoom/pan controls
- [ ] `BottomToolbar.svelte` - Tool palette
  - Tool buttons: Select, Character, Message, Pan, Connect
  - Element counters with badges
  - Active tool highlighting
- [ ] `PhonePreview.svelte` - Middle panel
  - iPhone mockup with Discord UI
  - Message ordering based on flow analysis
  - Three states: preview, loading, video
  - Custom styling support from customize settings
- [ ] `RightPanel.svelte` - Customization sidebar
  - Collapsible sections using shadcn Accordion
  - Sections: Chat Room, Typography, Layout, Video Quality, Animation, Audio, Export, Templates
  - Save Project button

## Phase 4: Modals & Dialogs (Priority: Medium)
- [ ] `CharacterEditModal.svelte` - Edit character details
  - Username input
  - Avatar URL input
  - Role color picker
  - Avatar preview
- [ ] `TemplateModal.svelte` - Browse and select templates
  - Template grid/list
  - Preview thumbnails
  - Load template action
- [ ] `ExportModal.svelte` - Export settings & generation
  - Export format options
  - Quality settings
  - Generate video button
- [ ] `CustomizeModal.svelte` - Detailed customization
  - Color pickers
  - Typography options
  - Layout controls

## Phase 5: Utilities & Helpers (Priority: Medium)
- [ ] `lib/stores/` - Svelte store implementations
- [ ] `lib/utils/messageFlow.ts` - Message ordering logic
  - Graph traversal for conversation flow
  - Topological sort for message ordering
- [ ] `lib/utils/edgeUtils.ts` - Connection handle logic
  - getClosestEdge function for proximity detection
  - Connection validation
- [ ] `lib/utils/canvas.ts` - Canvas interaction helpers
  - Position calculations
  - Drag handlers
  - Selection logic

## Phase 6: Advanced Features (Priority: Low)
- [ ] Node rotation handles
- [ ] Connection animation preview
- [ ] Template system with presets
- [ ] LocalStorage persistence
  - Save/Load project state
  - Auto-save functionality
- [ ] Keyboard shortcuts
  - Delete (Del/Backspace)
  - Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
  - Copy/Paste (Ctrl+C / Ctrl+V)
- [ ] Export functionality simulation
  - Progress tracking
  - Video preview mode

## Technical Decisions

### State Management
- **Svelte Stores** instead of Zustand
  - Use writable stores for reactive state
  - Derived stores for computed values (e.g., getCharacterById, getMessagesForCharacter)
  - Store composition for complex state management

### Styling
- **shadcn-svelte** for all UI components (NO manual styling)
- **Tailwind CSS v4** via @tailwindcss/vite
- Use CSS variables from shadcn theme system
- All colors via HSL variables (--primary, --secondary, etc.)

### Canvas Library
- **@xyflow/svelte** (SvelteFlow) for node-based canvas
- Custom node components
- Custom edge components for styled connections
- Built-in minimap and controls

### Component Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CharacterFlowNode.svelte
│   │   │   ├── MessageFlowNode.svelte
│   │   │   ├── FloatingEdge.svelte
│   │   │   └── CustomConnectionLine.svelte
│   │   ├── workspace/
│   │   │   ├── CanvasWorkspace.svelte
│   │   │   ├── BottomToolbar.svelte
│   │   │   ├── PhonePreview.svelte
│   │   │   └── RightPanel.svelte
│   │   ├── modals/
│   │   │   ├── CharacterEditModal.svelte
│   │   │   ├── TemplateModal.svelte
│   │   │   ├── ExportModal.svelte
│   │   │   └── CustomizeModal.svelte
│   │   └── ui/ (shadcn components)
│   ├── stores/
│   │   ├── characters.ts
│   │   ├── messages.ts
│   │   ├── connections.ts
│   │   ├── ui.ts
│   │   ├── preview.ts
│   │   └── customize.ts
│   └── utils/
│       ├── messageFlow.ts
│       ├── edgeUtils.ts
│       └── canvas.ts
└── routes/
    └── +page.svelte (main app)
```

## Key Features from React Implementation

### Connection Logic
1. **Character → Message**: Assignment connection
   - Sets message.characterId
   - Uses character's role color
   - Arrow points from character to message

2. **Message → Message**: Flow connection
   - Represents conversation order
   - Random color from palette
   - Arrow direction reversed for visual flow

3. **Character → Character**: Interaction flow
   - Green color (#10b981)
   - Arrow direction reversed

### Node Interaction
- **Single Click**: Select node
- **Double Click**: Edit mode (message text or character details)
- **Drag**: Move node position
- **Context Menu** (Right Click): Quick actions menu
- **Connect Mode**: Drag from handle to create connections

### Preview System
- Uses `messageFlow.ts` to analyze connection graph
- Topological sort for proper message ordering
- Handles circular references and unconnected messages
- Real-time updates as canvas changes

## Implementation Priority
1. ✅ Basic SvelteKit setup with shadcn-svelte
2. 🔄 Store implementation (characters, messages, connections)
3. 🔄 CharacterFlowNode and MessageFlowNode components
4. 🔄 CanvasWorkspace with SvelteFlow integration
5. 🔄 PhonePreview with message ordering
6. 🔄 BottomToolbar and RightPanel
7. ⏳ Modals and advanced features
8. ⏳ Polish and optimizations

## Notes
- All components must use shadcn-svelte theme variables
- No hardcoded colors or manual CSS (except for dynamic inline styles from store)
- Keep performance in mind - use Svelte's reactivity wisely
- Test connection logic thoroughly (most complex part)
- Ensure keyboard accessibility for all interactions
