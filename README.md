# Convly Studio

Convly Studio is a visual conversation storyboard tool for building chat-style scenes and exporting polished vertical videos.

## What It Does

- Build conversation flow with characters, messages, and reply links.
- Preview animated playback in a phone-style viewer.
- Customize typography, colors, pacing, audio, and export settings.
- Export rendered videos (`mp4` or `webm`) for social channels.
- Import and apply conversation JSON quickly.

## Tech Stack

- `SvelteKit` + `Svelte 5`
- `Tailwind CSS v4`
- `@xyflow/svelte` for graph editing
- `Tauri v2` for desktop builds

## Development

Install dependencies:

```bash
pnpm install
```

Run web app:

```bash
pnpm dev
```

Run desktop app:

```bash
pnpm tauri:dev
```

## Build

Build web output:

```bash
pnpm build
```

Build desktop bundles:

```bash
pnpm tauri:build
```
