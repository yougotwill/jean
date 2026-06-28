# Testing Patterns

**Analysis Date:** 2026-06-28

## Test Framework

**TypeScript runner:** Vitest v4 with the React plugin.

- Config: `vitest.config.ts`
  - `globals: true`
  - `environment: 'jsdom'`
  - `setupFiles: ['./src/test/setup.ts']`
  - `include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']`
  - `resolve.alias: { '@': '/src' }`

**Assertion library:** Vitest `expect` plus `@testing-library/jest-dom` matchers.

**React testing utilities:** `@testing-library/react`, `@testing-library/react-hooks`, `@testing-library/user-event`.

**Run commands:**

```bash
bun run test          # watch mode
bun run test:run      # single CI run
bun run test:ui       # Vitest UI
bun run test:coverage # vitest run --coverage (no provider installed)
bun run test:all      # TypeScript tests + Rust tests
bun run check:all     # typecheck + lint + rust fmt/clippy + all tests
```

## Test File Organization

- **Co-located with source** is the default pattern:
  - `src/services/preferences.test.ts` tests `src/services/preferences.ts`
  - `src/components/ui/sonner.test.tsx` tests `src/components/ui/sonner.tsx`
  - `src/hooks/useCliVersionCheck.test.tsx` tests `src/hooks/useCliVersionCheck.ts`
- **Naming:** `<module>.test.{ts,tsx}`. Regression / structure tests may add descriptive suffixes, e.g.:
  - `src/components/chat/ChatWindow.terminal-modal-regression.test.ts`
  - `src/components/preferences/panes/GeneralPane.structure.test.ts`
- **Cross-cutting tests** live in `src/test/`:
  - `src/test/example.test.ts`
  - `src/test/tauri-config.test.ts`
- **Rust tests** are inline `#[cfg(test)]` modules, typically placed at the bottom of the source file. There is currently no separate `src-tauri/tests/` integration directory.

Current test counts: ~165 test files testing ~656 TypeScript source files.

## Global Test Setup

`src/test/setup.ts` runs before every test file and provides:

- Mock `localStorage`
- Mock `window.matchMedia`
- No-op `ResizeObserver` shim (required by xterm / resizable panels in jsdom)
- Global mocks for Tauri APIs:
  - `@tauri-apps/api/core` → `invoke`
  - `@tauri-apps/api/event` → `listen`
  - `@tauri-apps/plugin-updater` → `check`

`src/test/test-utils.tsx` exports a custom `render` that wraps components in a `QueryClientProvider` with `retry: false`:

```typescript
import { render } from '@/test/test-utils'

render(<MyComponent />)
```

## Test Structure

Use `describe` / `it` with descriptive, sentence-style names:

```typescript
import { describe, it, expect } from 'vitest'

describe('model option helpers', () => {
  it('offers Claude 1M variants alongside standard context models', () => {
    expect(modelOptions.map(o => o.value)).toContain('claude-opus-4-8[1m]')
  })
})
```

Reset shared mutable state (especially Zustand stores) in `beforeEach`. Example from `src/store/chat-store.test.ts`:

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  useChatStore.setState({
    activeWorktreeId: null,
    activeSessionIds: {},
    // ... all other fields reset
  })
})
```

## Mocking

- Mock modules with `vi.mock` at the top of the test file.
- Use `vi.hoisted` when the mock factory needs to reference a shared variable:

  ```typescript
  const { mockInvoke } = vi.hoisted(() => ({
    mockInvoke: vi.fn().mockResolvedValue(undefined),
  }))

  vi.mock('@/lib/transport', () => ({
    invoke: mockInvoke,
  }))
  ```

- Type mocked functions with `vi.mocked()`:

  ```typescript
  const mockInvoke = vi.mocked(invoke)
  ```

- Common mocks in frontend tests:
  - `@/lib/transport` (`invoke`)
  - `@/lib/logger` (`logger.debug/info/warn/error`)
  - `@/lib/platform` (`isMacOS`, `isWindows`, `isLinux`, `openExternal`)
  - `sonner` (`toast.success/error/loading`)
  - Entire service hooks when testing a consumer hook.

Example from `src/hooks/useCliVersionCheck.test.tsx`:

```typescript
vi.mock('@/services/preferences', () => ({
  usePreferences: () => ({ data: mockState.preferences, isLoading: false }),
}))
```

## Component Testing

Use the custom render from `src/test/test-utils.tsx` so TanStack Query is available:

```typescript
import { render, screen } from '@/test/test-utils'
import { ScrollArea } from './scroll-area'

describe('ScrollArea', () => {
  it('applies viewportClassName to the viewport element', () => {
    render(
      <ScrollArea viewportClassName="overflow-x-auto touch-pan-x">
        <div>content</div>
      </ScrollArea>
    )

    const viewport = screen.getByText('content').parentElement
    expect(viewport).toHaveAttribute('data-slot', 'scroll-area-viewport')
    expect(viewport).toHaveClass('overflow-x-auto')
  })
})
```

From `src/components/ui/scroll-area.test.tsx`.

## Hook Testing

Use `renderHook`, `act`, and `waitFor`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'

const { result } = renderHook(() => usePreferences(), { wrapper })

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true)
})
```

