# Authentication API Documentation

## Base URL
```
/api/auth
```

## Overview
The Authentication API manages user registration, login, token refresh, email verification, and password reset. It uses JWT tokens for stateless authentication and refresh token rotation for security.

---

## Table of Contents
1. [Authentication Scheme](#authentication-scheme)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
6. [Token Management](#token-management)

---

## Authentication Scheme

### JWT Token Structure
- **Access Token:** Short-lived (15 minutes default), used for API requests
- **Refresh Token:** Long-lived (7 days default), used to obtain new access tokens
- **Header Format:** `Authorization: Bearer <accessToken>`

### Token Payload
```typescript
{
  userId: string,        // User's MongoDB ObjectId
  role: Role,           // STUDENT, OWNER, or ADMIN
  email: string,        // User's email address
  iat: number,          // Issued at (Unix timestamp)
  exp: number           // Expiration (Unix timestamp)
}
```

### Authorization Roles
- `STUDENT`: Can create reservations and view boarding listings
- `OWNER`: Can create and manage boarding listings
- `ADMIN`: Full system access

---

## Rate Limiting

| Endpoint | Limiter | Limit |
|----------|---------|-------|
| `/login` | loginLimiter | 5 attempts per 15 minutes |
| `/refresh` | refreshLimiter | 10 requests per 15 minutes |
| `/resend-verification`, `/forgot-password` | emailLimiter | 3 requests per 15 minutes |

---

## Enums & Constants

### Role
```typescript
enum Role {
  STUDENT = "STUDENT",
  OWNER = "OWNER",
  ADMIN = "ADMIN"
}
```

### Token Expiration Times
```typescript
ACCESS_TOKEN_EXPIRY = "15m"          // Access token expires in 15 minutes
REFRESH_TOKEN_EXPIRY = "7d"          // Refresh token expires in 7 days
EMAIL_VERIFICATION_EXPIRY = 86400000 // Email token expires in 24 hours (milliseconds)
PASSWORD_RESET_EXPIRY = 3600000      // Password reset token expires in 1 hour (milliseconds)
```

### Password Requirements
```typescript
MIN_PASSWORD_LENGTH = 8
REQUIRED_UPPERCASE = true
REQUIRED_NUMBER = true
SALT_ROUNDS = 10  // bcrypt salt rounds
```

---

## Error Responses

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `USER_ALREADY_EXISTS` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `USER_NOT_FOUND` | 404 | User account not found |
| `ACCOUNT_DEACTIVATED` | 403 | User account is deactivated |
| `TOKEN_EXPIRED` | 401 | Token has expired or is invalid |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Endpoints

### 1. Register

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account.

**Authentication:** ❌ Not required

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | ✅ | Valid email format, unique |
| `password` | string | ✅ | Min 8 chars, 1 uppercase, 1 number |
| `firstName` | string | ✅ | Min 1, Max 100 characters |
| `lastName` | string | ✅ | Min 1, Max 100 characters |
| `role` | string | ❌ | One of: STUDENT, OWNER, ADMIN (default: STUDENT) |
| `phone` | string | ❌ | Optional contact number |
| `university` | string | ❌ | University name (for students) |
| `nicNumber` | string | ❌ | National ID number |

**Request Example:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "ahmed.hassan@example.com",
  "password": "SecurePass123",
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "role": "STUDENT",
  "phone": "+94701234567",
  "university": "University of Colombo",
  "nicNumber": "123456789V"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "id": "507f1f77bcf86cd799439201",
    "email": "ahmed.hassan@example.com",
    "firstName": "Ahmed",
    "lastName": "Hassan",
    "role": "STUDENT",
    "isVerified": false,
    "isActive": true,
    "phone": "+94701234567",
    "university": "University of Colombo",
    "nicNumber": "123456789V",
    "profileImageUrl": null,
    "createdAt": "2026-04-06T08:30:00.000Z",
    "updatedAt": "2026-04-06T08:30:00.000Z"
  }
}
```

**Business Logic:**
- Validates unique email (case-insensitive)
- Hashes password using bcrypt (10 salt rounds)
- Creates user with `isVerified: false`
- Generates email verification token (expires in 24 hours)
- Sends verification email asynchronously
- Sets default role to STUDENT if not specified

**Validation Errors:**

Email already registered (409):
```json
{
  "success": false,
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "User already exists with this email"
  }
}
```

Invalid password (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must contain at least one uppercase letter"
  }
}
```

