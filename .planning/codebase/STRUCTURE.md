# Codebase Structure

**Analysis Date:** 2026-06-28

## Directory Layout

```
[project-root]/
├── .planning/                # GSD planning artifacts (this map, phases, STATE.md)
├── docs/
│   └── developer/            # Architecture, state, commands, testing, releases, etc.
├── e2e/                      # Playwright end-to-end tests and config
├── public/                   # Static assets served by Vite
├── scripts/                  # Build/release/task automation (Node/bun)
├── src/                      # React frontend (~656 .ts/.tsx files)
│   ├── assets/               # Static images, SVGs
│   ├── components/           # React components by feature
│   ├── fonts/                # Self-hosted font files
│   ├── hooks/                # Global React hooks
│   ├── lib/                  # Utilities, command system, transport, theme
│   ├── services/             # TanStack Query hooks and invoke wrappers
│   ├── store/                # Zustand stores
│   ├── test/                 # Test helpers and setup
│   └── types/                # Shared TypeScript types
├── src-tauri/                # Tauri v2 + Rust backend (~101 .rs files)
│   ├── src/
│   │   ├── auto_fix/         # Automated issue fixing scheduler
│   │   ├── background_tasks/ # Git/PR polling manager
│   │   ├── browser/          # Embedded browser/webview tabs
│   │   ├── chat/             # Sessions, messaging, AI backend orchestration
│   │   ├── *_cli/            # CLI binary management (claude, codex, opencode, cursor, pi, grok, commandcode, coderabbit, gh)
│   │   ├── cli_update/       # Generic path-installed CLI updater
│   │   ├── http_server/      # Axum HTTP + WebSocket headless server
│   │   ├── opinionated/      # Opinionated plugin installer
│   │   ├── opencode_server/  # Managed OpenCode server lifecycle
│   │   ├── platform/         # OS process/shell/WSL abstractions
│   │   ├── projects/         # Project/worktree/git/GitHub/Linear logic
│   │   ├── terminal/         # PTY terminal emulator
│   │   ├── jean_mcp_*.rs     # Jean MCP server (stdio/socket/core/config)
│   │   ├── lib.rs            # App setup, structs, command registration
│   │   └── main.rs           # Binary entry point
│   ├── Cargo.toml            # Rust dependencies and profiles
│   ├── tauri.conf.json       # Tauri production config
│   └── tauri.conf.dev.json   # Tauri dev config
├── index.html                # SPA shell
├── package.json              # Frontend dependencies and scripts
├── vite.config.ts            # Vite + build-info plugin
├── tsconfig.json             # TypeScript project config
├── vitest.config.ts          # Unit test config
├── playwright.config.ts      # E2E test config
├── eslint.config.js          # ESLint config
├── prettier.config.js        # Prettier config
├── components.json           # shadcn/ui configuration
└── mise.toml                 # mise runtime versions
```

## Directory Purposes

**`src/components/`:**
- Purpose: React UI organized by feature/domain.
- Contains: ~20 feature folders plus `ui/` primitives.
- Key files:
  - `src/components/layout/MainWindow.tsx`
  - `src/components/layout/MainWindowContent.tsx`
  - `src/components/chat/ChatWindow.tsx`
  - `src/components/dashboard/ProjectCanvasView.tsx`
  - `src/components/command-palette/CommandPalette.tsx`
  - `src/components/ui/` — 45+ shadcn/ui primitives (Button, Dialog, Select, etc.)

**`src/hooks/`:**
- Purpose: Global, reusable React hooks.
- Contains: Persistence, keyboard, CLI checks, terminal, event listeners.
- Key files:
  - `src/hooks/useUIStatePersistence.ts`
  - `src/hooks/useSessionStatePersistence.ts`
  - `src/hooks/use-command-context.ts`
  - `src/hooks/useMainWindowEventListeners.ts`
  - `src/hooks/useCliVersionCheck.ts`

**`src/lib/`:**
- Purpose: Shared utilities and core plumbing.
- Contains: Command registry, transport abstraction, query client, theme, clipboard, notifications, terminal instance cache.
- Key files:
  - `src/lib/commands/registry.ts`
  - `src/lib/commands/index.ts`
  - `src/lib/transport.ts`
  - `src/lib/query-client.ts`
  - `src/lib/terminal-instances.ts`
  - `src/lib/logger.ts`

**`src/services/`:**
- Purpose: TanStack Query hooks and thin wrappers around backend commands.
- Contains: One file per domain (chat, projects, preferences, github, git-status, terminal, etc.).
- Key files:
  - `src/services/chat.ts`
  - `src/services/projects.ts`
  - `src/services/preferences.ts`
  - `src/services/ui-state.ts`

**`src/store/`:**
- Purpose: Zustand stores for global UI state.
- Contains: `chat-store.ts` (sessions/streaming), `projects-store.ts`, `ui-store.ts`, `terminal-store.ts`, `browser-store.ts`, and their tests.
- Key files:
  - `src/store/chat-store.ts`
  - `src/store/projects-store.ts`
  - `src/store/ui-store.ts`

