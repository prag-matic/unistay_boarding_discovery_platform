# Boarding Listing Module

## Route Scope

- Prefix: `/api/boardings`
- Base middleware: `boardingLimiter`
- Owner-only endpoints require `authenticate` + `requireRole('OWNER')`

## Business Logic

### Public Browsing

- `GET /`
  - Returns only boardings where `status = ACTIVE` and `isDeleted = false`
  - Supports filtering and sorting
- `GET /:slug`
  - Returns active, non-deleted boarding by slug

### Owner Listing Management

- `GET /my-listings`
  - Returns owner’s non-deleted listings
- `POST /`
  - Creates listing with generated unique slug
  - Rejects when `currentOccupants > maxOccupants`
- `PUT /:id`
  - Owner-only update; cannot update others’ listings
  - Replaces rules/amenities when provided
  - If listing was `ACTIVE`, update sets status back to `PENDING_APPROVAL`
  - Regenerates slug when title changes

### Lifecycle / Moderation Flow

- `PATCH /:id/submit`
  - Allowed statuses: `DRAFT | REJECTED | INACTIVE`
  - Requires at least 1 uploaded image
  - Sets status to `PENDING_APPROVAL`
- `PATCH /:id/deactivate`
  - Allowed only from `ACTIVE`
- `PATCH /:id/activate`
  - Allowed only from `INACTIVE`

### Image Management

- `POST /:id/images`
  - Uploads images to Cloudinary
  - Enforces total image count limit (`MAX_BOARDING_IMAGES = 8`)
- `DELETE /:id/images/:imageId`
  - Deletes Cloudinary asset + DB image record

## Validation Rules

### Query Validation

`GET /` uses `searchBoardingsQuerySchema`:

- `page`: positive int (default `1`)
- `size`: positive int, max `100` (default `20`)
- `city`, `district`, `nearUniversity`, `search`: optional strings
- `minRent`, `maxRent`: optional positive ints
- `boardingType`: `SINGLE_ROOM | SHARED_ROOM | ANNEX | HOUSE`
- `genderPref`: `MALE | FEMALE | ANY`
- `amenities`: parsed from comma-separated or array, normalized + validated
- `sortBy`: `monthlyRent | createdAt` (default `createdAt`)
- `sortDir`: `asc | desc` (default `desc`)

### Body Validation

`POST /` uses `createBoardingSchema`:

- Required: `title`, `description`, `city`, `district`, `monthlyRent`, `boardingType`, `genderPref`, `latitude`, `longitude`, `maxOccupants`
- `title`: 10..200
- `description`: 30..5000
- `monthlyRent`: int 1000..500000
- `latitude`: 5.9..9.9, `longitude`: 79.5..81.9
- `maxOccupants`: int 1..20
- `currentOccupants`: int >= 0 (default 0)
- `amenities`: normalized to enum values and deduplicated

`PUT /:id` uses `updateBoardingSchema` (all optional, same ranges/enums).

### File Validation

`POST /:id/images` uses `uploadBoardingImageMiddleware`:

- Allowed: JPEG/PNG/WebP
- Max size: `5MB` each
- Max files per upload + existing total cannot exceed 8

## Common Errors

- `401 UnauthorizedError`
- `403 ForbiddenError`
- `404 BoardingNotFoundError`
- `422 ValidationError | InvalidStateTransitionError`
