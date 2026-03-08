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
- Custom node/edge flow workspace UI
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

## Release Readiness

Run the full release verification pipeline:

```bash
pnpm run release:verify
```

This runs:

- Type and Svelte checks
- Unit tests
- Frontend production build
- Rust `cargo check` for the Tauri backend

## CI/CD Automation

GitHub Actions is configured for:

- CI on every push and pull request: [`.github/workflows/ci.yml`](/.github/workflows/ci.yml)
- Auto release on push to `main`/`master`: [`.github/workflows/release.yml`](/.github/workflows/release.yml)

Release workflow behavior:

- Runs the full `release:verify` gate
- Ensures versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` match
- Creates annotated tag `v<version>` if it does not exist
- Builds Linux AppImage bundles via Tauri
- Publishes a GitHub Release using generated notes from `scripts/release/generate-release-notes.sh`
- Uploads AppImage artifacts to the release automatically

To trigger a new release, bump the app version in all three files and push to `main` (or `master`).

## Arch Linux Install

Install Convly Studio system-wide on Arch Linux:

```bash
pnpm run arch:install
```

Useful options:

```bash
./scripts/arch/install-arch.sh --prefix /usr/local
./scripts/arch/install-arch.sh --skip-deps
./scripts/arch/install-arch.sh --skip-verify
```

Uninstall:

```bash
pnpm run arch:uninstall
```