**`src/types/`:**
- Purpose: Shared TypeScript type definitions.
- Contains: Domain types for chat, projects, preferences, ui-state, github, terminal, commands.
- Key files:
  - `src/types/chat.ts`
  - `src/types/projects.ts`
  - `src/types/preferences.ts`
  - `src/types/ui-state.ts`

**`src-tauri/src/chat/`:**
- Purpose: Session lifecycle, messaging, AI backend orchestration.
- Contains: Commands, backend modules (claude, codex, opencode, cursor, pi, grok, commandcode), registry, storage, run logs, tail, naming, types.
- Key files:
  - `src-tauri/src/chat/commands.rs`
  - `src-tauri/src/chat/registry.rs`
  - `src-tauri/src/chat/storage.rs`
  - `src-tauri/src/chat/types.rs`

**`src-tauri/src/projects/`:**
- Purpose: Project/worktree/git/GitHub/Linear/security operations.
- Contains: Commands, git helpers, GitHub/Linear APIs, PR status, saved contexts, release notes, storage, types.
- Key files:
  - `src-tauri/src/projects/commands.rs`
  - `src-tauri/src/projects/storage.rs`
  - `src-tauri/src/projects/git.rs`
  - `src-tauri/src/projects/types.rs`

**`src-tauri/src/terminal/`:**
- Purpose: Built-in PTY terminal emulator.
- Contains: Commands, PTY implementation, registry, types.
- Key files:
  - `src-tauri/src/terminal/commands.rs`
  - `src-tauri/src/terminal/registry.rs`
  - `src-tauri/src/terminal/pty.rs`

**`src-tauri/src/http_server/`:**
- Purpose: Headless/web access HTTP server and WebSocket dispatch.
- Contains: Server setup, WebSocket, request dispatch, auth.
- Key files:
  - `src-tauri/src/http_server/server.rs`
  - `src-tauri/src/http_server/websocket.rs`
  - `src-tauri/src/http_server/dispatch.rs`
  - `src-tauri/src/http_server/auth.rs`

**`src-tauri/src/platform/`:**
- Purpose: Cross-platform process launching and shell detection.
- Contains: `process.rs` (`silent_command`), `shell.rs`, `wsl.rs`, `cli_detect.rs`.
- Key files:
  - `src-tauri/src/platform/process.rs`
  - `src-tauri/src/platform/shell.rs`

**`docs/developer/`:**
- Purpose: Living architecture and pattern documentation.
- Contains: `architecture-guide.md`, `state-management.md`, `command-system.md`, `testing.md`, `performance-patterns.md`, etc.

## Key File Locations

**Entry Points:**
- `src-tauri/src/main.rs` — Rust binary entry point.
- `src-tauri/src/lib.rs` — Rust library entry point (`run()`) and command registration.
- `src/main.tsx` — React mount point.
- `src/App.tsx` — Root component; transport bootstrap and global lifecycle.
- `index.html` — SPA shell.

**Configuration:**
- `package.json` — Frontend dependencies and scripts.
- `src-tauri/Cargo.toml` — Rust dependencies and build profiles.
- `vite.config.ts` — Vite, React, Tailwind, path alias, build-info plugin.
- `tsconfig.json` — TypeScript compiler options; `@/*` maps to `./src/*`.
- `components.json` — shadcn/ui style and aliases.
- `src-tauri/tauri.conf.json` — Tauri production window/security config.

**Core Logic:**
- `src/lib/transport.ts` — `invoke()` / `listen()` abstraction.
- `src/lib/commands/registry.ts` — In-memory command registry.
- `src/lib/query-client.ts` — TanStack Query client.
- `src/store/chat-store.ts` — Session/streaming/execution-mode state.
- `src/services/chat.ts` — Chat queries/mutations.
- `src-tauri/src/chat/commands.rs` — Backend chat command handlers.
- `src-tauri/src/projects/commands.rs` — Backend project/worktree command handlers.

**Testing:**
- `vitest.config.ts` — Unit test runner config.
- `src/**/*.test.ts` / `src/**/*.test.tsx` — Co-located unit tests.
- `e2e/playwright.config.ts` — E2E test config.
- `e2e/` — Playwright specs and Vite E2E dev config.
- `src-tauri/src/` — Rust tests (`cargo test`).

## Naming Conventions

**Files:**
- React components: PascalCase, e.g., `ChatWindow.tsx`, `MainWindow.tsx`.
- Hooks: camelCase prefixed with `use-`, e.g., `useUIStatePersistence.ts`, `use-command-context.ts`.
- Services: camelCase domain name, e.g., `chat.ts`, `projects.ts`.
- Utilities/lib: camelCase, e.g., `transport.ts`, `query-client.ts`.
- Tests: co-located, suffix `.test.ts` or `.test.tsx`, e.g., `chat-store.test.ts`.

