# Test Cases — UniStay Boarding Discovery Platform

This document lists every test case in the backend test suite (`backend/src/tests/`).  
**Total: 450 tests across 27 test files.**

All tests are written with [Vitest](https://vitest.dev/) and run with:
```bash
cd backend
npm test          # watch mode
npm run test:run  # single run (CI)
```

---

## Table of Contents

| Category | File | Tests |
|---|---|---|
| **Error Classes** | [AppError.test.ts](#apperror) | 24 |
| **Utilities** | [hash.test.ts](#hash) | 7 |
| | [jwt.test.ts](#jwt) | 12 |
| | [slug.test.ts](#slug) | 8 |
| | [utils.test.ts](#utils) | 19 |
| | [response.test.ts](#response) | 7 |
| **Middleware** | [auth.middleware.test.ts](#auth-middleware) | 7 |
| | [validate.middleware.test.ts](#validate-middleware) | 9 |
| | [upload.middleware.test.ts](#upload-middleware) | 8 |
| | [errorHandler.test.ts](#error-handler) | 10 |
| **Validators** | [auth.validators.test.ts](#auth-validators) | 23 |
| | [boarding.validators.test.ts](#boarding-validators) | 27 |
| | [payment.validators.test.ts](#payment-validators) | 17 |
| | [reservation.validators.test.ts](#reservation-validators) | 8 |
| | [user.validators.test.ts](#user-validators) | 18 |
| | [visitRequest.validators.test.ts](#visitrequest-validators) | 10 |
| **Services** | [review.service.test.ts](#review-service) | 34 |
| **Controllers** | [admin.controller.test.ts](#admin-controller) | 15 |
| | [auth.controller.test.ts](#auth-controller) | 27 |
| | [boarding.controller.test.ts](#boarding-controller) | 33 |
| | [payment.controller.test.ts](#payment-controller) | 20 |
| | [rentalPeriod.controller.test.ts](#rentalperiod-controller) | 6 |
| | [reservation.controller.test.ts](#reservation-controller) | 29 |
| | [review.controller.test.ts](#review-controller) | 28 |
| | [savedBoarding.controller.test.ts](#savedboarding-controller) | 6 |
| | [user.controller.test.ts](#user-controller) | 12 |
| | [visitRequest.controller.test.ts](#visitrequest-controller) | 26 |

---

## Error Classes

### AppError

**File:** `src/tests/AppError.test.ts` · **24 tests**

#### `AppError` (base class)
| # | Test | What it verifies |
|---|---|---|
| 1 | sets message, statusCode, and isOperational | Constructor stores all three properties correctly |
| 2 | respects custom isOperational=false | `isOperational` can be overridden to `false` |
| 3 | is an instance of Error and AppError | Class hierarchy — `instanceof Error` and `instanceof AppError` are both `true` |

#### `UserNotFoundError`
| # | Test | What it verifies |
|---|---|---|
| 4 | has 404 and default message | Status code is 404; default message text |
| 5 | accepts custom message | Constructor accepts a custom message string |

#### `UserAlreadyExistsError`
| # | Test | What it verifies |
|---|---|---|
| 6 | has 409 | Status code is 409 Conflict |

#### `InvalidCredentialsError`
| # | Test | What it verifies |
|---|---|---|
| 7 | has 404 | Status code is 404 (credential errors intentionally avoid 401 enumeration) |

#### `InvalidPasswordError`
| # | Test | What it verifies |
|---|---|---|
| 8 | has 401 | Status code is 401 Unauthorized |

#### `AccountDeactivatedError`
| # | Test | What it verifies |
|---|---|---|
| 9 | has 403 and correct message | Status code is 403; message indicates deactivated account |

#### `TokenExpiredError`
| # | Test | What it verifies |
|---|---|---|
| 10 | has 410 and default message | Status code is 410 Gone; default message text |
| 11 | accepts custom message | Constructor accepts a custom message string |

#### `UnauthorizedError`
| # | Test | What it verifies |
|---|---|---|
| 12 | has 401 | Status code is 401 |

#### `ForbiddenError`
| # | Test | What it verifies |
|---|---|---|
| 13 | has 403 | Status code is 403 |

#### `ValidationError`
| # | Test | What it verifies |
|---|---|---|
| 14 | has 422 and stores details | Status code is 422; `details` property is populated |
| 15 | details is undefined by default | `details` is `undefined` when not provided |

#### `BoardingNotFoundError`
| # | Test | What it verifies |
|---|---|---|
| 16 | has 404 | Status code is 404 |

#### `InvalidStateTransitionError`
| # | Test | What it verifies |
|---|---|---|
| 17 | has 422 | Status code is 422 Unprocessable Entity |

#### `SlugConflictError`
| # | Test | What it verifies |
|---|---|---|
| 18 | has 409 | Status code is 409 |

#### `GoneError`
| # | Test | What it verifies |
|---|---|---|
| 19 | has 410 | Status code is 410 |

#### `NotFoundError`
| # | Test | What it verifies |
|---|---|---|
| 20 | default resource name | Default message is `"Resource not found"` |
| 21 | custom resource name | Message is `"<Name> not found"` when a resource name is passed |

#### `BadRequestError`
| # | Test | What it verifies |
|---|---|---|
| 22 | has 400 | Status code is 400 |
| 23 | accepts custom message | Constructor accepts a custom message string |

#### `ConflictError`
| # | Test | What it verifies |
|---|---|---|
| 24 | has 409 | Status code is 409 |

---

## Utilities

### Hash

**File:** `src/tests/hash.test.ts` · **7 tests**

#### `sha256`
| # | Test | What it verifies |
|---|---|---|
| 1 | returns a 64-char hex string | Output is always 64 hex characters |
| 2 | is deterministic | Same input → same hash every time |
| 3 | different inputs give different hashes | Collisions do not occur for simple distinct inputs |
| 4 | handles empty string | Empty string produces a valid 64-char hash |

#### `generateSecureToken`
| # | Test | What it verifies |
|---|---|---|
| 5 | default is 64-char hex (32 bytes) | Default output length is 64 characters |
| 6 | custom byte count | Passing `48` bytes yields a 96-character hex string |
| 7 | generates unique tokens | Two consecutive calls return different values |

---

### JWT

**File:** `src/tests/jwt.test.ts` · **12 tests**

#### `signAccessToken / verifyAccessToken`
| # | Test | What it verifies |
|---|---|---|
| 1 | signs and verifies correctly | Round-trip sign → verify returns the original payload |
| 2 | throws on tampered token | Modified token causes a verification error |
| 3 | refresh token does not verify as access token | Tokens signed with different secrets are not interchangeable |

#### `signRefreshToken / verifyRefreshToken`
| # | Test | What it verifies |
|---|---|---|
| 4 | signs and verifies correctly | Round-trip sign → verify returns the original payload |
| 5 | throws on tampered token | Modified refresh token is rejected |

#### `decodeToken`
| # | Test | What it verifies |
|---|---|---|
| 6 | decodes without verifying | Payload can be read without signature verification |
| 7 | returns null for a malformed token | Garbage input returns `null` instead of throwing |

#### `parseDurationMs`
| # | Test | What it verifies |
|---|---|---|
| 8 | parses seconds (`30s`) | Returns 30 000 ms |
| 9 | parses minutes (`15m`) | Returns 900 000 ms |
| 10 | parses hours (`2h`) | Returns 7 200 000 ms |
| 11 | parses days (`30d`) | Returns 2 592 000 000 ms |
| 12 | defaults to seconds for unknown unit | `100x` is treated as `100` seconds |

---

### Slug

**File:** `src/tests/slug.test.ts` · **8 tests**

#### `buildSlug`
| # | Test | What it verifies |
|---|---|---|
| 1 | converts title to kebab-case with 6-char suffix | Generates a URL-safe slug from a title |
| 2 | strips special characters | Non-alphanumeric characters are removed |
| 3 | collapses multiple spaces/hyphens | Consecutive separators are normalised to a single hyphen |
| 4 | produces different slugs for same input | Random suffix ensures uniqueness per call |

#### `generateUniqueSlug`
| # | Test | What it verifies |
|---|---|---|
| 5 | returns a slug when no collision found | No DB lookup collision → slug returned on first attempt |
| 6 | retries on collision and returns a valid slug | Collision on first attempt → retries and succeeds |
| 7 | skips collision when the existing record has the excluded ID | Own record's slug is not treated as a collision (update flow) |
| 8 | throws AppError after max attempts | Exhausts max retries and throws `AppError` |

---

### Utils

**File:** `src/tests/utils.test.ts` · **19 tests**

#### `sanitizeUser`
| # | Test | What it verifies |
|---|---|---|
| 1 | removes password field | `password` is stripped from the returned object |
| 2 | keeps all other fields | All non-password fields are preserved |
| 3 | works when no password field exists | Safe to call on objects that don't have a password |

#### `generateRandomString`
| # | Test | What it verifies |
|---|---|---|
| 4 | default length is 32 | Returns a 32-character string by default |
| 5 | custom length | Returns a string of the requested length |
| 6 | only alphanumeric chars | Output matches `/^[A-Za-z0-9]+$/` |
| 7 | produces unique strings | Consecutive calls return different values |

#### `isValidEmail`
| # | Test | What it verifies |
|---|---|---|
| 8 | valid emails return true | Standard email formats are accepted |
| 9 | invalid emails return false | Malformed addresses are rejected |

#### `isValidPhone`
| # | Test | What it verifies |
|---|---|---|
| 10 | valid phone returns true | Standard phone numbers are accepted |
| 11 | short/empty phone returns false | Strings that are too short or empty are rejected |

#### `calculatePagination`
| # | Test | What it verifies |
|---|---|---|
| 12 | computes totalPages correctly | `Math.ceil(total / limit)` logic |
| 13 | handles zero total | `totalPages` is 0 when there are no records |
| 14 | uses defaults | Default `page=1`, `limit=10` when omitted |

#### `isPastDate / isFutureDate`
| # | Test | What it verifies |
|---|---|---|
| 15 | isPastDate is true for past dates | A date in the past returns `true` |
| 16 | isPastDate is false for future dates | A date in the future returns `false` |
| 17 | isFutureDate is true for future dates | A date in the future returns `true` |
| 18 | isFutureDate is false for past dates | A date in the past returns `false` |

#### `formatDate`
| # | Test | What it verifies |
|---|---|---|
| 19 | returns ISO string | `formatDate` returns a valid ISO 8601 string |

---

### Response

**File:** `src/tests/response.test.ts` · **7 tests**

#### `sendSuccess`
| # | Test | What it verifies |
|---|---|---|
| 1 | sends 200 with success payload by default | Default status is 200; body has `success: true` |
| 2 | uses custom message and status code | Custom message and status code are applied |
| 3 | includes a valid ISO timestamp | `timestamp` field is a valid ISO 8601 string |

#### `sendError`
| # | Test | What it verifies |
|---|---|---|
| 4 | sends 500 by default | Default status is 500 |
| 5 | uses provided status code | Custom status code is applied |
| 6 | includes details when provided | `details` field is present when passed |
| 7 | omits details key when not provided | `details` key is absent from the response body |

---

## Middleware

### Auth Middleware

**File:** `src/tests/auth.middleware.test.ts` · **7 tests**

#### `authenticate`
| # | Test | What it verifies |
|---|---|---|
| 1 | passes UnauthorizedError when no auth header | Missing `Authorization` header → 401 |
| 2 | passes UnauthorizedError for non-Bearer scheme | Non-`Bearer` scheme is rejected |
| 3 | attaches user and calls next() for a valid token | Valid JWT → `req.user` populated; `next()` called |
| 4 | passes UnauthorizedError for a tampered token | Tampered JWT is rejected |

#### `requireRole`
| # | Test | What it verifies |
|---|---|---|
| 5 | passes UnauthorizedError when req.user is missing | No authenticated user → 401 |
| 6 | passes ForbiddenError when role is not allowed | User's role is not in the allowed list → 403 |
| 7 | calls next() when role is allowed | User's role is permitted → `next()` called |

---

### Validate Middleware

**File:** `src/tests/validate.middleware.test.ts` · **9 tests**

#### `validate (body)`
| # | Test | What it verifies |
|---|---|---|
| 1 | calls next() and replaces body on success | Valid body parsed by Zod schema; `req.body` replaced |
| 2 | sends 422 and does not call next() on failure | Invalid body sends 422 and stops the chain |

#### `validate (query)`
| # | Test | What it verifies |
|---|---|---|
| 3 | attaches parsed data to req.query | Valid query string attached to `req.query` |
| 4 | sends 422 for invalid query | Invalid query string sends 422 |

#### `validate (params)`
| # | Test | What it verifies |
|---|---|---|
| 5 | attaches parsed data to req.params | Valid route params attached to `req.params` |
| 6 | sends 422 for missing param | Missing required param sends 422 |

#### Shorthand helpers
| # | Test | What it verifies |
|---|---|---|
| 7 | validateBody delegates correctly | `validateBody(schema)` targets `req.body` |
| 8 | validateQuery delegates correctly | `validateQuery(schema)` targets `req.query` |
| 9 | validateParams delegates correctly | `validateParams(schema)` targets `req.params` |

---

### Upload Middleware

**File:** `src/tests/upload.middleware.test.ts` · **8 tests**

#### `MAX_BOARDING_IMAGES`
| # | Test | What it verifies |
|---|---|---|
| 1 | is 8 | Constant value is `8` |

#### `validateReviewFiles`
| # | Test | What it verifies |
|---|---|---|
| 2 | calls next() when no files attached | No files → middleware passes through |
| 3 | calls next() for valid image mimetypes | JPEG/PNG/WebP images are accepted |
| 4 | returns 400 for an invalid image mimetype | Non-image MIME type on an image field sends 400 |
| 5 | calls next() for valid video mimetypes | MP4/WebM videos are accepted |
| 6 | calls next() for application/octet-stream with a recognised video extension | `.mp4` / `.webm` binary uploads are treated as video |
| 7 | returns 400 for application/octet-stream with a non-video extension | `.exe` binary upload is rejected |
| 8 | returns 400 for an invalid video mimetype | Non-video MIME type on a video field sends 400 |

---

### Error Handler

**File:** `src/tests/errorHandler.test.ts` · **10 tests**

#### `errorHandler`
| # | Test | What it verifies |
|---|---|---|
| 1 | handles ZodError with 422 | Zod validation failures map to 422 Unprocessable Entity |
| 2 | handles JsonWebTokenError with 401 | JWT signature error maps to 401 Unauthorized |
| 3 | handles TokenExpiredError (JWT) with 401 | Expired JWT maps to 401 |
| 4 | handles Prisma P2002 with 409 | Unique constraint violation maps to 409 Conflict |
| 5 | handles Prisma P2025 with 404 | Record not found maps to 404 Not Found |
| 6 | handles Prisma P2003 with 400 | Foreign key constraint failure maps to 400 Bad Request |
| 7 | handles unknown Prisma error with 500 | Unrecognised Prisma error falls back to 500 |
| 8 | handles AppError with correct status | `AppError` subclasses use their own `statusCode` |
| 9 | handles ValidationError (AppError subclass) with details | `details` payload is included in the response |
| 10 | falls back to 500 for unexpected errors | Unknown errors default to 500 Internal Server Error |

---

## Validators

### Auth Validators

**File:** `src/tests/auth.validators.test.ts` · **23 tests**

#### `registerSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts valid data | Happy-path registration payload parses successfully |
| 2 | rejects invalid email | Malformed email is rejected |
| 3 | rejects short password | Password shorter than minimum length is rejected |
| 4 | rejects password without uppercase | Password policy requires at least one uppercase letter |
| 5 | rejects password without number | Password policy requires at least one digit |
| 6 | rejects empty firstName | First name cannot be blank |
| 7 | defaults role to STUDENT | Omitting `role` defaults to `"STUDENT"` |
| 8 | accepts OWNER role | `"OWNER"` is a valid role value |
| 9 | accepts optional phone/university | Optional fields parse without error |

#### `loginSchema`
| # | Test | What it verifies |
|---|---|---|
| 10 | accepts valid credentials | Email + password combination parses |
| 11 | rejects invalid email | Malformed email is rejected |
| 12 | rejects empty password | Empty password is rejected |

#### `refreshTokenSchema`
| # | Test | What it verifies |
|---|---|---|
| 13 | accepts non-empty token | Valid token string parses |
| 14 | rejects empty token | Empty string is rejected |

#### `resendVerificationSchema`
| # | Test | What it verifies |
|---|---|---|
| 15 | accepts valid email | Valid email parses |
| 16 | rejects invalid email | Malformed email is rejected |

#### `forgotPasswordSchema`
| # | Test | What it verifies |
|---|---|---|
| 17 | accepts valid email | Valid email parses |
| 18 | rejects missing email | Missing `email` field throws |

#### `resetPasswordSchema`
| # | Test | What it verifies |
|---|---|---|
| 19 | accepts valid token+password | Token + strong password parse successfully |
| 20 | rejects empty token | Empty token string is rejected |
| 21 | rejects weak password | Password that fails strength requirements is rejected |

#### `logoutSchema`
| # | Test | What it verifies |
|---|---|---|
| 22 | accepts non-empty token | Valid refresh token parses |
| 23 | rejects empty token | Empty string is rejected |

---

### Boarding Validators

**File:** `src/tests/boarding.validators.test.ts` · **27 tests**

#### `createBoardingSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts valid data | Happy-path payload parses successfully |
| 2 | rejects title < 10 chars | Title must be at least 10 characters |
| 3 | rejects description < 30 chars | Description must be at least 30 characters |
| 4 | rejects monthlyRent < 1000 | Minimum rent is 1 000 LKR |
| 5 | rejects monthlyRent > 500000 | Maximum rent is 500 000 LKR |
| 6 | rejects latitude outside Sri Lanka | Latitude must be within Sri Lanka bounds |
| 7 | rejects longitude outside Sri Lanka | Longitude must be within Sri Lanka bounds |
| 8 | rejects maxOccupants < 1 | At least one occupant required |
| 9 | rejects maxOccupants > 20 | Maximum 20 occupants |
| 10 | rejects invalid boardingType | Only allowed enum values accepted |
| 11 | rejects invalid genderPref | Only allowed enum values accepted |
| 12 | defaults amenities to [] and currentOccupants to 0 | Missing optional fields get sensible defaults |
| 13 | normalises amenity strings | Amenity strings are trimmed and upper-cased |

#### `updateBoardingSchema`
| # | Test | What it verifies |
|---|---|---|
| 14 | accepts empty object | All fields are optional; empty object is valid |
| 15 | accepts partial update | Partial payload parses correctly |
| 16 | still validates provided fields | Provided fields are still validated (e.g., low `monthlyRent`) |

#### `boardingIdParamSchema`
| # | Test | What it verifies |
|---|---|---|
| 17 | accepts non-empty id | Valid ID string parses |
| 18 | rejects empty id | Empty string is rejected |
| 19 | rejects missing id | Missing `id` field throws |

#### `rejectBoardingSchema`
| # | Test | What it verifies |
|---|---|---|
| 20 | accepts non-empty reason | Valid reason string parses |
| 21 | rejects empty reason | Empty string is rejected |

#### `searchBoardingsQuerySchema`
| # | Test | What it verifies |
|---|---|---|
| 22 | uses defaults | Defaults applied when query is empty |
| 23 | coerces page/size from strings | String values `"2"`, `"20"` coerced to numbers |
| 24 | rejects size > 100 | Page size cap is 100 |
| 25 | rejects invalid boardingType | Only known enum values accepted |
| 26 | rejects invalid sortBy | Only allowed sort fields accepted |
| 27 | accepts all valid filters | Full filter payload (price range, location, amenities, etc.) parses |

---

### Payment Validators

**File:** `src/tests/payment.validators.test.ts` · **17 tests**

#### `logPaymentSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts valid data | Happy-path payload parses |
| 2 | accepts paidAt with timezone offset | ISO 8601 with `+HH:MM` offset is accepted |
| 3 | rejects empty rentalPeriodId | Required field cannot be empty |
| 4 | rejects empty reservationId | Required field cannot be empty |
| 5 | rejects zero amount | Amount must be > 0 |
| 6 | rejects negative amount | Negative amounts are rejected |
| 7 | rejects invalid paymentMethod | Only allowed enum values accepted |
| 8 | accepts BANK_TRANSFER paymentMethod | `"BANK_TRANSFER"` is valid |
| 9 | accepts ONLINE paymentMethod | `"ONLINE"` is valid |
| 10 | accepts optional referenceNumber | Optional field parses when present |
| 11 | rejects referenceNumber over 100 chars | Length cap enforced |
| 12 | accepts optional proofImageUrl | Optional URL field parses when present |
| 13 | rejects invalid proofImageUrl | Non-URL string is rejected |
| 14 | rejects malformed paidAt | Non-ISO date string is rejected |

#### `rejectPaymentSchema`
| # | Test | What it verifies |
|---|---|---|
| 15 | accepts non-empty reason | Valid reason parses |
| 16 | rejects empty reason | Empty string is rejected |
| 17 | rejects missing reason | Missing field throws |

---

### Reservation Validators

**File:** `src/tests/reservation.validators.test.ts` · **8 tests**

#### `createReservationSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts valid data | Happy-path payload parses |
| 2 | rejects empty boardingId | Required field cannot be empty |
| 3 | rejects non-YYYY-MM-DD moveInDate | Date format must be `YYYY-MM-DD` |
| 4 | accepts optional specialRequests | Optional field parses when present |
| 5 | rejects specialRequests > 1000 chars | Length cap enforced |

#### `rejectReservationSchema`
| # | Test | What it verifies |
|---|---|---|
| 6 | accepts non-empty reason | Valid reason parses |
| 7 | rejects empty reason | Empty string is rejected |
| 8 | rejects missing reason | Missing field throws |

---

### User Validators

**File:** `src/tests/user.validators.test.ts` · **18 tests**

#### `updateProfileSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts empty object (all fields optional) | All fields are optional |
| 2 | accepts all fields | Full profile payload parses |
| 3 | rejects empty firstName | First name cannot be blank |
| 4 | rejects empty lastName | Last name cannot be blank |
| 5 | rejects firstName over 100 chars | Length cap enforced |
| 6 | rejects lastName over 100 chars | Length cap enforced |

#### `changePasswordSchema`
| # | Test | What it verifies |
|---|---|---|
| 7 | accepts valid data | Current + new password payload parses |
| 8 | rejects empty currentPassword | Required field cannot be empty |
| 9 | rejects newPassword < 8 chars | Minimum length enforced |
| 10 | rejects newPassword without uppercase | Password policy: uppercase required |
| 11 | rejects newPassword without number | Password policy: digit required |

#### `adminListUsersQuerySchema`
| # | Test | What it verifies |
|---|---|---|
| 12 | uses defaults for empty input | Defaults: `page=1`, `size=20` |
| 13 | coerces page/size from strings | String values coerced to numbers |
| 14 | rejects size > 100 | Page size cap is 100 |
| 15 | accepts valid role filter | Valid role enum value accepted |
| 16 | rejects invalid role | Invalid role value rejected |
| 17 | parses active=true as boolean true | String `"true"` coerced to `true` |
| 18 | parses active=false as boolean false | String `"false"` coerced to `false` |

---

### VisitRequest Validators

**File:** `src/tests/visitRequest.validators.test.ts` · **10 tests**

#### `createVisitRequestSchema`
| # | Test | What it verifies |
|---|---|---|
| 1 | accepts valid data | Happy-path payload parses |
| 2 | accepts ISO 8601 with timezone offset | Timestamps with `+HH:MM` offset are accepted |
| 3 | rejects empty boardingId | Required field cannot be empty |
| 4 | rejects malformed requestedStartAt | Non-ISO date string is rejected |
| 5 | rejects malformed requestedEndAt | Non-ISO date string is rejected |
| 6 | accepts optional message | Optional field parses when present |
| 7 | rejects message > 1000 chars | Length cap enforced |

#### `rejectVisitRequestSchema`
| # | Test | What it verifies |
|---|---|---|
| 8 | accepts non-empty reason | Valid reason parses |
| 9 | rejects empty reason | Empty string is rejected |
| 10 | rejects missing reason | Missing field throws |

---

## Services

### Review Service

**File:** `src/tests/review.service.test.ts` · **34 tests**

#### `ReviewService › createReview`
| # | Test | What it verifies |
|---|---|---|
| 1 | creates without images/video | Review record created; no Cloudinary calls |
| 2 | uploads images | Image files uploaded to Cloudinary; URLs stored |
| 3 | uploads video | Video file uploaded to Cloudinary; URL stored |

#### `ReviewService › getReviewById`
| # | Test | What it verifies |
|---|---|---|
| 4 | returns review when found | Prisma record returned as-is |
| 5 | returns null when not found | Returns `null` for unknown ID |

#### `ReviewService › getReviewsByBoarding`
| # | Test | What it verifies |
|---|---|---|
| 6 | returns paginated reviews with defaults | Default page/limit applied |
| 7 | respects custom options | Custom `page`, `limit`, and `sortBy` applied |

#### `ReviewService › updateReview`
| # | Test | What it verifies |
|---|---|---|
| 8 | throws when review not found | `"Review not found"` error thrown |
| 9 | throws when belongs to different student | Ownership check — different `studentId` rejected |
| 10 | throws when already edited | One-time edit policy enforced |
| 11 | updates and marks editedAt | Successful update sets `editedAt` |
| 12 | deletes old images and uploads new ones | Old Cloudinary assets deleted; new ones uploaded |

#### `ReviewService › deleteReview`
| # | Test | What it verifies |
|---|---|---|
| 13 | throws when not found | `"Review not found"` error thrown |
| 14 | throws when belongs to different student | Ownership check enforced |
| 15 | deletes assets and record | Cloudinary assets deleted, Prisma record deleted |

#### `ReviewService › addReviewReaction`
| # | Test | What it verifies |
|---|---|---|
| 16 | throws when review not found | `"Review not found"` error thrown |
| 17 | adds a new LIKE | New reaction record created with `action: "added"` |
| 18 | removes when toggled with same type | Same reaction type toggled → reaction removed |
| 19 | changes reaction type | Different reaction type → existing record updated |

#### `ReviewService › createReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 20 | creates and returns a comment | Comment record created and returned |

#### `ReviewService › updateReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 21 | throws when not found | `"Comment not found"` error thrown |
| 22 | throws when belongs to different user | Ownership check enforced |
| 23 | throws when already edited | One-time edit policy enforced |
| 24 | updates and marks editedAt | Successful update sets `editedAt` |

#### `ReviewService › deleteReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 25 | throws when not found | `"Comment not found"` error thrown |
| 26 | throws when belongs to different user | Ownership check enforced |
| 27 | deletes and returns success | Record deleted; success message returned |

#### `ReviewService › addReviewCommentReaction`
| # | Test | What it verifies |
|---|---|---|
| 28 | throws when comment not found | `"Comment not found"` error thrown |
| 29 | adds a new DISLIKE | New reaction record created |
| 30 | removes when toggled with same type | Same reaction type toggled → reaction removed |
| 31 | changes reaction type | Different reaction type → existing record updated |

#### `ReviewService › getReviewStats`
| # | Test | What it verifies |
|---|---|---|
| 32 | returns zero stats for no reviews | `averageRating: 0`, `totalReviews: 0` when no data |
| 33 | computes correct average | Average across multiple ratings is accurate |
| 34 | populates ratingDistribution | Counts per star level (1–5) are correct |

---

## Controllers

All controller tests mock `@/lib/prisma.js` (and other external dependencies such as Cloudinary, bcrypt, and JWT utilities) so they run without a real database or network connection.

---

### Admin Controller

**File:** `src/tests/admin.controller.test.ts` · **15 tests**

#### `listUsers`
| # | Test | What it verifies |
|---|---|---|
| 1 | returns paginated users | Paginated user list returned in response |
| 2 | calls next on db error | Database errors are forwarded to Express `next()` |

#### `getUserById`
| # | Test | What it verifies |
|---|---|---|
| 3 | returns user by ID | Found user is returned |
| 4 | throws UserNotFoundError when not found | `null` result → 404 error |

#### `activateUser`
| # | Test | What it verifies |
|---|---|---|
| 5 | activates a user | User's `isActive` flag set to `true` |
| 6 | throws UserNotFoundError when not found | `null` result → 404 error |

#### `deactivateUser`
| # | Test | What it verifies |
|---|---|---|
| 7 | deactivates a user | User's `isActive` flag set to `false` |
| 8 | throws UserNotFoundError when not found | `null` result → 404 error |

#### `listPendingBoardings`
| # | Test | What it verifies |
|---|---|---|
| 9 | returns pending boardings | Boardings in `PENDING_APPROVAL` status returned |

#### `approveBoarding`
| # | Test | What it verifies |
|---|---|---|
| 10 | approves a PENDING_APPROVAL boarding | Status transitioned to `ACTIVE` |
| 11 | throws BoardingNotFoundError when not found | `null` result → 404 error |
| 12 | throws InvalidStateTransitionError when not PENDING_APPROVAL | Wrong starting status → 422 error |

#### `rejectBoarding`
| # | Test | What it verifies |
|---|---|---|
| 13 | rejects a PENDING_APPROVAL boarding | Status transitioned to `REJECTED`; reason recorded |
| 14 | throws BoardingNotFoundError when not found | `null` result → 404 error |
| 15 | throws InvalidStateTransitionError when not PENDING_APPROVAL | Wrong starting status → 422 error |

---

### Auth Controller

**File:** `src/tests/auth.controller.test.ts` · **27 tests**

#### `register`
| # | Test | What it verifies |
|---|---|---|
| 1 | creates user and sends 201 | User record created; verification email sent; 201 returned |
| 2 | throws UserAlreadyExistsError when email taken | Duplicate email → 409 |
| 3 | calls next on db error | Unexpected DB error forwarded to `next()` |

#### `login`
| # | Test | What it verifies |
|---|---|---|
| 4 | returns tokens for valid credentials | Access + refresh tokens returned on success |
| 5 | throws InvalidCredentialsError when user not found | Unknown email → credential error |
| 6 | throws InvalidCredentialsError on bad password | Wrong password → credential error |
| 7 | throws AccountDeactivatedError when inactive | Deactivated account → 403 |

#### `refreshToken`
| # | Test | What it verifies |
|---|---|---|
| 8 | issues new tokens | Valid refresh token → new token pair |
| 9 | throws UnauthorizedError for revoked token | Revoked token hash → 401 |
| 10 | throws UnauthorizedError when token not found | Unknown token → 401 |
| 11 | throws UserNotFoundError when user missing | Token valid but user deleted → 404 |
| 12 | throws AccountDeactivatedError for inactive user | Token valid but account inactive → 403 |

#### `logout`
| # | Test | What it verifies |
|---|---|---|
| 13 | revokes token and returns success | Refresh token revoked; success response returned |
| 14 | calls next on db error | DB error forwarded to `next()` |

#### `verifyEmail`
| # | Test | What it verifies |
|---|---|---|
| 15 | verifies email and returns success | Token found → user's email marked verified |
| 16 | throws TokenExpiredError when token missing | Empty token body → 410 |
| 17 | throws TokenExpiredError when token not found | Unknown token → 410 |
| 18 | throws TokenExpiredError and deletes when expired | Expired token deleted and 410 thrown |

#### `resendVerification`
| # | Test | What it verifies |
|---|---|---|
| 19 | sends email for valid unverified user | Email sent; generic success response |
| 20 | returns generic message when user not found | Avoids email enumeration |
| 21 | returns generic message for already-verified user | Avoids enumeration; no email sent |

#### `forgotPassword`
| # | Test | What it verifies |
|---|---|---|
| 22 | sends reset email for existing user | Reset token created; email sent |
| 23 | returns generic message when user not found | Avoids email enumeration |

#### `resetPassword`
| # | Test | What it verifies |
|---|---|---|
| 24 | resets password successfully | New hashed password stored; token deleted |
| 25 | throws TokenExpiredError for invalid/used token | Already-used or invalid token → 410 |
| 26 | throws TokenExpiredError and deletes expired token | Expired token deleted and 410 thrown |
| 27 | throws TokenExpiredError when token not found | Unknown token → 410 |

---

### Boarding Controller

**File:** `src/tests/boarding.controller.test.ts` · **33 tests**

#### `searchBoardings`
| # | Test | What it verifies |
|---|---|---|
| 1 | returns paginated active boardings | Active boardings returned with pagination meta |
| 2 | calls next on error | DB error forwarded to `next()` |

#### `getBoardingBySlug`
| # | Test | What it verifies |
|---|---|---|
| 3 | returns boarding for active slug | Found `ACTIVE` boarding returned |
| 4 | throws BoardingNotFoundError when not found | Unknown slug → 404 |
| 5 | throws BoardingNotFoundError when deleted | Soft-deleted boarding → 404 |
| 6 | throws BoardingNotFoundError when not ACTIVE | Non-active status → 404 |

#### `getMyListings`
| # | Test | What it verifies |
|---|---|---|
| 7 | returns owner listings | All boardings owned by the authenticated user returned |

#### `createBoarding`
| # | Test | What it verifies |
|---|---|---|
| 8 | creates boarding and returns 201 | New boarding record created; 201 returned |
| 9 | throws ValidationError when currentOccupants > maxOccupants | Business rule: current ≤ max occupants |

#### `updateBoarding`
| # | Test | What it verifies |
|---|---|---|
| 10 | updates boarding and returns result | Record updated; updated data returned |
| 11 | throws BoardingNotFoundError when not found | Unknown ID → 404 |
| 12 | throws ForbiddenError when not owner | Non-owner attempt → 403 |
| 13 | throws ValidationError when ID missing | Missing route param → 422 |

#### `submitBoarding`
| # | Test | What it verifies |
|---|---|---|
| 14 | submits a DRAFT boarding with images | Status transitioned to `PENDING_APPROVAL` |
| 15 | throws BoardingNotFoundError when not found | Unknown ID → 404 |
| 16 | throws ForbiddenError when not owner | Non-owner attempt → 403 |
| 17 | throws InvalidStateTransitionError from ACTIVE status | State machine: cannot submit from `ACTIVE` |
| 18 | throws ValidationError when no images | At least one image required to submit |

#### `deactivateBoarding`
| # | Test | What it verifies |
|---|---|---|
| 19 | deactivates an ACTIVE boarding | Status transitioned to `INACTIVE` |
| 20 | throws BoardingNotFoundError when not found | Unknown ID → 404 |
| 21 | throws ForbiddenError when not owner | Non-owner attempt → 403 |
| 22 | throws InvalidStateTransitionError when not ACTIVE | Can only deactivate from `ACTIVE` |

#### `activateBoarding`
| # | Test | What it verifies |
|---|---|---|
| 23 | activates an INACTIVE boarding | Status transitioned to `ACTIVE` |
| 24 | throws InvalidStateTransitionError when not INACTIVE | Can only activate from `INACTIVE` |

#### `uploadImages`
| # | Test | What it verifies |
|---|---|---|
| 25 | uploads images and returns 201 | Files uploaded to Cloudinary; URLs stored; 201 returned |
| 26 | throws BoardingNotFoundError when not found | Unknown ID → 404 |
| 27 | throws ForbiddenError when not owner | Non-owner attempt → 403 |
| 28 | throws ValidationError when no files provided | At least one file required |
| 29 | throws ValidationError when exceeding max images | Boarding image limit enforced |

#### `deleteImage`
| # | Test | What it verifies |
|---|---|---|
| 30 | deletes image | Cloudinary asset + DB record deleted |
| 31 | throws BoardingNotFoundError when boarding not found | Unknown boarding ID → 404 |
| 32 | throws ForbiddenError when not owner | Non-owner attempt → 403 |
| 33 | throws BoardingNotFoundError when image not found | Unknown image ID → 404 |

---

### Payment Controller

**File:** `src/tests/payment.controller.test.ts` · **20 tests**

#### `logPayment`
| # | Test | What it verifies |
|---|---|---|
| 1 | logs a payment and returns 201 | Payment record created; 201 returned |
| 2 | throws BadRequestError for future paidAt | Payment date cannot be in the future |
| 3 | throws NotFoundError when rental period not found | Unknown rental period → 404 |
| 4 | throws NotFoundError when reservation not found | Unknown reservation → 404 |
| 5 | throws ForbiddenError when student does not own reservation | Only the student on the reservation can log a payment |
| 6 | throws ConflictError when rental period already PAID | Cannot pay an already-settled period |
| 7 | throws BadRequestError when amount exceeds remaining balance | Cannot overpay a rental period |

#### `getMyPayments`
| # | Test | What it verifies |
|---|---|---|
| 8 | returns student payments | All payments belonging to the current student returned |

#### `getMyBoardingPayments`
| # | Test | What it verifies |
|---|---|---|
| 9 | returns payments for owner boardings | Payments across all boardings owned by the current user returned |

#### `confirmPayment`
| # | Test | What it verifies |
|---|---|---|
| 10 | confirms a PENDING payment | Status set to `CONFIRMED`; `confirmedAt` set |
| 11 | throws NotFoundError when payment not found | Unknown payment → 404 |
| 12 | throws ForbiddenError when not owner of boarding | Only the boarding owner can confirm |
| 13 | throws BadRequestError when payment is not PENDING | Can only confirm `PENDING` payments |

#### `uploadProofImage`
| # | Test | What it verifies |
|---|---|---|
| 14 | uploads proof image | Image uploaded to Cloudinary; URL returned |
| 15 | throws UnauthorizedError when no req.user | Unauthenticated request → 401 |
| 16 | throws BadRequestError when no file | File is required |

#### `rejectPayment`
| # | Test | What it verifies |
|---|---|---|
| 17 | rejects a PENDING payment | Status set to `REJECTED`; reason recorded |
| 18 | throws NotFoundError when payment not found | Unknown payment → 404 |
| 19 | throws ForbiddenError when not owner of boarding | Only the boarding owner can reject |
| 20 | throws BadRequestError when payment is not PENDING | Can only reject `PENDING` payments |

---

### RentalPeriod Controller

**File:** `src/tests/rentalPeriod.controller.test.ts` · **6 tests**

#### `getRentalPeriods`
| # | Test | What it verifies |
|---|---|---|
| 1 | returns rental periods for the student | Student on the reservation can view periods |
| 2 | returns rental periods for the owner | Boarding owner can view periods |
| 3 | allows ADMIN to access any reservation | Admin bypasses ownership check |
| 4 | throws NotFoundError when reservation not found | Unknown reservation → 404 |
| 5 | throws ForbiddenError for unrelated user | Unrelated user → 403 |
| 6 | calls next on db error | DB error forwarded to `next()` |

---

### Reservation Controller

**File:** `src/tests/reservation.controller.test.ts` · **29 tests**

#### `createReservation`
| # | Test | What it verifies |
|---|---|---|
| 1 | creates reservation and returns 201 | Reservation record created; 201 returned |
| 2 | throws BadRequestError for past move-in date | Move-in date must be in the future |
| 3 | throws BoardingNotFoundError when boarding not found | Unknown boarding → 404 |
| 4 | throws BadRequestError when boarding not ACTIVE | Cannot book a non-active boarding |
| 5 | throws ConflictError when boarding is full | `currentOccupants >= maxOccupants` → 409 |
| 6 | throws ConflictError when student already has active reservation | Duplicate active reservation → 409 |

#### `getMyRequests`
| # | Test | What it verifies |
|---|---|---|
| 7 | returns student reservations | All reservations for the current student returned |

#### `getMyBoardingRequests`
| # | Test | What it verifies |
|---|---|---|
| 8 | returns reservations for owner boardings | All reservation requests across owner's boardings returned |

#### `getReservationById`
| # | Test | What it verifies |
|---|---|---|
| 9 | returns reservation for the student | Student can view their own reservation |
| 10 | throws NotFoundError when not found | Unknown ID → 404 |
| 11 | throws ForbiddenError for unrelated user | Unrelated user → 403 |
| 12 | allows ADMIN to access any reservation | Admin bypasses ownership check |

#### `approveReservation`
| # | Test | What it verifies |
|---|---|---|
| 13 | approves a PENDING reservation | Status set to `ACTIVE`; occupancy incremented |
| 14 | throws NotFoundError when not found | Unknown reservation → 404 |
| 15 | throws ForbiddenError when not owner | Only boarding owner can approve |
| 16 | throws BadRequestError when not PENDING | Can only approve `PENDING` reservations |

#### `rejectReservation`
| # | Test | What it verifies |
|---|---|---|
| 17 | rejects a PENDING reservation | Status set to `REJECTED`; reason stored |
| 18 | throws NotFoundError when not found | Unknown reservation → 404 |
| 19 | throws ForbiddenError when not owner | Only boarding owner can reject |
| 20 | throws BadRequestError when not PENDING | Can only reject `PENDING` reservations |

#### `cancelReservation`
| # | Test | What it verifies |
|---|---|---|
| 21 | cancels a PENDING reservation | Status set to `CANCELLED` |
| 22 | decrements occupants when cancelling ACTIVE reservation | Active cancellation decrements `currentOccupants` |
| 23 | throws NotFoundError when not found | Unknown reservation → 404 |
| 24 | throws ForbiddenError when not the student | Only the student can cancel |
| 25 | throws BadRequestError for non-cancellable status | Cannot cancel a `COMPLETED` or already-`CANCELLED` reservation |

#### `completeReservation`
| # | Test | What it verifies |
|---|---|---|
| 26 | completes an ACTIVE reservation | Status set to `COMPLETED`; occupancy decremented |
| 27 | throws NotFoundError when not found | Unknown reservation → 404 |
| 28 | throws ForbiddenError when not owner | Only boarding owner can complete |
| 29 | throws BadRequestError when not ACTIVE | Can only complete `ACTIVE` reservations |

---

### Review Controller

**File:** `src/tests/review.controller.test.ts` · **28 tests**

#### `createReview`
| # | Test | What it verifies |
|---|---|---|
| 1 | creates a review and returns 201 | Review created; 201 returned |
| 2 | throws BadRequestError for invalid JSON in body.data | Malformed `data` field → 400 |
| 3 | throws BadRequestError when userId missing | Unauthenticated request → 400 |
| 4 | throws BadRequestError when more than 5 images | Max 5 images per review |

#### `getReview`
| # | Test | What it verifies |
|---|---|---|
| 5 | returns review when found | Found review returned |
| 6 | throws NotFoundError when review not found | `null` result → 404 |
| 7 | calls next on service error | Service error forwarded to `next()` |

#### `getReviewsByBoarding`
| # | Test | What it verifies |
|---|---|---|
| 8 | returns paginated reviews | Reviews returned with pagination meta |

#### `getReviewStats`
| # | Test | What it verifies |
|---|---|---|
| 9 | returns review stats | Average rating and distribution returned |

#### `updateReview`
| # | Test | What it verifies |
|---|---|---|
| 10 | updates review | Updated review returned |
| 11 | maps "Review not found" to NotFoundError | Service message mapped to 404 |
| 12 | maps ownership error to ForbiddenError | Service message mapped to 403 |

#### `deleteReview`
| # | Test | What it verifies |
|---|---|---|
| 13 | deletes review | Success message returned |
| 14 | maps "Review not found" to NotFoundError | Service message mapped to 404 |
| 15 | maps ownership error to ForbiddenError | Service message mapped to 403 |
| 16 | throws BadRequestError when userId missing | Unauthenticated request → 400 |

#### `addReviewReaction`
| # | Test | What it verifies |
|---|---|---|
| 17 | adds a reaction | Reaction added; action returned |
| 18 | throws BadRequestError when userId missing | Unauthenticated request → 400 |

#### `createReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 19 | creates a comment and returns 201 | Comment created; 201 returned |
| 20 | throws BadRequestError when userId missing | Unauthenticated request → 400 |

#### `updateReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 21 | updates a comment | Updated comment returned |
| 22 | maps "Comment not found" to NotFoundError | Service message mapped to 404 |
| 23 | maps ownership error to ForbiddenError | Service message mapped to 403 |

#### `deleteReviewComment`
| # | Test | What it verifies |
|---|---|---|
| 24 | deletes a comment | Success message returned |
| 25 | maps "Comment not found" to NotFoundError | Service message mapped to 404 |
| 26 | throws BadRequestError when userId missing | Unauthenticated request → 400 |

#### `addReviewCommentReaction`
| # | Test | What it verifies |
|---|---|---|
| 27 | adds a reaction to a comment | Reaction added; action returned |
| 28 | throws BadRequestError when userId missing | Unauthenticated request → 400 |

---

### SavedBoarding Controller

**File:** `src/tests/savedBoarding.controller.test.ts` · **6 tests**

#### `saveBoarding`
| # | Test | What it verifies |
|---|---|---|
| 1 | saves boarding and returns 201 | Saved record created; 201 returned |
| 2 | throws BoardingNotFoundError when boarding not found | Unknown boarding → 404 |
| 3 | throws ValidationError when already saved | Duplicate save → 422 |

#### `unsaveBoarding`
| # | Test | What it verifies |
|---|---|---|
| 4 | unsaves boarding | Saved record deleted; success response |
| 5 | throws BoardingNotFoundError when not saved | Unsaving a non-saved boarding → 404 |

#### `getSavedBoardings`
| # | Test | What it verifies |
|---|---|---|
| 6 | returns saved boardings for student | All saved boardings for current student returned |

---

### User Controller

**File:** `src/tests/user.controller.test.ts` · **12 tests**

#### `getMe`
| # | Test | What it verifies |
|---|---|---|
| 1 | returns sanitized user | Password field stripped from response |
| 2 | throws UnauthorizedError when no req.user | Unauthenticated request → 401 |
| 3 | throws UserNotFoundError when user not in DB | User deleted between auth and request → 404 |

#### `updateMe`
| # | Test | What it verifies |
|---|---|---|
| 4 | updates user and returns sanitized data | Updated user returned without password |
| 5 | throws UnauthorizedError when no req.user | Unauthenticated request → 401 |

#### `changePassword`
| # | Test | What it verifies |
|---|---|---|
| 6 | changes password on valid current password | Password hash updated |
| 7 | throws UnauthorizedError when no req.user | Unauthenticated request → 401 |
| 8 | throws UserNotFoundError when user not in DB | User deleted between auth and request → 404 |
| 9 | throws InvalidCredentialsError for wrong current password | Wrong current password → credential error |

#### `uploadProfileImageHandler`
| # | Test | What it verifies |
|---|---|---|
| 10 | uploads image and updates user | Image uploaded; user's `profileImage` URL updated |
| 11 | throws UnauthorizedError when no req.user | Unauthenticated request → 401 |
| 12 | throws ValidationError when no file provided | File is required |

---

### VisitRequest Controller

**File:** `src/tests/visitRequest.controller.test.ts` · **26 tests**

#### `createVisitRequest`
| # | Test | What it verifies |
|---|---|---|
| 1 | creates visit request and returns 201 | Request record created; 201 returned |
| 2 | throws BadRequestError when start is in the past | Start time must be in the future |
| 3 | throws BadRequestError when end is before start | End time must be after start time |
| 4 | throws BoardingNotFoundError when boarding not found | Unknown boarding → 404 |
| 5 | throws BadRequestError when boarding not ACTIVE | Cannot book a visit for a non-active boarding |
| 6 | throws ConflictError when pending request already exists | Only one pending visit per student per boarding |

#### `getMyVisitRequests`
| # | Test | What it verifies |
|---|---|---|
| 7 | returns student visit requests | All visit requests for the current student returned |

#### `getMyBoardingVisitRequests`
| # | Test | What it verifies |
|---|---|---|
| 8 | returns visit requests for owner boardings | All visit requests across owner's boardings returned |

#### `getVisitRequestById`
| # | Test | What it verifies |
|---|---|---|
| 9 | returns visit request for the student | Student can view their own request |
| 10 | throws NotFoundError when not found | Unknown ID → 404 |
| 11 | allows ADMIN to access any visit request | Admin bypasses ownership check |
| 12 | throws ForbiddenError for unrelated user | Unrelated user → 403 |

#### `approveVisitRequest`
| # | Test | What it verifies |
|---|---|---|
| 13 | approves a PENDING visit request | Status set to `APPROVED` |
| 14 | throws NotFoundError when not found | Unknown request → 404 |
| 15 | throws ForbiddenError when not owner | Only boarding owner can approve |
| 16 | throws BadRequestError when not PENDING | Can only approve `PENDING` requests |
| 17 | throws GoneError when expired | Time window has passed → 410 |

#### `rejectVisitRequest`
| # | Test | What it verifies |
|---|---|---|
| 18 | rejects a PENDING visit request | Status set to `REJECTED`; reason stored |
| 19 | throws NotFoundError when not found | Unknown request → 404 |
| 20 | throws ForbiddenError when not owner | Only boarding owner can reject |
| 21 | throws BadRequestError when not PENDING | Can only reject `PENDING` requests |

#### `cancelVisitRequest`
| # | Test | What it verifies |
|---|---|---|
| 22 | cancels a PENDING visit request | Status set to `CANCELLED` |
| 23 | cancels an APPROVED visit request | Approved requests can also be cancelled by the student |
| 24 | throws NotFoundError when not found | Unknown request → 404 |
| 25 | throws ForbiddenError when not the student | Only the student can cancel |
| 26 | throws BadRequestError for non-cancellable status | Cannot cancel a `COMPLETED` or already-`CANCELLED` request |
