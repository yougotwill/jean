# Codebase Concerns

**Analysis Date:** 2026-06-28

## Tech Debt

### Critical React Hooks lint rules are disabled globally

- **Files:** `eslint.config.js` (lines 37-41), plus 102 `eslint-disable` occurrences across 55 TypeScript/TSX files
- **Issue:** The project-wide ESLint config turns off `react-hooks/exhaustive-deps`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect`, and `react-refresh/only-export-components`. `reportUnusedDisableDirectives` is also turned off.
- **Impact:** Stale closures, missed effect dependencies, unnecessary re-renders, and Hot Module Replacement problems are not caught automatically. Inline disables in `src/App.tsx`, `src/lib/transport.ts`, `src/components/chat/hooks/useToolbarHandlers.ts`, `src/components/chat/hooks/useStreamingEvents.ts`, etc., hide the same categories of bugs.
- **Fix approach:** Re-enable the hooks rules incrementally, fix root causes, and remove stale disable comments. Turn `reportUnusedDisableDirectives` back on to prevent accumulation.

### Widespread use of `any` and non-null assertions

- **Files:** `src/lib/transport.ts`, `src/hooks/useSessionStatePersistence.ts`, `src/components/chat/hooks/useMessageSending.ts`, `src/components/chat/hooks/useToolbarHandlers.ts`, `src/components/chat/hooks/useGitOperations.ts`
- **Issue:** 24 explicit `any` annotations plus 25 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments, and many `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` comments (e.g., `src/components/chat/SessionDebugPanel.tsx`, `src/components/preferences/panes/MagicPromptsPane.tsx`).
- **Impact:** Type safety is intentionally bypassed in core transport, hooks, and UI components.
- **Fix approach:** Replace `any` with generated Tauri return types or narrow unknown payloads. Use optional chaining and early returns instead of non-null assertions.

### Massive source files and weak separation of concerns

- **Files:**
  - `src-tauri/src/projects/commands.rs` — 11,926 lines
  - `src-tauri/src/chat/commands.rs` — 9,450 lines
  - `src/components/preferences/panes/GeneralPane.tsx` — 4,726 lines
  - `src/components/dashboard/ProjectCanvasView.tsx` — 3,661 lines
  - `src/components/chat/ChatWindow.tsx` — 3,558 lines
  - `src/components/chat/hooks/useMessageHandlers.ts` — 3,460 lines
  - `src/services/projects.ts` — 3,113 lines
  - `src/services/chat.ts` — 2,775 lines
- **Issue:** Business logic, UI rendering, command handlers, and side effects are packed into single files.
- **Impact:** Merge conflicts, slow code review, and difficulty writing focused tests.
- **Fix approach:** Split by domain (e.g., separate `projects/commands/` into `git.rs`, `worktree.rs`, `github.rs`) and break React components into smaller, memoized sub-components.

### Prettier formatting is not enforced in the quality gate

- **Files:** `package.json` (line 45), `docs/developer/testing.md` (line 478)
- **Issue:** `bun run check:all` runs typecheck, lint, Rust fmt, Rust clippy, and tests, but omits `prettier --check`. The testing docs claim Prettier is part of the gate.
- **Impact:** Formatting drift and undocumented deviation from `prettier.config.js`.
- **Fix approach:** Add `bun run format:check` to `check:all` and update docs if the scope changes.

### Every Tauri command must be registered in two places

- **Files:** `src-tauri/src/lib.rs` (lines 4233-4633), `src-tauri/src/http_server/dispatch.rs` (lines 88-3150+)
- **Issue:** Native IPC registers commands in `tauri::generate_handler![]` (~355 entries). WebSocket access requires a matching `match` arm in `dispatch_command` (~345 arms). Browser commands are explicitly excluded from dispatch, but any other accidental omission results in `"Unknown command"` in web access.
- **Impact:** Manual two-place registration is error-prone and already shows a 10-command difference.
- **Fix approach:** Generate the dispatch match arms from the `generate_handler![]` list, or maintain a single registry that both transports read.

### Model option definitions are scattered and partly duplicated

- **Files:** `src/types/preferences.ts` (`modelOptions`, `ClaudeModel`, lines 1242-1304), `src/components/chat/toolbar/toolbar-options.ts` (`MODEL_OPTIONS`, `COMMANDCODE_MODEL_OPTIONS`, `CURSOR_MODEL_OPTIONS`, etc.)
- **Issue:** The Claude dropdown options are derived from `modelOptions`, but Command Code, Cursor, Grok, OpenCode, and PI model arrays are hardcoded separately in the toolbar. `ChatToolbar.tsx` re-exports `MODEL_OPTIONS`.
- **Impact:** Adding a model or backend requires touching multiple files and risks stale labels/values.
- **Fix approach:** Centralize all backend model metadata in `src/types/preferences.ts` and derive UI arrays from that source.

## Known Bugs / Potential Bugs

### `getState()` anti-pattern is not universally followed

- **Files:** `src/store/chat-store.ts`, `src/store/ui-store.ts`, `src/components/chat/hooks/useContextOperations.ts`
- **Issue:** AGENTS.md documents that callbacks should use `useStore.getState()` to avoid render cascades, but several hooks still subscribe to whole slices or getter functions.
- **Impact:** Hard-to-trace re-render cascades in `ChatWindow`, `ProjectCanvasView`, and sidebar rows.
- **Fix approach:** Audit every `useChatStore()`/`useUIStore()` call and convert callbacks to `getState()` with empty dependency arrays.

### Terminal auto-create races with UI state hydration

- **Files:** `src/hooks/useUIStatePersistence.ts`, `src/components/chat/ChatWindow.tsx`, `docs/developer/architecture-guide.md` (lines 133-139)
- **Issue:** `TerminalView`'s default-shell effect is gated by `uiStateInitialized`. If that guard is removed or races with `restoreTerminalRuntimeState`, a phantom shell is spawned and later overwritten, leaving orphan PTYs in `TERMINAL_SESSIONS`.
- **Impact:** Resource leaks and duplicate terminals after refresh.
- **Fix approach:** Keep the guard, add an integration test for the refresh/reconnect path, and verify `kill_all_terminals` cleans orphans.

### Detached terminals have no memory cap

- **File:** `src/lib/terminal-instances.ts` (line 872)
- **Issue:** A TODO comment notes the absence of a cap on detached terminals.
- **Impact:** Long-running sessions can accumulate unbounded terminal scrollback/state in the frontend module-level Map.
- **Fix approach:** Implement the 20-max cap suggested by the TODO and add eviction logic.

## Security Considerations

### HTTP server allows cross-origin requests from any origin

- **File:** `src-tauri/src/http_server/server.rs` (lines 216-219)
- **Issue:** `CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)` is applied globally.
- **Impact:** When the server is bound to a non-loopback address (e.g., `0.0.0.0`) or when `token_required` is false, any website can issue requests to the Jean API from the browser.
- **Fix approach:** Restrict CORS to the bundled UI origin/localhost in production. Always enforce the bearer token unless the user explicitly disables it, and log such events.

### Web access exposes arbitrary filesystem and process APIs

- **Files:**
  - `src-tauri/src/chat/commands.rs` — `read_file_content` (line 5868) and `write_file_content` (line 5900) accept any path string with no project-root validation.
  - `src-tauri/src/terminal/commands.rs` — `start_terminal` (line 29) forwards arbitrary `command` and `command_args` to a PTY.
  - `src-tauri/src/projects/commands.rs` — `browse_directory` (line 374) enumerates any directory the OS allows.
- **Issue:** Once an HTTP/WebSocket client is authenticated (or if the token is disabled), these commands give remote read/write access to the filesystem and arbitrary command execution.
- **Impact:** Remote code execution and data exfiltration if the token leaks or `--no-token` is used on a network interface.
- **Fix approach:** Enforce "known project/worktree roots" validation for file APIs (reuse `canonicalize_known_project_roots` from `src-tauri/src/http_server/server.rs`). Restrict terminal spawning to configured shells/run scripts. Disable `--no-token` when binding to non-loopback addresses.

### Static SPA files are served without authentication

- **File:** `src-tauri/src/http_server/server.rs` (lines 1103-1154)
- **Issue:** `static_handler` intentionally has no token check so the bundled UI can load. Combined with permissive CORS, any origin can fetch the application bundle.
- **Impact:** Low direct impact, but it broadens the attack surface and makes CSRF-style probing easier.
- **Fix approach:** Scope CORS and consider requiring the token for non-HTML assets in production builds.

### AI-rendered markdown can contain raw HTML

- **File:** `src/components/ui/markdown.tsx` (lines 17, 572)
- **Issue:** `ReactMarkdown` uses `rehype-raw` to render raw HTML from assistant messages. There is no sanitization step.
- **Impact:** A malicious or compromised AI backend, or a reflected payload in a shared session, could inject scripts or event handlers into the chat view.
- **Fix approach:** Add `rehype-sanitize` with a strict allowlist, or disable raw HTML and render only standard Markdown nodes.

### Syntax-highlighted code uses `dangerouslySetInnerHTML`

- **File:** `src/components/chat/FileContentModal.tsx` (line 101)
- **Issue:** The modal renders Shiki-generated HTML via `dangerouslySetInnerHTML`. While Shiki escapes content under normal conditions, any parser/language-injection bug could output executable markup.
- **Impact:** Potential XSS when opening untrusted files.
- **Fix approach:** Verify that Shiki output is always escaped; add a post-processor sanitizer, or render highlighted code through a trusted component.

### Auto-fix can approve plans and execute yolo mode without human confirmation

- **File:** `src-tauri/src/auto_fix/scheduler.rs` (lines 141-149, 377-714)
- **Issue:** When a project's `auto_fix_settings.auto_yolo_enabled` is true, the scheduler creates a worktree, runs a background investigation, automatically calls `mark_plan_approved`, switches the session to `yolo` execution mode, and sends a "Mr. Robot Yolo" prompt.
- **Impact:** Unsupervised AI edits, git commits, and shell execution based on GitHub issue labels and title/body content.
- **Fix approach:** Require an explicit per-run approval or a quarantine review step. Add an immutable audit log of every auto-approved plan and executed command.

### Content Security Policy allows unsafe execution

- **File:** `src-tauri/tauri.conf.json` (line 42)
- **Issue:** The CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts.
- **Impact:** Weakened protection against XSS and eval-based injection.
- **Fix approach:** Tighten the CSP for release builds; keep the permissive policy only for development.

### Native file operations bypass the Tauri FS allowlist

- **Files:** throughout `src-tauri/src/` (e.g., `chat/commands.rs`, `projects/commands.rs`, `projects/storage.rs`)
- **Issue:** Rust code uses `std::fs` directly rather than the Tauri FS plugin. Security relies entirely on command-level validation.
- **Impact:** A single missing path check grants full filesystem access.
- **Fix approach:** Centralize file operations behind a path-validation helper that enforces known roots and use it for every read/write/delete command.

## Performance Bottlenecks

### Large React components subscribe to broad state

- **Files:** `src/components/chat/ChatWindow.tsx`, `src/components/dashboard/ProjectCanvasView.tsx`, `src/components/preferences/panes/GeneralPane.tsx`
- **Issue:** These components are thousands of lines long and likely subscribe to large store slices. Even with the documented `getState()` pattern, the components themselves re-render frequently.
- **Impact:** Jank in long chat sessions and large project canvases.
- **Fix approach:** Decompose into smaller memoized components, use primitive selectors, and add React DevTools/WDYR audits before releases.

### Terminal output replay buffers can consume significant memory

- **Files:** `docs/developer/architecture-guide.md` (lines 111-113), `src-tauri/src/http_server/mod.rs`
- **Issue:** The backend keeps `TERMINAL_BUFFER_MAX_EVENTS = 12000` events and `TERMINAL_BUFFER_MAX_BYTES = 3MB` per terminal.
- **Impact:** With many concurrent terminals, memory usage grows linearly.
- **Fix approach:** Add a global buffer budget and evict oldest events when the budget is exceeded.

### Markdown parsing is expensive and unbounded

- **File:** `src/components/ui/markdown.tsx` (lines 539-579)
- **Issue:** Every message runs `ReactMarkdown` + `remarkGfm` + `rehypeRaw` + `remend`. Long assistant messages with large tables or code blocks multiply the cost.
- **Impact:** Scroll and streaming performance degrade in long sessions.
- **Fix approach:** Virtualize message rendering, cache parsed ASTs, and limit the size of rendered tables.

### Background polling and auto-fix loops run at fixed intervals

- **Files:** `src-tauri/src/background_tasks/mod.rs`, `src-tauri/src/auto_fix/scheduler.rs` (lines 14-16)
- **Issue:** Git/PR polling and the auto-fix scheduler tick every few seconds, regardless of system load or project size.
- **Impact:** CPU, network, and API quota usage scale with the number of tracked projects.
- **Fix approach:** Verify tiered/focus-aware intervals are honored and add load shedding when many projects are configured.

### Rust code contains many `unwrap()` and `unsafe` blocks

- **Metrics:** 355 `.unwrap()` calls and 15 `unsafe` blocks across `src-tauri/src/`.
- **Files:** `src-tauri/src/terminal/pty.rs`, `src-tauri/src/platform/process.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/chat/codex_server.rs`, `src-tauri/src/chat/detached.rs`, `src-tauri/src/chat/claude.rs`
- **Impact:** Panics in production paths and undefined behavior if UTF-8/lock invariants fail.
- **Fix approach:** Replace `unwrap()` in production code with `map_err` and structured errors. Minimize `unsafe` blocks and document preconditions with `// SAFETY:` comments.