Invalid email format (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address"
  }
}
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive access and refresh tokens.

**Authentication:** ❌ Not required

**Rate Limited:** Yes (5 attempts per 15 minutes)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Request Example:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "ahmed.hassan@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkyMDEiLCJyb2xlIjoiU1RVREVOVCICLCJLJ2VtYWlsIjoiYWhtZWQuaGFzc2FuQGV4YW1wbGUuY29tIiwiaWF0IjoxNzE0OTgyNjAwLCJleHAiOjE3MTQ5ODM5MDB9.abc123...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "user": {
      "id": "507f1f77bcf86cd799439201",
      "email": "ahmed.hassan@example.com",
      "firstName": "Ahmed",
      "lastName": "Hassan",
      "role": "STUDENT",
      "isVerified": true,
      "isActive": true,
      "phone": "+94701234567",
      "university": "University of Colombo",
      "nicNumber": "123456789V",
      "profileImageUrl": null,
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T08:30:00.000Z"
    }
  }
}
```

**Business Logic:**
- Validates email and password
- Checks account is active (not deactivated)
- Generates 15-minute access token
- Generates 7-day refresh token
- Stores hashed refresh token in database
- Returns user info and both tokens

**Error Responses:**

Invalid credentials (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

Account deactivated (403):
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DEACTIVATED",
    "message": "Your account has been deactivated"
  }
}
```

Rate limit exceeded (429):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later."
  }
}
```

---

### 3. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Obtain a new access token using a valid refresh token.

**Authentication:** ❌ Not required

**Rate Limited:** Yes (10 requests per 15 minutes)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Request Example:**
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkyMDEiLCJyb2xlIjoiU1RVREVOVCICLCJLJ2VtYWlsIjoiYWhtZWQuaGFzc2FuQGV4YW1wbGUuY29tIiwiaWF0IjoxNzE0OTgyNjAwLCJleHAiOjE3MTQ5ODM5MDB9.xyz789...",
    "refreshToken": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3"
  }
}
```

**Business Logic:**
- Validates refresh token exists and is not revoked
- Revokes old refresh token (replaces it)
- Generates new access token (15 minutes)
- Generates new refresh token (7 days)
- Uses MongoDB transaction for atomicity
- Both tokens are validated against database

**Refresh Token Rotation:**
- Old token is marked as revoked
- New token is linked to old token via `replacedByTokenId`
- Only one refresh token can be active per session

**Error Responses:**

Invalid refresh token (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Refresh Token is Invalid or Revoked"
  }
}
```

User not found (404):
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

Account deactivated (403):
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DEACTIVATED",
    "message": "Your account has been deactivated"
  }
}
```

---

### 4. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Revoke a refresh token (logout).

**Authentication:** ❌ Not required

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Request Example:**
```bash
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged Out Successfully",
  "data": null
}
```

**Business Logic:**
- Hashes the refresh token
- Finds matching token record in database
- Marks token as revoked with current timestamp
- Token cannot be used for refresh after this

**Error Responses:**

Invalid refresh token (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Refresh token is required"
  }
}
```

---

### 5. Verify Email

**Endpoint:** `GET /api/auth/verify-email?token=<token>`

**Description:** Verify user's email address using verification token (typically from email link).

**Authentication:** ❌ Not required

**Query Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `token` | string | ✅ |

**Request Example:**
```bash
GET /api/auth/verify-email?token=abc123def456ghi789jkl012
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email Verified Successfully",
  "data": null
}
```

**Business Logic:**
- Retrieves verification token from database
- Validates token hasn't expired
- Marks user as verified (`isVerified: true`)
- Deletes the verification token
- Uses MongoDB transaction for consistency

**Error Responses:**

Token missing (401):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Verification Token is Missing"
  }
}
```

