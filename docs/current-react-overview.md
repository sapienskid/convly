# Convly React Application Overview

## Product Summary
- **Purpose:** Convly lets creators script and visualize Discord-style chat conversations, then generate downloadable video exports. It targets content creators who need polished chat animations for social clips.
- **Primary Workflow:** Users assemble a conversation on a node-based canvas, assign speakers, tune look & feel, and preview the result inside a phone mockup before exporting video.
- **Experience Pillars:** drag-and-drop authoring, rapid customization, live preview, and export automation.

## Top-Level Architecture
- **App Shell (`src/App.tsx`):** Splits UI into two panes. Left hosts the authoring canvas and toolbars. Right contains the preview phone and configuration sidebar. Global modals (character editing) render near the root.
- **State Management (`src/store.ts`):** A single Zustand store holds 
  - entities (`characters`, `messages`, `connections`)
  - UI selections (`selectedTool`, `selectedElement`, `editingCharacter`)
  - preview state flags (`previewState`, `isGenerating`)
  - customization tokens (`customizeSettings`).
  Actions encapsulate entity CRUD, spatial updates, connection logic, template loading, and video generation toggles. Hooks such as `useCharacters` or `useMessageById` provide selector access for components that need narrow slices.
- **Routing:** No multi-page routing today; Vite + React single page renders `App` directly.
- **Rendering Technology:** Canvas interactions rely on @xyflow/react (formerly React Flow), while all UI primitives come from shadcn/ui (Radix + Tailwind). Styling uses Tailwind CSS 4.0 with className utilities.

## Domain Model
- **Character** – Discord persona with avatar, role color, XY position, optional rotation.
- **Message** – Message bubble with link back to a character, body text, timestamp, XY position, optional rotation.
- **Connection** – Visual line between nodes describing either speaker assignment (`character → message`) or conversational flow (`message ↔ message` or `character ↔ character`), including color metadata and handle positions.
- **Customize Settings** – Map of tweakable design tokens (colors, fonts, layout metrics, export options, audio toggles, etc.).

Relationships:
- Each message can reference a character. Assignment connections automatically update `message.characterId` to maintain consistency.
- Flow connections enforce uniqueness to avoid duplicates and will reverse endpoints to ensure arrows display in the intended direction on the canvas.

## Interaction Flow
1. **Tool Selection:** Bottom toolbar changes `selectedTool` between select, pan, character, message, connect.
2. **Canvas Authoring:**
   - React Flow nodes represent characters (`CharacterFlowNode`) or chat bubbles (`MessageFlowNode`).
   - Dragging nodes updates store positions; context menus allow editing, adding messages, or deletion.
   - Holding Shift or using Connect tool initiates connection mode. Proximity logic (`getClosestEdge`) previews edges when two nodes come within 400px during drag.
3. **Assignment & Flow:** Creating a character → message connection marks the message as spoken by that character. Message ↔ message or character ↔ character draws flow arrows with dashed styling for `flow` connections.
4. **Preview & Customization:** The right panel’s sidebar exposes collapsible groups (Colors, Typography, Layout, Video Quality, Animation, Audio, Export, Templates). Updates dispatch `handleApplyCustomization`, which merges into `customizeSettings`.
5. **Phone Preview (`PhonePreview.tsx`):**
   - An iPhone chrome houses the preview.
   - `analyzeMessageFlow` orders messages based on graph analysis of connections.
   - Preview can show idle chat, loading overlay (with spinner + progress), or simulated video playback overlay depending on `previewState`.
6. **Templates & Export:**
   - Template modal loads preset conversation JSON into store.
   - Generate Video button toggles `previewState` to loading for 3 seconds before showing `video` mode.
   - Save Project button persists the entire project to `localStorage` for later retrieval (manual load currently not implemented).

## Component Breakdown
- **CanvasWorkspace:** Wraps React Flow provider, sets node/edge types, manages drag/selection, handles proximity connection detection, and surfaces context menus via Radix `ContextMenu` components.
- **CharacterFlowNode & MessageFlowNode:** Custom React Flow node renderers showing avatars, message cards, inline editing (message text), rotation handles, and quick-actions.
- **FloatingEdge / CustomConnectionLine:** Provide bespoke edge rendering for cleaner curved connectors and custom arrow markers.
- **BottomToolbar:** Tool palette plus counts of characters/messages/connections.
- **RightPanel:** Composed of `PhonePreview`, template modal trigger, export controls, and `Sidebar` layout using shadcn/ui and Radix collapsibles.
- **Modals (CharacterEditModal, TemplateModal, ExportModal, CustomizeModal, VideoPlayerModal):** Manage specialized workflows such as editing character metadata, selecting templates, customizing theme, or previewing exports.

## Styling & Theming
- Tailwind CSS 4.0 with CSS-first `@tailwind` import configured in `src/index.css`.
- shadcn/ui components provide consistent look. Additional custom class utilities via `tailwind-merge` and `clsx` manage dynamic class assignment.
- `customizeSettings` values feed into inline styles (e.g., color pickers) and className variations for live preview.

## Utilities & Hooks
- **`usePerformantNodes` Hook:** Generates React Flow nodes array with memoization to reduce re-renders when interacting on canvas.
- **`usePerformance` / `useMobile` hooks:** Manage viewport/perf adjustments (e.g., detect small screens to adjust layout).
- **`utils/messageFlow.ts`:** Graph traversal to compute message ordering for preview.
- **`utils/edgeUtils.ts`:** Helper functions for controlling edge handles and connection logic.

## External Dependencies
- **@xyflow/react:** Graph/canvas engine powering drag-and-drop, edges, handles.
- **Zustand:** Lightweight state container with devtools integration.
- **shadcn/ui stack:** Large set of Radix-based primitives (dialogs, sidebar, accordion, etc.) for consistent UI.
- **Lucide-react:** Iconography for toolbars and controls.
- **Framer Motion, Embla Carousel, Recharts:** Present but largely unused in current screens (likely intended for future features).
- **React Hook Form + Zod:** Utilized in modal forms for validation.

## Build & Tooling
- **Toolchain:** Vite + SWC + TypeScript.
- **Scripts:** `npm run dev` (Vite dev server), `npm run build` (TypeScript type-check + Vite build), `npm run preview` (serve build), `npm run lint` (type-only linting via `tsc --noEmit`).
- **Assets:** Static assets live under `public/`. Most imagery fetched from remote URLs at runtime.

## Data Persistence & Integrations
- No backend integration. Everything is ephemeral in browser memory except manual save-to-localStorage trigger in `RightPanel`.
- Export pipeline is purely simulated (generate button triggers `setTimeout` to fake rendering).

## Known Limitations / Observations
- Template loader wipes and repopulates state with a timed reset; lacks error handling or async fallback.
- Save Project persists data but there is no load/resume hook in UI.
- Video generation is mocked; actual rendering service integration is absent.
- Some dependencies (Framer Motion, Embla, Recharts) appear unused, suggesting potential tree-shaking but extra install weight.
- Accessibility relies on shadcn defaults; custom nodes and context menus may need additional aria attributes during migration.

## Assets for Migration
- All conversation logic is centralized in `src/store.ts`, making it the primary reference for reimplementing business rules in a new stack.
- React Flow node definitions (`CharacterFlowNode.tsx`, `MessageFlowNode.tsx`) encapsulate most of the interaction logic that must be ported to SvelteFlow or equivalent.
- Customization controls map 1:1 with `customizeSettings`; these keys should be preserved to maintain feature parity during the rewrite.

This document should serve as the canonical reference while transitioning from the current React/Vite codebase to a SvelteKit implementation.
