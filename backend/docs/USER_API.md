# User API (Frontend)

## Base URL

```txt
http://localhost:3000/api
```

## Route Prefix

```txt
/api/users
```

## Authentication

All user endpoints require access token authentication.

```http
Authorization: Bearer <access-token>
```

> Route middleware applies both `userLimiter` and `authenticate` to all `/api/users/*` routes.

## Common Success Envelope

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

## Common Error Envelope

```json
{
  "success": false,
  "error": "UnauthorizedError",
  "message": "No Token Provided",
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 1) Get Current User Profile

- **Endpoint:** `GET /api/users/me`
- **Auth:** required

### Success (200)

Returns the authenticated user object without `passwordHash`.

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "cmx123...",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "0771234567",
    "role": "STUDENT",
    "profileImageUrl": null,
    "isActive": true,
    "createdAt": "2026-03-10T09:00:00.000Z",
    "updatedAt": "2026-03-10T09:00:00.000Z"
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

### Common Errors

- `401` if token missing/invalid.
- `404` if user no longer exists.

---

## 2) Update Current User Profile

- **Endpoint:** `PUT /api/users/me`
- **Auth:** required
- **Content-Type:** `application/json`

### Request Body (all optional)

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "0771234567",
  "nicNumber": "200012345678",
  "university": "SLIIT",
  "studyYear": 2,
  "degree": "BSc IT",
  "role": "STUDENT"
}
```

### Validation Rules

From `updateUserSchema`:

- `firstName`: optional string, min 1, max 50
- `lastName`: optional string, min 1, max 50
- `phone`: optional string
- `nicNumber`: optional string
- `university`: optional string
- `studyYear`: optional integer, min 1, max 5
- `degree`: optional string
- `role`: optional enum (`STUDENT` | `OWNER`)
- `email`, `gender`, `dateOfBirth` are also accepted by schema (all optional)

### Success (200)

```json
{
  "success": true,
  "message": "Profile Updated Successfully",
  "data": {
    "id": "cmx123...",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com"
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 3) Change Current User Password

- **Endpoint:** `PUT /api/users/me/password`
- **Auth:** required
- **Content-Type:** `application/json`

### Request Body

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

### Validation Rules

- `currentPassword`: required string, min length 1
- `newPassword`:
  - min 8 characters
  - must contain at least one uppercase letter
  - must contain at least one number

### Success (200)

```json
{
  "success": true,
  "message": "Password Changed Successfully",
  "data": null,
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

### Common Errors

- `404` when current password is incorrect (`InvalidCredentialsError`).
- `401` when unauthenticated.

---

## 4) Upload/Update Profile Image

- **Endpoint:** `PUT /api/users/me/profile-image`
- **Auth:** required
- **Content-Type:** `multipart/form-data`

### Multipart Field

- `profileImage` (required file)

### Upload Rules

Configured by `uploadProfileImageMiddleware`:

- Max file size: `5 MB`
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`
- File is uploaded through Cloudinary helper and saved as `profileImageUrl`

### Example cURL

```bash
curl -X PUT http://localhost:3000/api/users/me/profile-image \
  -H "Authorization: Bearer <access-token>" \
  -F "profileImage=@/path/to/avatar.jpg"
```

### Success (200)

```json
{
  "success": true,
  "message": "Profile image updated",
  "data": {
    "profileImageUrl": "https://..."
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

### Common Errors

- `422` when no file is provided.
- `400` when file type/size is invalid.

---

## Quick Endpoint List

- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`
- `PUT /api/users/me/profile-image`

---

## Notes for Frontend

- Always send `Authorization: Bearer <access-token>` for these routes.
- API response envelope always includes `timestamp`.
- User objects returned from these endpoints are sanitized (no password hash).