Invalid token (401):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Invalid or Expired Verification Token"
  }
}
```

Token expired (401):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Verification token has expired"
  }
}
```

---

### 6. Resend Verification Email

**Endpoint:** `POST /api/auth/resend-verification`

**Description:** Send a new verification email to user.

**Authentication:** ❌ Not required

**Rate Limited:** Yes (3 requests per 15 minutes)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

**Request Example:**
```bash
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "ahmed.hassan@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If that email exists and is unverified, a new link has been sent.",
  "data": null
}
```

**Business Logic:**
- Checks if user exists and is unverified
- Revokes all existing verification tokens
- Generates new verification token (expires in 24 hours)
- Sends verification email asynchronously
- Returns generic message to prevent user enumeration
- Only sends email if account exists and is unverified

**Security Note:**
- Always returns success message regardless of whether account exists
- This prevents attackers from enumerating registered emails

**Error Responses:**

None specific (generic message always returned to prevent enumeration)

---

### 7. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Initiate password reset by sending reset email.

**Authentication:** ❌ Not required

**Rate Limited:** Yes (3 requests per 15 minutes)

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

**Request Example:**
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "ahmed.hassan@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If that email is registered, a password reset link has been sent.",
  "data": null
}
```

**Business Logic:**
- Checks if user exists with given email
- Invalidates all existing password reset tokens
- Generates new reset token (expires in 1 hour)
- Sends reset email asynchronously
- Returns generic message to prevent user enumeration
- Only sends email if account exists

**Security Note:**
- Always returns success message
- Prevents attackers from enumerating registered emails
- Reset tokens are single-use

**Email Link Format:**
```
https://yourdomain.com/reset-password?token=<token>
```

---

### 8. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset user password using reset token.

**Authentication:** ❌ Not required

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `token` | string | ✅ | Valid reset token |
| `password` | string | ✅ | Min 8 chars, 1 uppercase, 1 number |

**Request Example:**
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456ghi789jkl012",
  "password": "NewSecurePass456"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password Reset Successfully",
  "data": null
}
```

**Business Logic:**
- Validates reset token exists and hasn't been used
- Checks token hasn't expired
- Hashes new password with bcrypt
- Updates user's password
- Marks reset token as used (prevents reuse)
- Revokes all refresh tokens (forces re-login on all devices)
- Uses MongoDB transaction for atomicity

**Security Features:**
- Tokens are single-use (`used: true`)
- Password change invalidates all sessions
- Old refresh tokens cannot be used after password reset

**Error Responses:**

Invalid token (401):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Invalid or expired reset token"
  }
}
```

Token expired (401):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Reset token has expired"
  }
}
```

Invalid password (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must contain at least one number"
  }
}
```

---

## Token Management

### Access Token Flow

```
1. User Logs In
   ↓
2. Server generates access token (15 min) + refresh token (7 days)
   ↓
3. Client stores both tokens
   ↓
4. Client includes access token in Authorization header: "Bearer <token>"
   ↓
5. Server validates access token
   ├─ Valid → Request proceeds
   └─ Expired/Invalid → Return 401 Unauthorized
```

### Token Refresh Flow

```
1. Access token expires (401 from API)
   ↓
2. Client sends refresh token to /auth/refresh
   ↓
3. Server validates refresh token
   ├─ Invalid/Revoked → Return 401
   └─ Valid → proceed
   ↓
4. Server revokes old refresh token
   ↓
5. Server generates new access token + new refresh token
   ↓
6. Client stores new tokens
   ↓
7. Client retries original request with new access token
```

### Token Revocation Events

Refresh tokens are revoked in the following scenarios:

1. **Logout** - User explicitly logs out
2. **Password Reset** - All tokens revoked (security)
3. **Account Deactivation** - Prevents further access
4. **Token Refresh** - Old token revoked, new one issued
5. **Admin Action** - Manual revocation

### Storing Tokens Safely

**Client-Side (Frontend):**
```javascript
// DO: Store in memory or secure httpOnly cookie
localStorage.setItem('accessToken', accessToken);  // ⚠️ If no sensitive data
document.cookie = "accessToken=...;HttpOnly;Secure;SameSite=Strict";  // ✅ Better

