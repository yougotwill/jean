# External Integrations

**Analysis Date:** 2026-06-28

## APIs & External Services

### AI / LLM Backends

Jean does not call cloud AI APIs directly. Instead, it orchestrates locally installed CLI tools and local/remote servers that the user authenticates separately.

**Claude CLI (Anthropic)**
- Binary: `claude` / `claude.exe`
- Managed install dir: `~/Library/Application Support/jean/claude-cli/` (macOS), `%APPDATA%/jean/claude-cli/` (Windows), `~/.local/share/jean/claude-cli/` (Linux)
- Rust module: `src-tauri/src/claude_cli/` (`commands.rs`, `config.rs`, `mcp.rs`)
- Frontend service: `src/services/claude-cli.ts`
- Auth: User-managed via `claude auth login`; Jean checks auth status with `check_claude_cli_auth`
- Source preference: `claude_cli_source` (`jean` managed vs `path` system PATH)

**Codex CLI (OpenAI)**
- Binary: `codex` / `codex.exe`
- Managed install dir: `src-tauri/src/codex_cli/config.rs` → `~/.../jean/codex-cli/`
- Rust module: `src-tauri/src/codex_cli/`
- Frontend service: `src/services/codex-cli.ts`
- Codex app-server mode supported for survivable sessions (`src-tauri/src/chat/codex_server.rs`)
- Codex local server: managed OpenCode-style server on `127.0.0.1:4096` (`src-tauri/src/opencode_server/mod.rs` is reused/generic; Codex uses similar patterns)
- Multi-agent collaboration, permission requests, command approvals, MCP elicitation, dynamic tool calls

**OpenCode**
- Binary: `opencode` / `opencode.exe`
- Managed install dir: `src-tauri/src/opencode_cli/config.rs`
- Rust module: `src-tauri/src/opencode_cli/`
- Frontend service: `src/services/opencode-cli.ts`
- Managed local HTTP server: `127.0.0.1:4096` (`src-tauri/src/opencode_server/mod.rs`)

**Cursor CLI**
- Binary: `agent` / `agent.exe` (legacy alias `cursor-agent`)
- Rust module: `src-tauri/src/cursor_cli/`
- Frontend service: `src/services/cursor-cli.ts`

**Pi CLI**
- Binary: `pi` / `pi.exe`
- Rust module: `src-tauri/src/pi_cli/`
- Frontend service: `src/services/pi-cli.ts`
- Detached PI RPC host for survivable sessions on Unix/macOS (`src-tauri/src/chat/pi.rs`, AGENTS.md notes)

**Command Code CLI**
- Binary: `cmd` / `command-code` aliases
- Rust module: `src-tauri/src/commandcode_cli/`
- Frontend service: `src/services/commandcode-cli.ts`

**Grok CLI (xAI)**
- Binary: `grok` / `grok.exe`
- Rust module: `src-tauri/src/grok_cli/`
- Frontend service: `src/services/grok-cli.ts`
- API key fallback: `XAI_API_KEY` env var

### GitHub Integration

**GitHub CLI (`gh`)**
- Binary: `gh` / `gh.exe`
- Managed install dir: `src-tauri/src/gh_cli/config.rs`
- Rust module: `src-tauri/src/gh_cli/`
- Frontend service: `src/services/gh-cli.ts`
- Used for:
  - Issue/PR listing and context loading (`src-tauri/src/projects/github_issues.rs`)
  - PR status, reviews, comments (`src-tauri/src/projects/pr_status.rs`)
  - GitHub Actions workflow runs (`src-tauri/src/projects/github_actions.rs`)
  - Release notes generation (`src-tauri/src/projects/release_notes.rs`)
  - Creating PRs, commits, resolving review threads
- Auth: `gh auth login` (user-managed); auth error detection in `is_gh_cli_auth_error`

### Linear Integration

