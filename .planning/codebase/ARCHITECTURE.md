<!-- refreshed: 2026-06-28 -->
# Architecture

**Analysis Date:** 2026-06-28

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Frontend                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │  Components  │  │   Zustand    │  │   TanStack Query / Services         │ │
│  │  src/components│  │   Stores     │  │   src/services/*                    │ │
│  │              │  │  src/store/* │  │                                     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬──────────────────────┘ │
│         │                 │                         │                         │
│         └─────────────────┴──────────────┬──────────┘                         │
│                                          │ invoke / listen                    │
│                              ┌───────────▼───────────┐                        │
│                              │   Transport Layer     │                        │
│                              │   src/lib/transport.ts│                        │
│                              └───────────┬───────────┘                        │
└──────────────────────────────────────────┼────────────────────────────────────┘
                                           │ Tauri IPC (native) or WebSocket (web)
┌──────────────────────────────────────────┼────────────────────────────────────┐
│                              Rust Backend│                                   │
│  ┌───────────────────────────────────────┴─────────────────────────────────┐  │
│  │                      Tauri command handler (src-tauri/src/lib.rs)        │  │
│  │  generate_handler![projects::*, chat::*, terminal::*, *_cli::*]          │  │
│  └──────┬────────────────────────────────┬──────────────────────┬───────────┘  │
│         │                                │                      │              │
│  ┌──────▼──────┐  ┌───────────▼─────────┐  ┌───────────▼────────┐              │
│  │  projects/  │  │       chat/         │  │     terminal/      │              │
│  │  git, worktree, GitHub, Linear     │  │  CLI backends, sessions, run logs │  │
│  └──────┬──────┘  └───────────┬─────────┘  └───────────┬────────┘              │
│         │                     │                        │                       │
│  ┌──────▼─────────────────────▼────────────────────────▼──────┐               │
│  │           Storage / External CLIs / PTY / HTTP server       │               │
│  │  Atomic JSON files  ·  gh/claude/codex/opencode/cursor/pi  ·  portable-pty  │
│  └─────────────────────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────────────────────┘
```

Jean is a Tauri v2 desktop application (React 19 + Vite + Tailwind v4 + shadcn/ui v4). The same frontend bundle can run in a browser against an embedded Axum HTTP/WebSocket server (`src-tauri/src/http_server/`), allowing headless/web access. All heavy lifting—file system, git, AI CLI orchestration, terminal PTY—is implemented in Rust and exposed through Tauri commands.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Bootstraps transport, hydrates caches from initial data, wires global listeners, decides onboarding, resumes detached sessions | `src/App.tsx` |
| `MainWindow` | Top-level shell: title bar, lazy-loaded sidebars, modals, command palette, quit confirmation | `src/components/layout/MainWindow.tsx` |
| `MainWindowContent` | Routes between `ChatWindow`, `ProjectCanvasView`, and welcome screen based on selection | `src/components/layout/MainWindowContent.tsx` |
| `ChatWindow` | Chat surface: message list, input, toolbar, terminal panel, review results | `src/components/chat/ChatWindow.tsx` |
| Transport layer | Drop-in `invoke()`/`listen()` that switches between Tauri IPC and WebSocket | `src/lib/transport.ts` |
| Command system | In-memory registry of UI commands used by palette, menus, and shortcuts | `src/lib/commands/registry.ts`, `src/lib/commands/index.ts` |
| `useCommandContext` | Provides actions (open PR, commit, rebase, etc.) to commands without prop drilling | `src/hooks/use-command-context.ts` |
| `useChatStore` | Session/streaming/execution-mode UI state; monolithic Zustand store | `src/store/chat-store.ts` |
| `useProjectsStore` | Selected project/worktree, tree expansion, dashboard settings | `src/store/projects-store.ts` |
| `useUIStore` | Layout/modal state, terminal/browser runtime UI state | `src/store/ui-store.ts` |
| `useTerminalStore` | Terminal instance lifecycle and panel/modal state | `src/store/terminal-store.ts` |
| `useBrowserStore` | Browser tab runtime state | `src/store/browser-store.ts` |
| `useUIStatePersistence` | Serializes Zustand state to Rust-persisted `ui-state.json` | `src/hooks/useUIStatePersistence.ts` |
| `useSessionStatePersistence` | Persists session-specific state (answered questions, fixed findings, etc.) in session files | `src/hooks/useSessionStatePersistence.ts` |
| `query-client` | TanStack Query client config; cache is the source of truth for server state | `src/lib/query-client.ts` |
| `chat` service | Session/message queries, mutations, streaming helpers | `src/services/chat.ts` |
| `projects` service | Project/worktree queries and cache keys | `src/services/projects.ts` |
| `preferences` service | App preferences load/save | `src/services/preferences.ts` |
| Rust `lib.rs` | App setup, `AppPreferences`/`UIState` structs, command registration, headless/MCP/PI args | `src-tauri/src/lib.rs` |
| Rust `chat/commands.rs` | Session CRUD, send message, image/text paste, plan approval, queue | `src-tauri/src/chat/commands.rs` |
| Rust `chat/registry.rs` | In-memory active/running session registry | `src-tauri/src/chat/registry.rs` |
| Rust `chat/storage.rs` | Session JSONL/index persistence | `src-tauri/src/chat/storage.rs` |
| Rust `chat/claude.rs`, `codex.rs`, `opencode.rs`, `cursor.rs`, `pi.rs`, `grok.rs`, `commandcode.rs` | Backend-specific CLI process orchestration | `src-tauri/src/chat/*.rs` |
| Rust `projects/commands.rs` | Worktree/git/PR/commit/review/release operations | `src-tauri/src/projects/commands.rs` |
| Rust `projects/storage.rs` | Project/worktree JSON persistence | `src-tauri/src/projects/storage.rs` |
| Rust `terminal/registry.rs` | PTY registry and replay buffer | `src-tauri/src/terminal/registry.rs` |
| Rust `http_server/dispatch.rs` | WebSocket routing of commands (must mirror `lib.rs`) | `src-tauri/src/http_server/dispatch.rs` |

## Pattern Overview

**Overall:** Desktop AI workbench built as a Tauri v2 + React 19 SPA with an optional headless web mode.

**Key Characteristics:**
- **Onion state hierarchy**: local `useState` → Zustand global UI → TanStack Query persistent/server data.
- **Event-driven bridge**: React calls Rust via `invoke()`; Rust pushes events via `app.emit()` / WebSocket; React subscribes via `listen()`.
- **Command-centric UI**: All user actions route through `src/lib/commands/` so they can be triggered from the command palette, keyboard shortcuts, menus, or UI buttons.
- **Backend-first persistence**: All file writes, git operations, and AI CLI spawns happen in Rust; TypeScript is a thin cache/view layer.
- **Survivable sessions**: Detached CLIs and the Codex app-server outlive the app; Jean resumes them on relaunch.
- **Atomic writes**: Rust persists JSON using temp-file + rename (`std::fs::write` then `std::fs::rename`).

## Layers

**Presentation Layer:**
- Purpose: Render UI and capture input.
- Location: `src/components/`
- Contains: React components, shadcn/ui primitives, command palette, dialogs, dashboard.
- Depends on: Zustand stores, TanStack Query hooks, command context.
- Used by: End user.

**Global UI State Layer:**
- Purpose: Transient cross-component state (selection, modals, streaming buffers).
- Location: `src/store/`
- Contains: Zustand stores (`chat-store.ts`, `projects-store.ts`, `ui-store.ts`, `terminal-store.ts`, `browser-store.ts`).
- Depends on: Types in `src/types/`.
- Used by: Components, hooks, command context.

**Server Sync Layer:**
- Purpose: Cache and synchronize data owned by Rust or external APIs.
- Location: `src/services/`
- Contains: TanStack Query hooks wrapping `invoke()`.
- Depends on: `src/lib/transport.ts`, `src/lib/query-client.ts`.
- Used by: Components and state-persistence hooks.

**Transport Layer:**
- Purpose: Abstract Tauri IPC vs WebSocket so the same frontend runs natively and in a browser.
- Location: `src/lib/transport.ts`
- Contains: `invoke()`, `listen()`, `convertFileSrc()`, initial-data preload helpers.
- Depends on: `src/lib/environment.ts`.
- Used by: All services and global listeners.

**Backend Command Layer:**
- Purpose: Expose safe, validated operations to the frontend.
- Location: `src-tauri/src/lib.rs`, `src-tauri/src/*/commands.rs`
- Contains: 150+ Tauri commands plus the `generate_handler![]` registration.
- Depends on: Domain modules (`chat`, `projects`, `terminal`, CLI modules, `http_server`).
- Used by: Frontend via `invoke()` or WebSocket dispatch.

**Domain Logic Layer:**
- Purpose: Orchestrate AI backends, git, file system, terminals, HTTP server.
- Location: `src-tauri/src/chat/`, `src-tauri/src/projects/`, `src-tauri/src/terminal/`, `src-tauri/src/*_cli/`, `src-tauri/src/http_server/`
- Contains: Backend integrations, storage, registry, polling, PTY, auth checks.
- Depends on: Platform helpers (`src-tauri/src/platform/`).
- Used by: Tauri command handlers.

**Data Layer:**
- Purpose: Persist user data and runtime state to disk.
- Location: App data directory (`preferences.json`, `ui-state.json`, session JSONL under `sessions/`, project JSON).
- Contains: Atomic JSON files and JSONL run logs.
- Accessed through: Rust `storage.rs` modules and Tauri filesystem plugin.

## Data Flow

### Primary Chat Request Path

1. User submits message in `ChatInput` (`src/components/chat/ChatInput.tsx`).
2. The send-message mutation in `src/services/chat.ts` calls `invoke('send_chat_message', …)`.
3. `src-tauri/src/chat/commands.rs::send_chat_message` resolves the session, backend, model, and execution mode.
4. It routes to the backend executor: `claude.rs`, `codex.rs`, `opencode.rs`, `cursor.rs`, `pi.rs`, `grok.rs`, or `commandcode.rs`.
5. The executor spawns the external CLI (e.g., `claude --print`) or connects to a persistent server (Codex app-server, Grok ACP, PI RPC host).
6. Streaming JSON/JSONL is parsed into normalized events (`chat:chunk`, `chat:tool_use`, `chat:tool_result`, `chat:thinking`, `chat:done`, `chat:error`).
7. Rust emits events via `app.emit()` (native) or the WebSocket broadcaster (web).
8. `useStreamingEvents` (`src/components/chat/hooks/useStreamingEvents.ts`) listens and updates TanStack Query cache + `useChatStore` streaming buffers.
9. `VirtualizedMessageList` renders from the cached `Session` query data.
10. On completion, Rust appends the final turn to the session JSONL/index and emits `chat:done`; the frontend invalidates/upserts `chatQueryKeys.session(sessionId)`.

### Headless/Web Bootstrap Path

1. Browser loads the Vite bundle; `src/main.tsx` mounts `App` inside `QueryClientProvider`.
2. `App.tsx` detects non-native mode and calls `preloadInitialData()` over HTTP (`/api/init`).
3. The backend returns `InitialData` (projects, worktrees, sessions, preferences, UI state, replay events, running sessions).
4. `seedCache()` populates TanStack Query and Zustand stores from the bulk payload.
5. `connectTransport()` opens a WebSocket; buffered replay events are ingested before live events.
6. On disconnect, the frontend prefetches `/api/init` again and re-seeds; dead running sessions are cleared.

### State Persistence Path

1. `useUIStatePersistence` loads `UIState` via `useUIState()` and restores selection, sidebar, terminal/browser runtime state into stores.
2. Each store change triggers the subscription in `useUIStatePersistence`.
3. `getCurrentUIState()` maps store state back to snake_case `UIState`, converting Sets to arrays.
4. A 500ms debounced `saveUIState` mutation calls `invoke('save_ui_state')`.
5. Rust in `src-tauri/src/lib.rs` writes `ui-state.json` atomically.
6. Session-specific state is saved separately via `update_session_state` and stored inside session files.

## Key Abstractions

**`Session`:**
- Purpose: A single chat thread inside a worktree.
- Examples: TypeScript type in `src/types/chat.ts`; Rust struct in `src-tauri/src/chat/types.rs`.
- Pattern: Each session is a JSONL file plus an index entry; messages and state are appended, not overwritten.

**`Worktree` / `Project`:**
- Purpose: Git project and branch-isolated working directory.
- Examples: `src/types/projects.ts`; Rust structs in `src-tauri/src/projects/types.rs`.
- Pattern: Projects stored in `projects.json`; worktrees stored in `worktrees.json` per project; cached git/GitHub status fields are refreshed by background polling.

**`AppPreferences` / `UIState`:**
- Purpose: Persistent user settings and ephemeral UI layout.
- Examples: `src/types/preferences.ts`, `src/types/ui-state.ts`; Rust structs in `src-tauri/src/lib.rs`.
- Pattern: Rust is the source of truth; TypeScript mirrors field names (snake_case for persisted data).

**`ContentBlock` / `ToolCall`:**
- Purpose: Preserve ordering of assistant responses (text, thinking, tool use, user input).
- Examples: `src/types/chat.ts`; Rust serde structs in `src-tauri/src/chat/types.rs`.
- Pattern: Frontend renders from `content_blocks`; tool results are attached to matching `tool_call_id`.

**`CommandContext`:**
- Purpose: Decouple command triggers from implementations.
- Examples: `src/lib/commands/types.ts`, `src/hooks/use-command-context.ts`.
- Pattern: Commands receive a context object with stable callbacks and call `useStore.getState()` inside `execute()`.

**`InitialData`:**
- Purpose: Bulk hydrate the frontend in web mode.
- Examples: `src/lib/transport.ts`, seeded in `src/App.tsx`.
- Pattern: Server sends exactly what the UI needs; cache is warmed before WebSocket live events start.

## Entry Points

**Native desktop application:**
- Location: `src-tauri/src/main.rs` → `jean_lib::run()` → `src-tauri/src/lib.rs::run()`.
- Triggers: OS launches the Tauri binary.
- Responsibilities: Parse CLI args, apply Linux WebKit fixes, build Tauri app, register plugins, set up window, run event loop, register commands, start HTTP server if enabled.

**Frontend SPA:**
- Location: `src/main.tsx` → `src/App.tsx`.
- Triggers: Tauri webview or browser loads `index.html`.
- Responsibilities: Mount React, provide TanStack Query client, initialize command system, connect transport, bootstrap state.

**Headless mode:**
- Location: `src-tauri/src/lib.rs::run()` with `--headless`.
- Triggers: CLI arg `--headless`.
- Responsibilities: Close window immediately, serve frontend via Axum, keep Rust backend running.

**Jean MCP stdio server:**
- Location: `src-tauri/src/lib.rs::run()` detects `--jean-mcp-stdio` and runs `jean_mcp_stdio::run_stdio_server()`.
- Triggers: AI IDE or editor launches Jean as an MCP server.
- Responsibilities: Expose project/worktree tools over stdio.

**PI RPC host:**
- Location: `src-tauri/src/lib.rs::run()` detects `--jean-pi-rpc-host` and runs `chat::pi::run_pi_rpc_host_from_args()`.
- Triggers: Jean spawns itself to keep a PI CLI alive after quit.
- Responsibilities: Proxy PI commands over a Unix socket and append JSONL to the run log.

## Architectural Constraints

- **Single main window:** The Tauri app is built around one webview window (`"main"`). Headless mode closes it but keeps the backend alive.
- **Single-threaded event loop with async runtime:** Rust uses Tokio multi-thread for I/O, but Tauri state and event emission happen on the main thread; long-running CLI reads are streamed asynchronously.
- **Global singleton registries:** Running sessions, terminals, and browser tabs are tracked in module-level `Mutex`/`RwLock` maps in `src-tauri/src/chat/registry.rs`, `src-tauri/src/terminal/registry.rs`, and `src-tauri/src/browser/registry.rs`.
- **WebSocket dispatch parity:** Every new `#[tauri::command]` must be registered in both `src-tauri/src/lib.rs` and `src-tauri/src/http_server/dispatch.rs`, or it fails in web access with `"Unknown command"`.
- **Serialization convention duality:**
  - Persisted data (`AppPreferences`, `UIState`) uses snake_case on both sides.
  - Command/API data uses `#[serde(rename_all = "camelCase")]` on Rust and camelCase TypeScript. See `src-tauri/src/projects/github_issues.rs` and `src/types/projects.ts`.
- **Path validation:** All file-system operations validate against blocked directories and sanitize filenames (`validate_filename` in `src-tauri/src/lib.rs`).
- **Native-only browser integration:** The embedded browser (`src-tauri/src/browser/`) uses native webviews and is not exposed through `http_server::dispatch`.
- **WSL awareness:** On Windows, CLI resolution and launching can route through WSL via `src-tauri/src/platform/wsl.rs`.

## Anti-Patterns

### Subscribing to Zustand Getter Functions

**What happens:** A component selects a store function (`useChatStore(state => state.isViewingLogs)`) and calls it in JSX. The selector returns a stable function reference, so Zustand does not subscribe to the underlying data.
**Why it's wrong:** The component never re-renders when the data changes.
**Do this instead:** Select the actual data:
```typescript
const isViewingLogsTab = useChatStore(state =>
  state.activeWorktreeId ? state.viewingLogsTab[state.activeWorktreeId] ?? false : false
)
```
See `docs/developer/state-management.md` and `AGENTS.md` (Zustand Getter Function Anti-Pattern).

### Store Subscriptions Inside Callbacks

**What happens:** A callback destructures store state at hook level (`const { data, setData } = useStore()`) and depends on it in `useCallback`.
**Why it's wrong:** The callback is recreated on every state change, causing render cascades.
**Do this instead:** Read current state inside the callback with `getState()` and keep empty dependencies:
```typescript
const handleAction = useCallback(() => {
  const { currentData, updateData } = useStore.getState()
  updateData(currentData.modified)
}, [])
```
See `docs/developer/performance-patterns.md` and `AGENTS.md` (Performance Pattern).

### Adding a Tauri Command Without WebSocket Dispatch

**What happens:** A new `#[tauri::command]` works in the native app but returns `"Unknown command"` in the browser.
**Why it's wrong:** Web access routes through `src-tauri/src/http_server/dispatch.rs`, not Tauri's IPC.
**Do this instead:** Add the command to `generate_handler![]` in `src-tauri/src/lib.rs` **and** add a matching arm in `src-tauri/src/http_server/dispatch.rs`. Use the dispatch helpers (`field`, `from_field`, `to_value`) and emit cache invalidation when mutating data.

### Unguarded Zustand Record Updates

**What happens:** A store action spreads a new object for a record field even when the value has not changed.
**Why it's wrong:** Every `set()` notifies all subscribers; unchanged references cause unnecessary re-renders across components.
**Do this instead:** Guard no-op updates before returning new state. Example from `AGENTS.md`:
```typescript
addSendingSession: sessionId =>
  set(state => {
    if (state.sendingSessionIds[sessionId]) return state
    return { sendingSessionIds: { ...state.sendingSessionIds, [sessionId]: true } }
  })
```

## Error Handling

**Strategy:** Errors flow from Rust → `invoke()` rejection → TanStack Query error state or caught promise → toast/inline error. Uncaught async errors are trapped in `App.tsx` and surfaced via `sonner` toasts unless they are already-handled auth or transient transport errors.

**Patterns:**
- Rust commands return `Result<T, String>` (or `Result<T, E>` mapped to string).
- WebSocket disconnect errors are suppressed by `isWsDisconnectError()` in `src/services/chat.ts` to avoid toast spam during reconnect.
- Critical backend failures (auth, connection) show in `WsAuthErrorOverlay` in browser mode.
- Global `window.addEventListener('unhandledrejection', …)` and `window.addEventListener('error', …)` in `App.tsx` prevent the app from entering a half-broken state.

## Cross-Cutting Concerns

**Logging:**
- Frontend: `src/lib/logger.ts` wraps `console` and Tauri webview logging.
- Backend: `tauri-plugin-log` writes to stdout and the app log directory; levels are tuned per crate in `src-tauri/src/lib.rs`.

**Validation:**
- Input validation lives in Rust (`validate_filename`, `validate_string_input`, `validate_theme` in `src-tauri/src/lib.rs`).
- Path traversal is blocked by checking blocked prefixes and resolving paths against project/worktree roots.

**Authentication:**
- No Jean user accounts. Auth is delegated to installed CLIs (Claude, Codex, OpenCode, Cursor, PI, Grok, Command Code, GitHub CLI).
- Each backend has `check_*_auth` commands and frontend hooks (`useClaudeCliAuth`, `useCodexCliAuth`, etc.).
- Web access uses a bearer token (`JEAN_HTTP_TOKEN`) validated in `src-tauri/src/http_server/auth.rs`.

**Notifications:**
- In-app feedback uses `sonner` toasts.
- Background operations use the loading→success/error toast pattern (e.g., PR creation, commit, review).
- Native OS notifications are sent via `tauri-plugin-notification` for waiting-input/session-completion when the app is backgrounded.

**Auto-updates:**
- `tauri-plugin-updater` checks for updates; `App.tsx` downloads and triggers a process relaunch.

**Image/media processing:**
- Paste/drop images are resized/compressed in Rust (`process_image` in `src-tauri/src/chat/commands.rs`) before being attached to a session.

---

*Architecture analysis: 2026-06-28*