## Fragile Areas

### Two serialization conventions for Rust/TypeScript data

- **Files:** `src/types/preferences.ts`, `src/types/ui-state.ts`, `src-tauri/src/lib.rs`, `src-tauri/src/chat/types.rs`, `src-tauri/src/projects/types.rs`
- **Issue:** Pattern A (snake_case for persisted settings) and Pattern B (`#[serde(rename_all = "camelCase")]` for command data) are both used. The dispatch layer needs dual-key extraction (`field(..., camelCase, snake_case)`) to paper over mismatches.
- **Impact:** Easy to introduce "missing field" runtime errors when adding new fields.
- **Fix approach:** Generate TypeScript types from Rust structs or enforce one convention per struct with a lint/codegen check.

### Terminal PTY uses unchecked UTF-8 conversion

- **File:** `src-tauri/src/terminal/pty.rs` (lines 276, 294)
- **Issue:** The reader uses `String::from_utf8_unchecked` after manual validation. Any off-by-one bug in the validation path could produce undefined behavior.
- **Impact:** Memory safety bug in a hot, long-running loop.
- **Fix approach:** Add fuzz/property tests for partial UTF-8 sequences and consider using `String::from_utf8_lossy` in a benchmark-critical path only after proving the cost.

### E2E mock transport must mirror the real command surface