**Linear GraphQL API**
- Endpoint: `https://api.linear.app/graphql` (`src-tauri/src/projects/linear_issues.rs`)
- HTTP client: `reqwest`
- Auth: Per-project or global `linear_api_key` preference (`linear_api_key` in `AppPreferences`)
- Used for:
  - Listing Linear issues and teams
  - Fetching issue details + comments
  - Creating worktrees from Linear issues
- Frontend service: `src/services/linear.ts`

### CodeRabbit Integration

**CodeRabbit CLI**
- Binary: `coderabbit` / `coderabbit.exe`
- Rust module: `src-tauri/src/coderabbit_cli/`
- Frontend service: `src/services/coderabbit-cli.ts`
- Used for AI code review triggers and PR review comments

## Data Storage

**Databases:**
- No SQL/SQLite database detected
- All persistence is file-based JSON / JSONL / TOML / YAML / Markdown under the Tauri app data directory

**File Storage:**
- Local filesystem only
- App data directory:
  - `~/Library/Application Support/jean/` (macOS)
  - `~/.local/share/jean/` (Linux)
  - `%APPDATA%/jean/` (Windows)
- Stored artifacts:
  - `sessions/` - Session metadata and index files
  - `runs/` - Per-session JSONL run logs
  - `session-context/` - Saved AI context files
  - `claude-cli/`, `codex-cli/`, `gh-cli/`, etc. - Managed CLI binaries
  - `opencode-server.pid` - Managed server PID tracking
  - `preferences.json`, `ui-state.json` - Persisted settings

**Caching:**
- TanStack Query in-memory cache (`src/lib/query-client.ts`)
- Rust in-memory caches for git/PR status, usage, CLI auth status
- No external cache service (Redis, etc.)

## Authentication & Identity

**Auth Provider:**
- No centralized auth provider
- Each external CLI/API manages its own authentication:
  - Claude CLI: `claude auth login`
  - Codex CLI: `codex auth login`
  - OpenCode: native login flow
  - Cursor CLI: native login flow
  - Pi CLI: native login flow
  - Command Code CLI: native login flow
  - Grok CLI: native login flow + `XAI_API_KEY` fallback
  - GitHub CLI: `gh auth login`
  - Linear API: personal API key stored in preferences

**Web Access Auth:**
- Token-based HTTP/WebSocket authentication
- Token generated in `src-tauri/src/http_server/auth.rs` (32 bytes base64url)
- Stored in `AppPreferences.http_server_token`
- Validated on `/api/auth` and WebSocket connect

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)

**Logs:**
- Tauri plugin log (`@tauri-apps/plugin-log`, `tauri-plugin-log`) - structured frontend+backend logging
- Rust `log` crate used throughout backend
- Web build info logged/served via `jean-build.json`

**Notifications:**
- Tauri plugin notification (`@tauri-apps/plugin-notification`, `tauri-plugin-notification`) - native OS banners
- Toast UI via `sonner`
- Notification sounds via web audio (`sounds/` assets)

## CI/CD & Deployment

**Hosting:**
- Native desktop application; not a hosted web service
- Headless mode available for self-hosted web access

**CI Pipeline:**
- GitHub Actions workflows in `.github/workflows/`
- Release builds target macOS, Windows, Linux
- Tauri updater pulls `latest.json` from GitHub Releases

**Distribution:**
- GitHub Releases: `https://github.com/coollabsio/jean/releases`
- Homebrew tap: `coollabsio/jean`
- Tauri updater public key embedded in `src-tauri/tauri.conf.json`

## Environment Configuration

**Required env vars (runtime debugging / platform):**
- `SHELL` - Shell selection for git and embedded terminal
- `XDG_CONFIG_HOME`, `APPDATA` - Config path resolution
- `WAYLAND_DISPLAY`, `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`, `GDK_BACKEND` - Linux display backend selection
- `APPIMAGE`, `APPDIR`, `SNAP`, `FLATPAK_ID`, `FLATPAK_SANDBOX_DIR` - Linux packaging detection

