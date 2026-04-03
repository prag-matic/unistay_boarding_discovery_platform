# Review Module

## Route Scope

- Prefix: `/api/reviews`
- Uses upload middleware for create/update review media
- Identity resolution supports:
  - `req.user.userId` (when auth middleware is present)
  - `x-user-id` header fallback
  - Bearer token fallback parsed in controller

## Business Logic

### Review CRUD

- `POST /`
  - Creates review with optional image/video uploads
  - Stores uploaded media URLs (Cloudinary)
- `GET /:id`
  - Returns review with selected boarding/student + comments
- `PUT /:id`
  - Owner-only update (review author)
  - One-time edit rule (`editedAt` must be null)
  - Replaces images/video if new files provided
- `DELETE /:id`
  - Owner-only delete (review author)
  - Deletes associated media assets where possible

### Review Queries / Stats

- `GET /boarding/:boardingId`
  - Paginated list (`page`, `limit`)
  - Sort by `rating` or `commentedAt`
- `GET /boarding/:boardingId/stats`
  - Returns total reviews, average rating, and 1..5 distribution

### Reactions

- `POST /:id/reactions` and `POST /comments/:id/reactions`
  - Toggle behavior:
    - same reaction twice => remove
    - different reaction => change
  - Updates like/dislike counts

### Comments

- `POST /:id/comments`
  - Adds comment on review
- `PUT /comments/:id`
  - One-time edit rule for comment owner
- `DELETE /comments/:id`
  - Owner-only delete (comment author)

## Validation Rules

### Body Validation

Create/Update review parses multipart `data` JSON against schema:

- `createReviewSchema`
  - `boardingId`: required CUID
  - `rating`: int `1..5`
  - `comment`: optional/nullable, max 1000
  - `images`: optional array of URL strings, max 5
  - `video`: optional/nullable URL

- `updateReviewSchema`
  - partial of review schema (all fields optional)

Comment and reaction validation:

- `POST /:id/comments`
  - `comment`: required, 1..500 chars
- `PUT /comments/:id`
  - `updateReviewCommentSchema`: `comment` required, 1..500 chars
- Reaction endpoints use `reactionSchema`
  - `type`: `LIKE | DISLIKE`

### File Validation

Review upload middleware rules:

- `images`: max 5 files
- `video`: max 1 file
- max size: 10MB per file
- allowed image MIME: `jpeg/png/gif/webp`
- allowed video MIME: `mp4/webm/quicktime`
- also accepts `application/octet-stream` for video when extension is valid (`.mp4/.webm/.mov/.mkv/.avi`)

### Runtime Validation / Guards

- Missing identity -> `BadRequestError('User ID is required')`
- Invalid multipart JSON -> `BadRequestError('Invalid JSON in form field \'data\'')`
- Service errors mapped to API errors for not found, forbidden ownership, and one-time edit violations

## Common Errors

- `400 BadRequestError`
- `401 UnauthorizedError` (when auth middleware is used)
- `403 ForbiddenError`
- `404 NotFoundError`
- `422 ValidationError`