- **Files:** `e2e/fixtures/invoke-handlers.ts`, `e2e/fixtures/tauri-mock.ts`
- **Issue:** Every new Tauri command needs an entry in the static mock map and possibly a dynamic handler.
- **Impact:** E2E tests can pass against mocks while real native/web behavior differs.
- **Fix approach:** Generate the static handler map from the command registry and run at least a subset of tests against the real backend.

### Zustand store mutation guards are inconsistent

- **Files:** `src/store/chat-store.ts`, `src/store/ui-store.ts`, `src/store/projects-store.ts`, `src/store/terminal-store.ts`
- **Issue:** AGENTS.md documents the need for no-op guards, but not every setter checks whether the value changed before spreading a new object.
- **Impact:** Unnecessary re-renders across hot surfaces like sidebar rows and session cards.
- **Fix approach:** Add guard helpers and unit tests for store setters that mutate per-ID records.

## Scaling Limits

### Explicit caps exist for individual resources but not for totals

- **Files:**
  - `src-tauri/src/chat/commands.rs` — 10MB read/write limit
  - `src-tauri/src/projects/commands.rs` — 500 directory entries in `browse_directory`
  - `src-tauri/src/http_server/server.rs` — `INIT_MESSAGE_WINDOW = 50`, `INIT_REPLAY_EVENT_CAP = 200`
