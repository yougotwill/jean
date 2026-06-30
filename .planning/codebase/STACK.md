# Technology Stack

**Analysis Date:** 2026-06-28

## Languages

**Primary:**
- **TypeScript** - Frontend application code, React components, hooks, services, and type definitions (`src/**/*.ts`, `src/**/*.tsx`)
- **Rust** - Tauri v2 backend, command handlers, CLI integrations, file I/O, and platform abstractions (`src-tauri/src/**/*.rs`)
- **CSS** - Styling via Tailwind CSS v4 utility classes plus component-specific CSS in `src/App.css`

**Secondary:**
- **JavaScript / Node.js scripts** - Build/dev helpers in `scripts/*.mjs` and `scripts/*.js`
- **JSON / TOML / YAML** - Configuration manifests (`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `components.json`, `mise.toml`)
- **Markdown** - Documentation in `docs/` and `README.md`

## Runtime

**Frontend Runtime:**
- **Tauri v2** desktop webview runtime - renders the React frontend inside a native window
- **Vite 7** development server and production bundler (`vite.config.ts`)
- Dev server fixed on port `1420` with HMR on port `1421` when `TAURI_DEV_HOST` is set

**Backend Runtime:**
- **Rust** with **Tokio** async runtime (`src-tauri/Cargo.toml`)
- Multi-threaded runtime enabled via `rt-multi-thread`

**Package Manager:**
- **Bun** - Primary package manager (`bun.lock` present, `mise.toml` pins `bun = "latest"`)
- Lockfile: `bun.lock`

## Frameworks

**Core Frontend:**
- **React 19.2.0** - UI framework
- **React DOM 19.2.0** - Rendering
- **Tauri v2.10.x** - Native desktop bridge (`@tauri-apps/api`, `@tauri-apps/cli`)

**Build / Styling:**
- **Vite 7.2.0** - Module bundler and dev server (`vite.config.ts`)
- **Tailwind CSS v4.1.11** - Utility-first CSS (`@tailwindcss/vite` plugin)
- **shadcn/ui v4** - Component library configured in `components.json` with New York style, neutral base color

**State Management:**
- **Zustand v5.0.6** - Global UI state (`src/store/*.ts`)
- **TanStack Query (React Query) v5.83.0** - Persistent/server state, backend command caching (`src/lib/query-client.ts`)

**Testing:**
- **Vitest v4.0.7** - Unit and integration test runner (`vitest.config.ts`)
- **Playwright v1.58.2** - E2E browser tests (`e2e/playwright.config.ts`, root `playwright.config.ts`)
- **jsdom v27.1.0** - DOM environment for Vitest
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- **Rust `cargo test`** - Backend unit/integration tests

**Lint / Format:**
- **ESLint 9** with `typescript-eslint` strict + stylistic configs (`eslint.config.js`)
- **Prettier 3.6.2** (`prettier.config.js`)
- **Rust `cargo fmt` / `cargo clippy`**

## Key Dependencies

**Critical Frontend:**
- `@tauri-apps/api` ^2.10.1 - Tauri IPC bridge (`invoke`, `listen`, events)
- `@tauri-apps/plugin-clipboard-manager`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-log`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-process`, `@tauri-apps/plugin-updater` - Official Tauri plugins
- `@tanstack/react-query` ^5.83.0, `@tanstack/react-query-devtools` ^5.83.0 - Data fetching and caching
- `zustand` ^5.0.6 - Global state
- `react` ^19.2.0, `react-dom` ^19.2.0
- `react-markdown` ^10.1.0, `rehype-raw` ^7.0.0, `remark-gfm` ^4.0.1 - Markdown rendering in chat
- `@codemirror/*` ^6.x - CodeMirror 6 editor components for inline file editing
- `@xterm/xterm` ^6.0.0, `@xterm/addon-fit`, `@xterm/addon-web-links` - Embedded terminal rendering
- `ghostty-web` ^0.4.0 - Experimental Ghostty-based terminal renderer
- `@radix-ui/react-*` ^1.x / ^2.x - Headless UI primitives
- `lucide-react` ^0.552.0 - Icon library
- `sonner` ^2.0.6 - Toast notifications
- `fuse.js` ^7.1.0 - Fuzzy search
- `shiki` ^3.21.0 - Syntax highlighting
- `@atlaskit/pragmatic-drag-and-drop` ^1.8.1 - Drag-and-drop interactions
- `diff` ^8.0.3, `@pierre/diffs` ^1.0.4 - Diff utilities
- `class-variance-authority`, `clsx`, `tailwind-merge` - Tailwind/class utilities

**Critical Backend (Rust):**
- `tauri` 2.x - Desktop application framework
- `tauri-build` 2.x - Build tooling
- `tokio` 1.x - Async runtime
- `axum` 0.8 with `ws` feature - HTTP server and WebSocket support
- `tower-http` 0.6 - CORS, static files, compression
- `reqwest` 0.12 with `json`, `blocking` - HTTP client (Linear API, OpenCode health checks, downloads)
- `serde`, `serde_json`, `serde_yaml` - Serialization
- `toml`, `toml_edit` - TOML parsing/editing
- `regex` 1.11.1 - Pattern matching
- `uuid` 1.0 - UUID generation
- `image` 0.25 - Image resize/compression on paste
- `portable-pty` 0.8 - PTY/terminal support
- `which` 7 - Cross-platform executable detection
- `zip`, `flate2`, `tar` - Archive extraction for CLI installs
- `base64` 0.22, `sha2` 0.10 - Encoding/checksums
- `chrono` 0.4 - Local machine time
- `arboard` 3 - Clipboard image fallback on Linux

## Configuration

**Environment:**
- No committed `.env` files detected
- Runtime env vars used for opt-in debugging and platform detection (examples in Rust):
  - `JEAN_DUMP_STREAM=1` - Dump Claude CLI stream to file (`src-tauri/src/chat/claude.rs`)
  - `JEAN_CODEX_STDIO=1` - Force Codex stdio mode (`src-tauri/src/chat/codex_server.rs`)
  - `JEAN_DEV_USAGE_POLL` - Dev usage polling override (`src-tauri/src/background_tasks/mod.rs`)
  - `JEAN_FORCE_X11=1` - Force X11 on Linux (`src-tauri/src/lib.rs`)
  - `JEAN_WEB_BUILD_ID` - Override web build ID in Vite (`vite.config.ts`)
  - `XAI_API_KEY` - Grok CLI/API key fallback (`src-tauri/src/chat/grok.rs`, `src-tauri/src/grok_cli/commands.rs`)
  - `SHELL` - Shell detection for git/terminal operations
  - Standard Linux env vars: `XDG_CONFIG_HOME`, `APPDATA`, `WAYLAND_DISPLAY`, `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`, `GDK_BACKEND`
  - MCP env vars: `JEAN_MCP_SOCKET`, `JEAN_MCP_TOKEN`, `JEAN_MCP_SESSION`, `JEAN_MCP_DEPTH`, `JEAN_MCP_MODE`

**Build:**
- `vite.config.ts` - Vite plugins: React, Tailwind CSS, custom `jeanWebBuildInfoPlugin`
- `tsconfig.json` - TypeScript strict mode, path alias `@/*` → `./src/*`
- `tsconfig.node.json` - Node/Vite-specific TS config
- `src-tauri/tauri.conf.json` - Production Tauri config
- `src-tauri/tauri.conf.dev.json` - Dev override config
- `components.json` - shadcn/ui configuration
- `mise.toml` - mise tool versions (`bun`, `node`, `rust` all `latest`)

**Quality Gates:**
- `bun run check:all` runs TypeScript check, ESLint, Rust fmt check, Rust clippy, Vitest, and cargo test
- `bun run fix:all` runs auto-fix for lint/format/clippy

## Platform Requirements

**Development:**
- Node.js (managed via mise as `latest`)
- Bun (managed via mise as `latest`)
- Rust toolchain (managed via mise as `latest`)
- macOS, Windows, or Linux
- Windows-specific: Visual Studio "Desktop development with C++" workload

**Production:**
- **Deployment target:** Native desktop application bundles
  - macOS: `.app`, `.dmg` (universal-apple-darwin target supported)
  - Windows: `.msi`, `.nsis`
  - Linux: `.deb`, `.rpm`, `.AppImage`
- **Distribution:** GitHub Releases via Tauri updater (`https://github.com/coollabsio/jean/releases/latest/download/latest.json`)
- **Code signing:** macOS Developer ID Application signing configured in `src-tauri/tauri.conf.json`

**Web Access (Headless):**
- Jean can run headless and expose the web UI over HTTP/WebSocket
- Default port `3456`, configurable via preferences (`http_server_port`)
- Token-based authentication required by default (`http_server_token_required`)

---

*Stack analysis: 2026-06-28*
