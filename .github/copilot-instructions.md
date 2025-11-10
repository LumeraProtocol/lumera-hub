# Lumera Hub — Copilot Instructions

This guide helps AI coding agents work productively in the Lumera Hub monorepo. It covers architecture, workflows, conventions, and integration points specific to this project.

## Architecture Overview
- **Monorepo Structure:**
  - `apps/`: Contains platform-specific apps (`web`, `desktop`, `mobile`).
  - `packages/`: Shared code (`core`, `ui`) used across apps.
  - `types/`: Type definitions for shared libraries.
- **Web App:**
  - Built with Next.js (`apps/web`).
  - Key directories: `src/app/` (routing, pages), `src/components/` (UI), `src/hooks/` (custom hooks), `src/utils/` (helpers).
- **Desktop App:**
  - Uses Tauri (`apps/desktop/src-tauri`) for Rust-powered desktop builds.
- **Mobile App:**
  - React Native/Expo (`apps/mobile`).

## Developer Workflows
- **Install dependencies:** Use `pnpm install` at the repo root.
- **Build:**
  - Web: `pnpm --filter web build`
  - Desktop: Tauri build via `pnpm --filter desktop tauri build`
  - Mobile: Expo build via `pnpm --filter mobile build`
- **Dev servers:**
  - Web: `pnpm --filter web dev` (Next.js)
  - Desktop: `pnpm --filter desktop tauri dev`
  - Mobile: `pnpm --filter mobile start`
- **Lint/Format:**
  - Lint: `pnpm lint`
  - Format: `pnpm format`
- **Testing:**
  - (Add details here if/when tests are present)

## Project-Specific Conventions
- **UI Components:** Shared in `packages/ui/src/screens/` and `apps/web/src/components/`.
- **Providers:** App-wide context providers in `apps/web/src/app/providers/`.
- **Network/Constants:** Use `apps/web/src/contants/network.ts` for network config.
- **Styling:** Tamagui for cross-platform UI; config in `tamagui.config.ts`.
- **TypeScript:** All code uses strict TypeScript; shared types in `types/`.
- **Monorepo Tools:** Uses Turbo (`turbo.json`) for task orchestration.

## Integration Points & Patterns
- **Cross-app sharing:** Import from `packages/core` and `packages/ui` for shared logic and UI.
- **Rust Integration:** Desktop app logic in Rust (`apps/desktop/src-tauri/src/`).
- **Assets:** Place images/icons in each app's `assets/` or `icons/` folder.
- **Config files:**
  - `tamagui.config.ts`: UI theme/config
  - `turbo.json`: Monorepo task orchestration
  - `eslint.config.js`, `prettier.config.cjs`: Linting/formatting

## Examples
- To add a new UI screen for all platforms, update `packages/ui/src/screens/` and import in each app.
- For a new provider, add to `apps/web/src/app/providers/` and update `client-root.tsx`.
- To add a new shared type, update `types/tamagui.d.ts` and import as needed.

---

If any section is unclear or missing, please ask for clarification or provide feedback to improve these instructions.
