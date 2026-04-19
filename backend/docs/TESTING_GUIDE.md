# Backend Testing Guide

This guide explains how backend tests are structured, how to run them, and how to add new tests consistently.

## Test stack

- Runner: Vitest
- Environment: Node
- Global setup/mocks: `src/tests/setup.ts`
- Coverage provider: V8

## Test folder structure

```text
backend/src/tests/
├── setup.ts
├── controller-coverage.test.ts
├── route-contracts.test.ts
├── controllers/
│   ├── admin.controller.branches.test.ts
│   ├── auth.controller.branches.test.ts
│   ├── boarding.controller.branches.test.ts
│   ├── chat.controller.branches.test.ts
│   ├── issue.controller.branches.test.ts
│   ├── marketplace.controller.branches.test.ts
│   ├── payment.controller.branches.test.ts
│   ├── rentalPeriod.controller.branches.test.ts
│   ├── reservation.controller.branches.test.ts
│   ├── review.controller.branches.test.ts
│   ├── savedBoarding.controller.branches.test.ts
│   ├── user.controller.branches.test.ts
│   └── visitRequest.controller.branches.test.ts
└── helpers/
    └── controller-test-utils.ts
```

## Current test layers

1. Controller export/smoke checks
   - File: `src/tests/controller-coverage.test.ts`
   - Purpose: verifies handlers are exported and invokable.

2. Route contract checks
   - File: `src/tests/route-contracts.test.ts`
   - Purpose: verifies expected routes/methods are registered.

3. Controller branch tests (split by controller)
   - Files: `src/tests/controllers/*.controller.branches.test.ts`
   - Purpose: validates key success/error/authorization/validation branches.

## Run tests

From `backend/`:

```bash
pnpm test
```

Coverage report:

```bash
pnpm test:coverage
```

Watch mode:

```bash
pnpm test:watch
```

## Coverage reporting docs

- Coverage snapshot: `backend/docs/CONTROLLER_COVERAGE_SNAPSHOT.md`

Use this snapshot to pick the next highest-impact controllers and branches.

## How to add a new controller branch test file

1. Create `src/tests/controllers/<name>.controller.branches.test.ts`.
2. Reuse shared helpers from `src/tests/helpers/controller-test-utils.ts`:
   - `makeReq`
   - `makeRes`
   - `makeObjectId`
   - `queryResult`
3. Import controller handlers and model/service mocks.
4. Add deterministic branch cases:
   - authentication/authorization failures
   - invalid input validation
   - not-found/conflict cases
   - one or more stable success paths
5. Keep assertions focused on:
   - `next` called for error paths
   - `sendSuccess` or response shape for success paths
6. Run `pnpm test` and `pnpm test:coverage`.

## Conventions used in this repo

- One test file per controller for branch tests.
- Minimal mock setup per test case; avoid shared hidden state.
- `vi.clearAllMocks()` in `beforeEach`.
- Prefer clear test names in `it("...")` using action + expected outcome.

## Quick troubleshooting

- If a Mongoose chain test fails, use `queryResult(...)` for chainable methods (`populate`, `lean`, `sort`, etc.).
- If `sendSuccess` assertions fail, inspect whether controller writes via `res.status().json()` directly.
- If tests pass but coverage seems unchanged, ensure the new test actually reaches uncovered branches and rerun `pnpm test:coverage`.
