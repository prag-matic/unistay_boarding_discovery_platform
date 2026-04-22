# Boarding Lifecycle & Governance Specification

Version: `2026-04-20`

## Authoritative state model

States:
- `DRAFT`
- `PENDING_APPROVAL`
- `ACTIVE`
- `INACTIVE`
- `REJECTED`

Archive is modeled via `isDeleted` + `archivedAt` + `archivedBy` (soft-archive).

## Visibility & eligibility rules

- Public listing visibility: `ACTIVE` + `isDeleted=false`
- Reservation eligibility: `ACTIVE` + `isDeleted=false`
- Moderation queue: `PENDING_APPROVAL` + `isDeleted=false`

## Editing policy

Policy: `AUTO_UNPUBLISH_AND_REVIEW`

When owners edit an `ACTIVE` listing, it is automatically transitioned to `PENDING_APPROVAL` and hidden from public discovery until admin approval.

## Transition governance

Owner:
- Update: `DRAFT | REJECTED | INACTIVE | ACTIVE`
- Submit for review: `DRAFT | REJECTED | INACTIVE -> PENDING_APPROVAL` (requires at least 1 image)
- Permanent delete: `DRAFT -> deleted from DB` (owner-only)
- Deactivate: `ACTIVE -> INACTIVE`
- Reactivate: `INACTIVE -> ACTIVE`
- Archive: allowed from `DRAFT | REJECTED | INACTIVE | ACTIVE` (`isDeleted=true`)
- Restore: allowed from archived listings (`isDeleted=false`)

Admin:
- Approve: `PENDING_APPROVAL -> ACTIVE`
- Reject: `PENDING_APPROVAL -> REJECTED` (requires reason)
- Reopen: `REJECTED -> DRAFT`

## Auditability

Every status transition is written to `BoardingStatusHistory` with:
- `fromStatus`
- `toStatus`
- `action`
- `actorRole`
- `actorId`
- `reason`/`note`
- timestamps

Moderation metadata is persisted on `Boarding`:
- `rejectionReason`
- `rejectionHistory[]`
- `lastModeratedBy`
- `lastModerationNote`
- `lastModeratedAt`
