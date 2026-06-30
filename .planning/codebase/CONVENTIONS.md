# Coding Conventions

**Analysis Date:** 2026-06-28

## Languages & Tooling

- **Frontend:** TypeScript / React 19 in `src/`.
- **Backend:** Rust (Tauri v2) in `src-tauri/`.
- **Package manager:** Bun (`bun.lock`).
- **Build / dev:** Vite v7 (`vite.config.ts`), `bun run dev`, `bun run build`.

## Code Style

- Prettier configuration lives in `prettier.config.js`:
  - `semi: false`
  - `singleQuote: true`
  - `trailingComma: 'es5'`
  - `tabWidth: 2`
  - `printWidth: 80`
  - `arrowParens: 'avoid'`
  - `bracketSpacing: true`
  - `endOfLine: 'lf'`
  - `jsxSingleQuote: false`
- Format the repo with `bun run format`; check with `bun run format:check`.
- Rust formatting uses default `cargo fmt` style. Run via `bun run rust:fmt` and `bun run rust:fmt:check`.

## Linting

- ESLint flat config is in `eslint.config.js`:
  - `@eslint/js` recommended
  - `typescript-eslint` strict + stylistic
  - React, React Hooks, React Refresh
  - `eslint-config-prettier`
- Key rules:
  - `@typescript-eslint/consistent-type-imports` with `inline-type-imports`
  - `@typescript-eslint/no-import-type-side-effects`
  - `@typescript-eslint/no-unused-vars` ignoring `_` prefixed names
  - `react/react-in-jsx-scope: off`, `react/prop-types: off`
  - Several React Hooks rules are temporarily relaxed while the codebase migrates to compiler-compatible patterns (`react-hooks/exhaustive-deps: off`, etc.)
- Run with `bun run lint` (enforces `--max-warnings 0`).
- Rust linting: `bun run rust:clippy` runs `cargo clippy -- -D warnings`.

## TypeScript Compiler Constraints

`tsconfig.json` enables strict checks that all code must satisfy:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `moduleResolution: bundler`
- `allowImportingTsExtensions: true`
- `noEmit: true`

Type-check with `bun run typecheck`.

## Naming Conventions

### TypeScript / React

- **Files:**
  - React components: PascalCase (`ChatWindow.tsx`, `Button.tsx`).
  - Utility / service / hook files: camelCase or kebab-case (`chat-store.ts`, `usePreferences.ts`, `terminal-instances.ts`).
  - shadcn UI primitive files: kebab-case (`button.tsx`, `scroll-area.tsx`).
  - Tests: co-located as `<module>.test.{ts,tsx}` or with descriptive suffixes (`ChatWindow.terminal-modal-regression.test.ts`, `GeneralPane.structure.test.ts`).
- **Directories:** kebab-case (`drag-and-drop/`, `preferences/panes/`, `components/ui/`).
- **Functions:** camelCase.
- **React components:** PascalCase.
- **Hooks:** prefix with `use` (`useCliVersionCheck`, `useUIStore`).
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_MODEL`, `INITIAL_RUN_LIMIT`).
- **Types / interfaces:** PascalCase (`interface ChatUIState`, `type NotificationSound`).
- **Zustand stores:** `use<Name>Store` (`useChatStore`, `useUIStore`, `useProjectsStore`).
- **Query-key factories:** `<domain>QueryKeys` (`chatQueryKeys`, `projectsQueryKeys`, `preferencesQueryKeys`).

### Rust

- Modules / files: `snake_case` (`commandcode_cli/`, `platform/process.rs`).
- Structs / enums: PascalCase (`Project`, `Backend`, `UsageData`).
- Fields: `snake_case`.
- Constants: `SCREAMING_SNAKE_CASE` (`DEFAULT_LABEL_COLOR`, `CLAUDE_COMPACTION_SUMMARY_PREFIX`).

## Import Organization

Use this order inside a file:

1. External packages (`react`, `@tanstack/react-query`, `sonner`, etc.)
2. Project aliases (`@/lib/...`, `@/components/...`, `@/store/...`, `@/services/...`, `@/types/...`, `@/hooks/...`)
3. Relative imports (`./`, `../`)

Prefer inline type imports:

```typescript
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { invoke } from '@/lib/transport'
import type { Session } from '@/types/chat'
```

The `@/` alias maps to `src/` via `tsconfig.json` and `vite.config.ts`.

## State Management & Performance

Follow the **State Management Onion** documented in `docs/developer/state-management.md` and `docs/developer/performance-patterns.md`:

- **Local component state:** `useState` / `useReducer`.
- **Global UI state:** Zustand stores in `src/store/`.
- **Persistent / server state:** TanStack Query with commands wrapped in `src/services/`.

Performance rules:

- In callbacks that only need the latest store value, use `getState()` instead of subscribing:

  ```typescript
  const handleAction = useCallback(() => {
    const { data, setData } = useStore.getState()
    setData(newData)
  }, [])
  ```

- Guard no-op Zustand updates so subscribers are not notified for unchanged values:

  ```typescript
  set(state => (state.modalOpen === open ? state : { modalOpen: open }))
  ```

- Selectors for hot paths (sidebar rows, session list items) should return primitives, not whole maps.

Current stores:

- `src/store/chat-store.ts` — sessions, streaming, execution modes, tool calls.
- `src/store/ui-store.ts` — layout, modals, panels.
- `src/store/projects-store.ts` — project selection / expansion.

## Error Handling

### TypeScript

- Wrap risky backend calls in `try/catch`, log with `logger` from `src/lib/logger.ts`, and surface to users via `sonner` toast where appropriate.
- Suppress known transient errors (e.g. `WebSocket disconnected`) instead of spamming toasts.
- Global safety net for uncaught errors lives in `src/App.tsx` (`unhandledrejection` and `error` event listeners).

### Rust

- Tauri commands generally return `Result<T, String>`.
- Use `map_err` and the `?` operator; keep error messages user-friendly.
- Validation helpers (e.g. `validate_filename`, `validate_string_input`) are defined in `src-tauri/src/lib.rs`.

## Logging

### Frontend

Use the environment-aware logger from `src/lib/logger.ts`:

```typescript
import { logger } from '@/lib/logger'

