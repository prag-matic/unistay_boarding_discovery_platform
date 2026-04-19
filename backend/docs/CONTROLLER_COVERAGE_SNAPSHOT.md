# Controller Coverage Snapshot (2026-04-19)

Generated from `pnpm test:coverage` using Vitest v8 coverage.

## Current status

- Test files: 3 passed
- Tests: 50 passed
- Overall statements: 40.26%
- Overall branches: 39.44%
- Controllers statements: 66.90%
- Controllers branches: 37.02%

## Per-controller coverage (ranked by statements)

| Controller | Statements | Branches |
|---|---:|---:|
| src/controllers/reservation.controller.ts | 49.10% | 43.48% |
| src/controllers/chat.controller.ts | 54.00% | 28.42% |
| src/controllers/visitRequest.controller.ts | 54.20% | 44.00% |
| src/controllers/issue.controller.ts | 60.82% | 44.19% |
| src/controllers/payment.controller.ts | 62.80% | 31.25% |
| src/controllers/auth.controller.ts | 64.04% | 41.03% |
| src/controllers/marketplace.controller.ts | 72.79% | 39.39% |
| src/controllers/boarding.controller.ts | 72.97% | 32.81% |
| src/controllers/admin.controller.ts | 75.37% | 28.68% |
| src/controllers/savedBoarding.controller.ts | 82.65% | 50.00% |
| src/controllers/review.controller.ts | 83.47% | 42.65% |
| src/controllers/user.controller.ts | 89.52% | 36.00% |
| src/controllers/rentalPeriod.controller.ts | 95.83% | 70.00% |

## Highest-impact next branch targets

1. reservation.controller.ts
   - remaining high-value: approve/reject/cancel transitions, expiry/full checks, ownership checks
2. chat.controller.ts
   - remaining high-value: getChatRooms cursor branch, getChatHistory pagination branch, message flows
3. payment.controller.ts
   - uncovered clusters: 25-26, 28-28, 30-32, 34-36, 38-38, 40-44, 46-49, 67-68
4. visitRequest.controller.ts
   - remaining high-value: availability date-range edge cases + approve overlap/expiry + cancel invalid-status
5. issue.controller.ts
   - remaining high-value: owner access branches, assignment validation, analyze/create message-not-found paths

## Recommended next test additions

- Reservation
   - approve/reject/cancel: ownership, expiry, and invalid status transitions
- Chat
   - getChatRooms/getChatHistory cursor-pagination branches
   - sendMessage flows with participant validation and state updates
- Visit Request
   - availability query edge cases + overlap conflicts
   - approve/reject/cancel lifecycle status transitions and expiry
- Issue
   - owner access validation for getIssue
   - update assignment/status/priority invalid cases + analyze/create message-not-found
- Payment
  - logPayment: paidAt future, amount bounds, already-paid conflict
  - confirm/reject payment with owner authorization checks