**Optional env vars:**
- `JEAN_DUMP_STREAM=1` - Dump AI stream output for debugging
- `JEAN_CODEX_STDIO=1` - Force Codex stdio transport
- `JEAN_DEV_USAGE_POLL` - Override usage polling behavior
- `JEAN_FORCE_X11=1` - Force X11 backend on Linux
- `JEAN_WEB_BUILD_ID` - Override Vite build ID
- `XAI_API_KEY` - Grok/xAI API key fallback
- `TAURI_DEV_HOST` - Enable Vite HMR host mode

**Secrets location:**
- No `.env` files committed
- Linear API key stored in `preferences.json` (app data dir)
- HTTP server token stored in `preferences.json`
- GitHub/Claude/Codex auth tokens are stored by their respective CLIs in their own config directories (e.g., `~/.config/gh/`, `~/.claude/`)

## Webhooks & Callbacks

**Incoming:**
- No external webhooks
- Internal HTTP endpoints only:
  - `GET /api/auth` - Token validation (`src-tauri/src/http_server/server.rs`)
  - `GET /api/init` - Bootstrap payload for web clients
  - `GET /api/version` - Version/build info
  - `GET /api/files/{*filepath}` - Static file serving
  - `GET /api/project-files/{*filepath}` - Project-scoped file serving
  - `GET /ws` - WebSocket upgrade for command dispatch

**Outgoing:**
- No outgoing webhooks
- Outgoing network calls are limited to:
  - Linear GraphQL API (`https://api.linear.app/graphql`)
  - Managed CLI downloads/updates (GitHub releases, npm, etc.)
  - OpenCode local server health checks (`http://127.0.0.1:4096/global/health`)
  - Tauri updater endpoint (`https://github.com/coollabsio/jean/releases/latest/download/latest.json`)

## Model Context Protocol (MCP)

**Jean MCP Server**
- Protocol version: `2024-11-05` (`src-tauri/src/jean_mcp_core.rs`)
- Exposes Jean commands as MCP tools to external CLIs (Claude, Cursor, Codex, etc.)
- Transport:
  - stdio proxy: `src-tauri/src/jean_mcp_stdio.rs` launched with `--jean-mcp-stdio`
  - Unix socket via `JEAN_MCP_SOCKET` env var
- Config installation: `src-tauri/src/jean_mcp_config.rs` writes entries into `claude_config.json`, Cursor MCP config, Codex TOML config
- Auth token via `JEAN_MCP_TOKEN`

**Third-Party MCP Servers**
- Discovered/health-checked per backend (Claude, Codex, Cursor, OpenCode)
- Frontend service: `src/services/mcp.ts`
- Status command: `check_mcp_health`

## Browser / WebView Integration

**Embedded Browser Pane**
- Child webviews created via Tauri Webview API (`src-tauri/src/browser/commands.rs`)
- Restricted capability `browser-pane.json` grants zero Tauri permissions to browser webviews
- Title/URL events reported back to Rust via injected JS observer
- Used for browsing docs, logs, or any external URL without leaving the app

## Terminal Integration

**Embedded Terminal**
- PTY backend: `portable-pty` (`src-tauri/src/terminal/`)
- Renderers: xterm.js (`@xterm/xterm`) and experimental Ghostty Web (`ghostty-web`)
- Commands: `start_terminal`, `stop_terminal`, `write_terminal`, `resize_terminal`
- External terminal apps: Terminal, Warp, Ghostty, iTerm2, PowerShell, Windows Terminal

## External Editors

**Open-in-Editor**
- Supported editors: Zed, VS Code, Cursor, Xcode, IntelliJ (`src/types/preferences.ts`)
- Invoked via Tauri `opener` plugin or platform shell commands

## CLI Management & Updates

**Install/Update**
- Each backend CLI can be installed/updated from Settings
- Update commands restricted to known package managers/CLIs: `brew`, `npm`, `bun`, `claude`, `opencode`, `coderabbit`, `pi` (`src-tauri/src/cli_update/mod.rs`)
- Active-session guard prevents updates while sessions are running

---

*Integration audit: 2026-06-28*