// DON'T: Store in plain localStorage
sessionStorage.setItem('sensitiveToken', token);  // Vulnerable to XSS
```

**Using Tokens:**
```JavaScript
// Include in API requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};

fetch('/api/boardings/my-listings', { headers });
```

---

## Security Best Practices

### Password Security
1. **Bcrypt Hashing:** Passwords hashed with 10 salt rounds
2. **Strong Requirements:** Min 8 chars, uppercase, number
3. **Never Stored:** Raw passwords never stored or logged
4. **Comparison:** Timing-safe comparison via bcrypt

### Token Security
1. **Refresh Token Rotation:** Old token invalidated on each refresh
2. **Token Expiration:** Access tokens valid for 15 minutes only
3. **Token Revocation:** Tokens can be revoked (logout, password reset)
4. **Hashed Storage:** Refresh tokens hashed before database storage
5. **Single-Use Reset:** Password reset tokens are one-time use

### Email Verification
1. **Required for Full Access:** Some features may require verified email
2. **Token Expiration:** Verification tokens expire after 24 hours
3. **Rate Limited:** Resend verification limited to 3 per 15 minutes

### Account Security
1. **Deactivation:** Accounts can be deactivated but not deleted
2. **Login Attempts:** Rate limited to prevent brute force
3. **Session Invalidation:** Password change invalidates all sessions

### Error Handling
1. **Generic Messages:** "Invalid email or password" (don't reveal which)
2. **User Enumeration Prevention:** Forgot password returns same message
3. **Rate Limiting:** Protects against abuse

---

## Example Workflows

### Workflow 1: Complete Authentication

```bash
# Step 1: Register new account
POST /api/auth/register
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"
}
# Response: 201 Created, user created but not verified

# Step 2: User clicks verification link in email
GET /api/auth/verify-email?token=<token_from_email>
# Response: 200 OK, user now verified

# Step 3: Login
POST /api/auth/login
{
  "email": "newuser@example.com",
  "password": "SecurePass123"
}
# Response: 200 OK, access + refresh tokens

# Step 4: Make authenticated request
GET /api/boardings
Authorization: Bearer <accessToken>
# Response: 200 OK, returns boardings

# Step 5: (After 15 mins) Access token expires
GET /api/boardings
Authorization: Bearer <expiredAccessToken>
# Response: 401 Unauthorized

# Step 6: Refresh access token
POST /api/auth/refresh
{
  "refreshToken": "<refreshToken>"
}
# Response: 200 OK, new access + refresh tokens

# Step 7: Retry original request
GET /api/boardings
Authorization: Bearer <newAccessToken>
# Response: 200 OK, returns boardings
```

### Workflow 2: Password Reset

```bash
# Step 1: User forgets password
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
# Response: 200 OK, email sent if account exists

# Step 2: User clicks reset link in email
# Link format: https://yourdomain.com/reset?token=<token>

# Step 3: Submit new password
POST /api/auth/reset-password
{
  "token": "<token_from_email>",
  "password": "NewSecurePass789"
}
# Response: 200 OK, password changed

# Step 4: All existing sessions invalidated
# User must login again on all devices
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "NewSecurePass789"
}
# Response: 200 OK, new tokens issued
```

### Workflow 3: Email Verification Resend

```bash
# Step 1: User didn't receive verification email
POST /api/auth/resend-verification
{
  "email": "user@example.com"
}
# Response: 200 OK, new email sent if unverified