- **Issue:** There is no global cap on worktrees, sessions, terminals, or auto-fix worktrees.
- **Impact:** Large monorepos or aggressive auto-fix settings can exhaust file descriptors, disk space, or memory.
- **Fix approach:** Implement the detached-terminal memory cap, add per-project worktree limits, and monitor fd usage on startup.

### HTTP server binding can expose the app to the LAN

- **File:** `src-tauri/src/http_server/server.rs` (lines 1241-1254)
- **Issue:** Users can bind to `0.0.0.0` or a LAN/Tailscale IP. `localhost_only` is derived from the bind address but does not prevent non-loopback binding.
- **Impact:** The web UI and API become reachable from other devices.
- **Fix approach:** Show a security warning when binding to non-loopback addresses and default to `localhost`/`127.0.0.1`.

## Dependencies at Risk

### Many external CLI integrations with unstable output formats

- **Files:** `src-tauri/src/claude_cli/commands.rs`, `src-tauri/src/codex_cli/commands.rs`, `src-tauri/src/cursor_cli/commands.rs`, `src-tauri/src/opencode_cli/commands.rs`, `src-tauri/src/pi_cli/commands.rs`, `src-tauri/src/commandcode_cli/commands.rs`, `src-tauri/src/grok_cli/commands.rs`, `src-tauri/src/gh_cli/commands.rs`
- **Issue:** Install, auth, version, and chat parsing logic depends on each CLI's JSON/NDJSON schema. A new release of any CLI can break parsing.
- **Impact:** Chat streaming, auth status, and installation flows fail silently or throw.
- **Fix approach:** Pin supported CLI version ranges, add schema-version detection, and add snapshot tests for representative CLI output.