Fake timers are used for time-based hooks (`vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()`). See `src/hooks/useCliVersionCheck.test.tsx`.

## Store Testing

Render the store hook directly and assert against `useStore.getState()`:

```typescript
const { setActiveSession, getActiveSession } = useChatStore.getState()

setActiveSession('worktree-1', 'session-1')

expect(getActiveSession('worktree-1')).toBe('session-1')
```

See `src/store/chat-store.test.ts`.

## E2E Testing

**Runner:** Playwright v1.58.2.

**Config files:**

- `e2e/playwright.config.ts` — real config (`testDir: './tests'`, port `1421`, `bun run dev:e2e` webServer).
- `playwright.config.ts` — root proxy that re-exports the `e2e/` config with `testDir: './e2e/tests'` so `bunx playwright test` works without `--config`.
- `e2e/vite.config.e2e.ts` — extends the main Vite config and aliases Tauri plugin imports to stub files in `e2e/stubs/`.

**Run commands:**

```bash
bun run test:e2e                                    # all E2E tests
bun run test:e2e -- --ui                           # Playwright UI mode
bun run test:e2e -- tests/chat-messaging.spec.ts   # single file
```

**Mock transport architecture:**

- The app detects `window.__JEAN_E2E_MOCK__` in `src/lib/transport.ts` and routes `invoke()` / `listen()` to in-memory handlers.
- Static command responses live in `e2e/fixtures/invoke-handlers.ts`.
- Stateful / dynamic handlers live in `e2e/fixtures/tauri-mock.ts`.
- Precedence: per-test `responseOverrides` > dynamic handlers > static handlers.

**Writing a new E2E test:**

```typescript
import { test, activateWorktree } from '../fixtures/tauri-mock'
import { expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('does something', async ({ mockPage }) => {
    await activateWorktree(mockPage, 'My Worktree')
    await mockPage.getByRole('button', { name: 'Click me' }).click()
    await expect(mockPage.getByText('Result')).toBeVisible()
  })
})
```

**Event simulation:**

```typescript
test('streaming response', async ({ mockPage, emitEvent }) => {
  await emitEvent('chat:sending', { session_id: 's1', worktree_id: 'wt1' })
  await emitEvent('chat:chunk', { session_id: 's1', content: 'Hello ' })
  await emitEvent('chat:done', { session_id: 's1', worktree_id: 'wt1' })
})
```

**When adding a new Tauri command:**

1. Add a default JSON-serializable response to `e2e/fixtures/invoke-handlers.ts`.
2. If the command is stateful, add a dynamic handler in `e2e/fixtures/tauri-mock.ts`.

## Rust Testing

Rust tests are co-located inside source files under `#[cfg(test)]` modules:

```rust
// src-tauri/src/chat/types.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_thinking_level_is_enabled() {
        assert!(!ThinkingLevel::Off.is_enabled());
        assert!(ThinkingLevel::Think.is_enabled());
    }

    #[test]
    fn test_thinking_level_serialization() {
        assert_eq!(
            serde_json::to_string(&ThinkingLevel::Off).unwrap(),
            "\"off\""
        );
    }
}
```

Async Rust tests use `#[tokio::test]`:

```rust
#[tokio::test]
async fn test_file_operations() {
    let temp_dir = tempfile::TempDir::new().unwrap();
    // ...
}
```

Run with `bun run rust:test` (`cargo test` in `src-tauri/`).

Notable Rust test locations:

- `src-tauri/src/lib.rs` — preference defaults / migrations / HTTP bind host logic.
- `src-tauri/src/chat/types.rs` — enum serialization, thinking/effort levels.
- `src-tauri/src/http_server/server.rs` and `dispatch.rs` — HTTP dispatch and WebSocket behavior.
- `src-tauri/src/projects/types.rs` and `storage.rs` — project / worktree type logic.

## Coverage

There is **no coverage provider or threshold configured** in the repo. `bun run test:coverage` invokes `vitest run --coverage`, but it requires installing a provider such as `@vitest/coverage-v8` first. No coverage gate is enforced in `check:all`.

## Quality Gates

- `bun run check:all` runs, in order:
  1. `bun run typecheck`
  2. `bun run lint`
  3. `bun run rust:fmt:check`
  4. `bun run rust:clippy`
  5. `bun run test:run`
  6. `bun run rust:test`
- `bun run fix:all` applies auto-fixes for lint, Prettier, `cargo fmt`, and Clippy.
- Prefer to run `bun run check:all` after significant changes, per `AGENTS.md`.

---

*Testing analysis: 2026-06-28*