# Step 2: User clicks new verification link
GET /api/auth/verify-email?token=<new_token_from_email>
# Response: 200 OK, email verified
```

---

## Common Validation Rules

### Email
- **Requirement:** Required, unique
- **Format:** Valid email format (RFC 5322)
- **Storage:** Stored in lowercase
- **Enforcement:** Case-insensitive uniqueness

### Password
- **Requirement:** Required
- **Length:** Minimum 8 characters
- **Uppercase:** At least 1 uppercase letter (A-Z)
- **Number:** At least 1 digit (0-9)
- **Hashing:** Bcrypt with 10 salt rounds
- **Never:** Not stored in plain text

### Name Fields
- **First Name:** 1-100 characters
- **Last Name:** 1-100 characters
- **Required:** Both required

---

## Data Models

### User Fields

```typescript
{
  id: ObjectId,
  email: string,                // Unique, lowercase
  passwordHash: string,         // Bcrypt hashed
  firstName: string,            // 1-100 chars
  lastName: string,             // 1-100 chars
  role: Role,                   // STUDENT, OWNER, ADMIN
  phone?: string,               // Optional
  university?: string,          // Optional
  nicNumber?: string,           // Optional
  profileImageUrl?: string,     // Optional
  isVerified: boolean,          // Default: false
  isActive: boolean,            // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Refresh Token Fields

```typescript
{
  id: ObjectId,
  userId: ObjectId,             // Reference to User
  tokenHash: string,            // SHA-256 hashed token
  expiresAt: Date,              // Expiration time
  revokedAt?: Date,             // Revocation time if revoked
  replacedByTokenId?: ObjectId, // New token if refreshed
  createdAt: Date,
  updatedAt: Date
}
```

### Email Verification Token Fields

```typescript
{
  id: ObjectId,
  userId: ObjectId,             // Reference to User
  token: string,                // Raw token sent via email
  expiresAt: Date,              // Expires in 24 hours
  createdAt: Date,
  updatedAt: Date
}
```

### Password Reset Token Fields

```typescript
{
  id: ObjectId,
  userId: ObjectId,             // Reference to User
  token: string,                // Raw token sent via email
  expiresAt: Date,              // Expires in 1 hour
  used: boolean,                // Default: false (single-use)
  createdAt: Date,
  updatedAt: Date
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid email or password" | Verify email is registered and password is correct |
| "User already exists" | Use forgot-password if you forgot password, or login if you have account |
| "Email verification token expired" | Request new verification email using /resend-verification |
| "Account deactivated" | Contact support to reactivate account |
| "Too many login attempts" | Wait 15 minutes before trying again |
| "Refresh token invalid" | Login again to get new tokens |
| "Password must contain uppercase" | Include at least one A-Z character |
| "Token expired" on password reset | Request new reset link if link is older than 1 hour |

---

## Security Features Summary

✅ **Implemented:**
- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- Refresh token rotation
- Token revocation on logout/password reset
- Email verification for account security
- Rate limiting on sensitive endpoints
- SQL-injection prevention (using ODM)
- User enumeration prevention
- Single-use password reset tokens
- Secure password reset flow
- Account deactivation (not deletion)

⚠️ **Client Responsibility:**
- Store access tokens securely (preferably httpOnly cookies)
- Include tokens in Authorization header
- Handle token refresh automatically
- Clear tokens on logout

---

## Dependencies & Integrations

### Libraries Used
- **bcryptjs:** Password hashing
- **jsonwebtoken:** JWT token generation/validation
- **mongoose:** MongoDB ODM
- **zod:** Schema validation
- **express:** Web framework
- **nodemailer:** Email sending

### External Services
- **Email Service:** For verification and password reset emails
- **MongoDB:** User and token storage

---

## Rate Limiting Summary

```
Login Endpoint:           5 attempts per 15 minutes
Refresh Endpoint:         10 requests per 15 minutes
Email-Related:           3 requests per 15 minutes
  ├─ Resend Verification
  ├─ Forgot Password
  └─ Password Reset

Other endpoints: No specific limit (global rate limit applies)
```

---

## Changelog & Version History

- **v1.0.0 (2026-04-06)**: Initial Authentication API release
  - User registration and login
  - JWT token management
  - Email verification
  - Password reset flow
  - Token refresh and rotation
  - Rate limiting and security

---

## Support & Contact

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Security Best Practices](#security-best-practices)
- Verify [Example Workflows](#example-workflows)
- Consult [Token Management](#token-management) for auth flows
- Contact development team for additional support