### Pinned Linux GTK/WebKit versions

- **File:** `src-tauri/Cargo.toml` (lines 71-72)
- **Issue:** `webkit2gtk` and `gtk` are pinned to exact versions tied to Tauri's transitive dependencies.
- **Impact:** Tauri updates may require manual bumps and compatibility testing.
- **Fix approach:** Document the pinning rationale and test Linux builds after every Tauri upgrade.

### Tauri unstable/private APIs

- **File:** `src-tauri/Cargo.toml` (line 21), `src-tauri/tauri.conf.json` (line 54)
- **Issue:** The app depends on Tauri features `unstable`, `webview-data-url`, and `macos-private-api`.
- **Impact:** Future Tauri releases can introduce breaking changes without deprecation.
- **Fix approach:** Track Tauri release notes, keep the Tauri CLI/API versions in sync, and isolate unstable usage.

## Missing Critical Features

### No tamper-resistant audit log for security-sensitive actions

- **Issue:** Auto-fix runs, plan approvals, terminal spawns, file writes, and preference changes are logged to the standard log only.
- **Impact:** Compromised or malicious actions are hard to reconstruct.
- **Fix approach:** Add an append-only audit log for commands that mutate state or execute code.

### No sandboxing for AI-driven execution

- **Issue:** `yolo` mode and terminal sessions run with the user's full permissions.
- **Impact:** A compromised backend or malicious prompt can modify the host freely.
- **Fix approach:** Consider sandbox wrappers (containers, restricted user, read-only snapshots) for yolo execution.

### No rate limiting on the HTTP/WebSocket API

- **Files:** `src-tauri/src/http_server/server.rs`, `src-tauri/src/http_server/websocket.rs`
- **Issue:** Only MCP tool calls have rate limits. The broader command dispatch path does not throttle per client.
- **Impact:** Brute-force token guessing or accidental load can overwhelm the backend.
- **Fix approach:** Add per-IP and per-token rate limiting for `/api/*`, `/ws`, and dispatch commands.

## Test Coverage Gaps

### Core UI components lack dedicated unit tests

- **Files:** `src/components/chat/ChatWindow.tsx`, `src/components/dashboard/ProjectCanvasView.tsx`, `src/components/preferences/panes/GeneralPane.tsx`, `src/components/chat/hooks/useMessageHandlers.ts`
- **Issue:** No co-located `.test.tsx`/`.test.ts` files exist for these large components/hooks.
- **Impact:** Core user flows are only covered indirectly by E2E mocks.
- **Fix approach:** Add component and hook tests for state transitions, keyboard shortcuts, and canvas navigation.

### Native command/dispatch parity is not verified

- **Files:** `src-tauri/src/lib.rs`, `src-tauri/src/http_server/dispatch.rs`
- **Issue:** There is no automated check that every native command has a dispatch arm, and the existing dispatch tests only cover argument parsing.
- **Impact:** Web access silently breaks for new commands.
- **Fix approach:** Add a Rust unit test that reflects over `generate_handler![]` and asserts a matching dispatch arm exists.

### Security-critical paths are under-tested

- **Files:** `src-tauri/src/http_server/auth.rs`, `src-tauri/src/http_server/server.rs`, `src-tauri/src/auto_fix/scheduler.rs`, `src-tauri/src/chat/commands.rs`, `src-tauri/src/terminal/commands.rs`
- **Issue:** Token validation, CORS binding, path traversal, auto-fix approval, and terminal command validation have limited or no automated tests.
- **Impact:** Regressions in security boundaries go unnoticed.
- **Fix approach:** Add tests for invalid tokens, path traversal attempts, non-loopback binding warnings, and auto-fix disabled-state transitions.

### E2E mock handlers can drift from real behavior

- **Files:** `e2e/fixtures/invoke-handlers.ts`, `e2e/fixtures/tauri-mock.ts`
- **Issue:** The static response map and dynamic handlers are maintained by hand.
- **Impact:** E2E tests pass against stale mocks.
- **Fix approach:** Generate default response shapes from Rust command return types or from a shared OpenAPI/Tauri schema.

---

*Concerns audit: 2026-06-28*
