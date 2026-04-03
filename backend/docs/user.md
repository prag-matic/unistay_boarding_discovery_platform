# User Module

## Route Scope

- Prefix: `/api/users`
- Middleware: `userLimiter` + `authenticate`

## Business Logic

### Profile

- `GET /me`
  - Returns current authenticated user
  - Removes `passwordHash` from response
- `PUT /me`
  - Updates profile fields for authenticated user
  - Controller currently applies: `firstName`, `lastName`, `phone`, `university`, `nicNumber`

### Password

- `PUT /me/password`
  - Verifies `currentPassword` with bcrypt
  - Hashes and stores `newPassword` with configured salt rounds
  - Rejects if current password is incorrect

### Profile Image

- `PUT /me/profile-image`
  - Uploads image to Cloudinary
  - Saves resulting URL to `profileImageUrl`

## Validation Rules

### Body Validation

- `PUT /me` uses `updateUserSchema`:
  - Optional: `firstName`, `lastName`, `email`, `phone`, `nicNumber`, `gender`, `dateOfBirth`, `university`, `studyYear`, `degree`, `role`
  - `studyYear`: int `1..5`
  - `role`: `STUDENT | OWNER`
- `PUT /me/password` uses `changePasswordSchema`:
  - `currentPassword`: required
  - `newPassword`: min 8 chars, at least one uppercase letter, at least one number

### File Validation

`PUT /me/profile-image` uses `uploadProfileImageMiddleware`:

- Allowed MIME: `image/jpeg`, `image/jpg`, `image/png`
- Max size: `5MB`
- Single file field: `profileImage`

### Runtime Validation / Guards

- All routes require valid access token
- Missing user record -> `UserNotFoundError`
- Missing profile image file -> validation error

## Common Errors

- `401 UnauthorizedError`
- `404 UserNotFoundError | InvalidCredentialsError` (wrong current password)
- `422 ValidationError`