logger.info('Action completed', { sessionId })
logger.error('Request failed', { error })
```

- `debug` and `info` are no-ops in production builds.
- `warn` and `error` always log to the console.
- Never log secrets, tokens, or PII.

### Rust

Use the standard `log` crate:

```rust
log::info!("Saving preferences for {}", user_id);
log::warn!("Unexpected backend response: {:?}", response);
log::error!("Failed to write file: {}", err);
```

Backend logging is wired through `tauri-plugin-log`.

## Rust ↔ TypeScript Serialization

There are two serialization patterns in use; pick **one** per struct and stay consistent:

1. **Persisted / settings data — snake_case**
   - Rust structs use default `snake_case` fields.
   - TypeScript interfaces must match exactly (e.g. `active_worktree_id`).
   - Example: `AppPreferences` in `src-tauri/src/lib.rs` and `src/types/preferences.ts`; `UIState` in `src/types/ui-state.ts`.

2. **Command / API data — camelCase**
   - Add `#[serde(rename_all = "camelCase")]` to the Rust struct.
   - TypeScript uses standard camelCase.
   - Example: `IssueContext` / `PullRequestContext` in `src-tauri/src/projects/github_issues.rs`.

Default / migration safety:

- Prefer `#[serde(default)]` on Rust fields that may be missing from older persisted JSON.
- Enums that serialize to JSON strings use `#[serde(rename_all = "snake_case")]` or `#[serde(rename_all = "lowercase")]` as appropriate (see `src-tauri/src/projects/types.rs` and `src-tauri/src/chat/types.rs`).

## Function & Module Design

- Prefer **named exports**. Default exports are allowed for top-level containers (e.g. `src/App.tsx`).
- UI primitives use `class-variance-authority` + `cn()` from `src/lib/utils.ts`:

  ```typescript
  import { cn } from '@/lib/utils'

  <div className={cn('base', conditional && 'conditional')} />
  ```

- Keep functions focused and small. Extract pure helpers into `src/lib/`.
- Group related backend hooks in `src/services/` with exported query keys and reusable hooks.
- Rust modules follow a standard layout: `mod.rs` re-exports public items, `commands.rs` holds `#[tauri::command]` functions, and feature-specific files contain implementation logic.
- Every new `#[tauri::command]` must be registered in both:
  - `src-tauri/src/lib.rs` (`generate_handler![]`)
  - `src-tauri/src/http_server/dispatch.rs` (WebSocket dispatch)

## Process Spawning

For all background operations on Windows, use `silent_command()` from `src-tauri/src/platform/process.rs` to avoid console-window flashes. Reserve raw `std::process::Command` only for commands that intentionally open UI (file managers, terminals, editors).

## Styling

- Tailwind CSS v4 with CSS variables (`bg-background`, `text-foreground`, etc.).
- shadcn/ui v4 New York style; primitives live in `src/components/ui/`.
- Custom component styles are co-located with the component or in `src/App.css`.

## Comments & Documentation

- Use JSDoc / TSDoc for public helpers, hooks, and type definitions.
- Add inline comments for non-obvious business logic, especially serialization quirks and cross-platform workarounds.
- Keep `docs/developer/` up to date when introducing new architectural patterns.

---

*Convention analysis: 2026-06-28*