**Directories:**
- Feature folders: kebab-case, e.g., `command-palette/`, `drag-and-drop/`.
- Rust modules: snake_case directories matching module names, e.g., `background_tasks/`, `claude_cli/`.

**Path Aliases:**
- `@/*` maps to `./src/*` via `tsconfig.json` and Vite alias.
- shadcn/ui aliases in `components.json`:
  - `@/components/ui`
  - `@/components`
  - `@/lib/utils`
  - `@/hooks`

**Rust:**
- Modules and files: snake_case, e.g., `commands.rs`, `github_issues.rs`.
- Structs/Enums: PascalCase, e.g., `AppPreferences`, `UIState`.
- Functions/variables: snake_case, e.g., `send_chat_message`.
- Persisted serde structs use snake_case fields; command DTOs use `#[serde(rename_all = "camelCase")]`.

## Where to Add New Code

**New UI feature (e.g., a dialog or panel):**
- Component: `src/components/<feature>/MyFeature.tsx`
- If it should appear in the command palette: add a command in `src/lib/commands/<domain>-commands.ts` and register it in `src/lib/commands/index.ts`.
- State: use `useState` for local UI; use an existing Zustand store if cross-component; use TanStack Query if persisted.

**New backend command:**
- Rust handler: add to the appropriate `src-tauri/src/<module>/commands.rs`.
- Registration: add to `tauri::generate_handler![]` in `src-tauri/src/lib.rs`.
- Web access: add a matching arm in `src-tauri/src/http_server/dispatch.rs`.
- Frontend hook: add a query/mutation in `src/services/<module>.ts`.
- Types: add TypeScript types in `src/types/<module>.ts`; add Rust types in `src-tauri/src/<module>/types.rs`.

**New AI backend integration:**
- Add enum/type in `src-tauri/src/chat/types.rs` and `src/types/chat.ts` / `src/types/preferences.ts`.
- Add execution module `src-tauri/src/chat/<backend>.rs` and export from `src-tauri/src/chat/mod.rs`.
- Route in `src-tauri/src/chat/commands.rs::send_chat_message`.
- Add CLI module `src-tauri/src/<backend>_cli/` with install/status/auth commands.
- Add UI labels/icons in `src/components/ui/backend-label.tsx` and `src/components/icons/`.
- Update toolbar model picker in `src/components/chat/ChatToolbar.tsx`.
- See `AGENTS.md` → "Adding a New AI Backend" for the full checklist.

**New persisted setting:**
- Rust: add field to `AppPreferences` in `src-tauri/src/lib.rs` with a `#[serde(default = "...")]`.
- TypeScript: add matching field to `AppPreferences` in `src/types/preferences.ts`.
- UI: edit the appropriate settings pane in `src/components/preferences/panes/`.
- Load/save uses existing `load_preferences` / `save_preferences` commands.

**New UI state field:**
- Rust: add to `UIState` in `src-tauri/src/lib.rs` with `#[serde(default)]`.
- TypeScript: add to `UIState` in `src/types/ui-state.ts`.
- Sync: update `getCurrentUIState()` and the restore effect in `src/hooks/useUIStatePersistence.ts`.

**Utilities:**
- Shared helpers: `src/lib/<name>.ts`.
- Platform-specific: `src-tauri/src/platform/<name>.rs`.

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui primitive components (Button, Dialog, Select, etc.).
- Generated: Partially generated by shadcn CLI, but hand-modified over time.
- Committed: Yes.

**`src-tauri/src/platform/`:**
- Purpose: OS-specific process launching and shell detection.
- Contains: `silent_command()` helper to prevent Windows console flash, WSL utilities, default-shell detection.
- Committed: Yes.

**`src/lib/commands/`:**
- Purpose: Frontend command system (not to be confused with Tauri commands).
- Contains: Registry, command types, domain command files, README.
- Committed: Yes.

**`docs/developer/`:**
- Purpose: Living documentation for architecture patterns.
- Key files: `architecture-guide.md`, `state-management.md`, `command-system.md`, `performance-patterns.md`, `data-persistence.md`.
- Committed: Yes.

**`.planning/`:**
- Purpose: GSD planning artifacts.
- Contains: `codebase/`, phase directories, `STATE.md`, `PROJECT.md`.
- Generated: Yes (created by GSD tooling).
- Committed: Yes.

**`e2e/`:**
- Purpose: Playwright end-to-end tests with a dedicated Vite dev config.
- Contains: `playwright.config.ts`, `vite.config.e2e.ts`, specs.
- Committed: Yes.

**`scripts/`:**
- Purpose: Build, release, and task automation.
- Contains: `prepare-release.js`, `bump-version.js`, `complete-task.js`, `install-local-macos.mjs`, etc.
- Committed: Yes.

---

*Structure analysis: 2026-06-28*
