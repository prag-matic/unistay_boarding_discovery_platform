# UniStay Frontend — Test Cases

> **Runner:** Jest (via `jest-expo`)  
> **Command:** `npm test`  
> **Total:** 184 tests across 11 suites — all passing

---

## Table of Contents

1. [helpers.test.ts](#1-helperstesteststss) — utility functions (30 tests)
2. [password.test.ts](#2-passwordteststs) — password strength (17 tests)
3. [validation.test.ts](#3-validationteststs) — Zod schemas (43 tests)
4. [boarding.store.test.ts](#4-boardingstoreteststs) — Zustand boarding store (13 tests)
5. [storage.test.ts](#5-storageteststs) — storage wrapper (17 tests)
6. [boarding.lib.test.ts](#6-boardinglibteststs) — boarding API functions (14 tests)
7. [payment.lib.test.ts](#7-paymentlibteststs) — payment API functions (8 tests)
8. [reservation.lib.test.ts](#8-reservationlibteststs) — reservation API functions (9 tests)
9. [visit.lib.test.ts](#9-visitlibteststs) — visit-request API functions (7 tests)
10. [review.lib.test.ts](#10-reviewlibteststs) — review normalisation + API functions (20 tests)
11. [auth.store.test.ts](#11-authstoreteststs) — auth Zustand store (26 tests)

---

## 1. `helpers.test.ts`

**Source under test:** `utils/helpers.ts`  
**Tests:** 30

### `formatCurrency`

| # | Test | Description |
|---|------|-------------|
| 1 | formats amount with default LKR currency | `formatCurrency(50000)` → `"LKR 50,000"` |
| 2 | formats amount with custom currency | `formatCurrency(1000, 'USD')` → `"USD 1,000"` |
| 3 | formats zero amount | `formatCurrency(0)` → `"LKR 0"` |
| 4 | formats large amounts with commas | `formatCurrency(1000000)` → `"LKR 1,000,000"` |
| 5 | formats fractional amounts | `formatCurrency(1500.5)` contains `"LKR 1,500"` |

### `timeAgo`

| # | Test | Description |
|---|------|-------------|
| 6 | returns "just now" for less than 60 seconds ago | 30 seconds elapsed → `"just now"` |
| 7 | returns minutes ago for less than an hour | 15 minutes elapsed → `"15m ago"` |
| 8 | returns hours ago for less than a day | 3 hours elapsed → `"3h ago"` |
| 9 | returns days ago for less than a week | 3 days elapsed → `"3d ago"` |
| 10 | returns formatted date for more than a week ago | 14 days elapsed → absolute date (not "X ago") |
| 11 | returns "just now" for exactly 0 seconds ago | same timestamp → `"just now"` |

### `getInitials`

| # | Test | Description |
|---|------|-------------|
| 12 | returns uppercased first letters of first and last name | `getInitials('john', 'doe')` → `"JD"` |
| 13 | handles already uppercase names | `getInitials('Alice', 'Smith')` → `"AS"` |
| 14 | handles single character names | `getInitials('A', 'B')` → `"AB"` |
| 15 | handles mixed case names | `getInitials('bob', 'JONES')` → `"BJ"` |

### `formatCountdown`

| # | Test | Description |
|---|------|-------------|
| 16 | formats 0 seconds as 00:00 | `formatCountdown(0)` → `"00:00"` |
| 17 | formats 59 seconds correctly | `formatCountdown(59)` → `"00:59"` |
| 18 | formats exactly 60 seconds as 01:00 | `formatCountdown(60)` → `"01:00"` |
| 19 | formats 90 seconds as 01:30 | `formatCountdown(90)` → `"01:30"` |
| 20 | formats large values correctly | `formatCountdown(3661)` → `"61:01"` |
| 21 | pads single digit minutes and seconds with zeros | `formatCountdown(65)` → `"01:05"` |

### `getErrorMessage`

| # | Test | Description |
|---|------|-------------|
| 22 | returns joined detail messages from axios error with details | `details: [{message:'Invalid email'},{message:'Too short'}]` → `"Invalid email\nToo short"` |
| 23 | returns message from axios error without details | `response.data.message: 'Unauthorized'` → `"Unauthorized"` |
| 24 | returns default message when axios response data has no message or details | `response.data: {}` → `"An error occurred"` |
| 25 | returns Error message for Error instances | `new Error('Something went wrong')` → `"Something went wrong"` |
| 26 | returns fallback for string error | `'string error'` → `"An unexpected error occurred"` |
| 27 | returns fallback for null | `null` → `"An unexpected error occurred"` |
| 28 | returns fallback for numeric error | `42` → `"An unexpected error occurred"` |
| 29 | returns message when details array is empty | `{message:'Some error', details:[]}` → `"Some error"` |
| 30 | *(covered by test 22 — two detail messages joined)* | |

---

## 2. `password.test.ts`

**Source under test:** `utils/password.ts`  
**Tests:** 17

### `getPasswordStrength` — score calculation

| # | Test | Description |
|---|------|-------------|
| 1 | returns score 0 for empty password | `''` → score `0` |
| 2 | returns score 0 for very weak password (letters only, short) | `'abc'` → score `0` |
| 3 | returns score 1 for password with only lowercase and length ≥ 8 | `'abcdefgh'` → score `1` |
| 4 | returns score 2 for password with lowercase, uppercase, and length ≥ 8 | `'Abcdefgh'` → score `2` |
| 5 | returns score 3 for password with lowercase, uppercase, number, length ≥ 8 | `'Abcdefg1'` → score `3` |
| 6 | returns score 4 for fully strong password | `'Abcdef1!'` → score `4` |
| 7 | caps score at 4 | `'ABCDef12!@#$'` → score ≤ `4` |

### `getPasswordStrength` — labels

| # | Test | Description |
|---|------|-------------|
| 8 | returns "Weak" label for score 0 | `''` → label `"Weak"` |
| 9 | returns "Weak" label for score 1 | `'abcdefgh'` → label `"Weak"` |
| 10 | returns "Strong" label for a fully strong password | `'Abcdef1!'` → label `"Strong"` |

### `getPasswordStrength` — colors

| # | Test | Description |
|---|------|-------------|
| 11 | returns red color for weak password | `''` → color `#EF4444` |
| 12 | returns green color for strong password | `'Abcdef1!'` → color `#22C55E` |

### `getPasswordStrength` — requirements

| # | Test | Description |
|---|------|-------------|
| 13 | returns 3 requirement entries | `requirements.length === 3` |
| 14 | marks length requirement as met when password ≥ 8 chars | `'abcdefgh'` → `"At least 8 characters"` met `true` |
| 15 | marks length requirement as unmet when password < 8 chars | `'abc'` → `"At least 8 characters"` met `false` |
| 16 | marks number requirement as met when password contains a digit | `'abc1defg'` → `"One number (0-9)"` met `true` |
| 17 | marks special character requirement as met | `'abc!defg'` → `"One special character …"` met `true` |

---

## 3. `validation.test.ts`

**Source under test:** `utils/validation.ts` (Zod schemas)  
**Tests:** 43

### `loginSchema`

| # | Test | Description |
|---|------|-------------|
| 1 | accepts valid credentials | `{email:'user@example.com', password:'secret'}` → valid |
| 2 | rejects missing email | no email field → error on `email` |
| 3 | rejects invalid email format | `email:'not-an-email'` → error on `email` |
| 4 | rejects empty password | `password:''` → error on `password` |
| 5 | rejects missing password | no password field → error on `password` |

### `studentRegisterSchema`

| # | Test | Description |
|---|------|-------------|
| 6 | accepts valid student registration data | all required fields → valid |
| 7 | rejects missing firstName | `firstName:''` → error on `firstName` |
| 8 | rejects missing lastName | `lastName:''` → error on `lastName` |
| 9 | rejects invalid email | `email:'bad'` → error on `email` |
| 10 | rejects missing university | `university:''` → error on `university` |
| 11 | rejects password shorter than 8 characters | `password:'Pa1'` → error on `password` |
| 12 | rejects password without uppercase letter | `password:'password1'` → error on `password` |
| 13 | rejects password without a number | `password:'Passwordd'` → error on `password` |
| 14 | rejects mismatched passwords | `confirmPassword:'Different1'` → error on `confirmPassword` |
| 15 | rejects when terms is not accepted | `terms:false` → error on `terms` |

### `ownerRegisterSchema`

| # | Test | Description |
|---|------|-------------|
| 16 | accepts valid owner registration data | all required fields → valid |
| 17 | accepts optional nicNumber | with `nicNumber:'123456789V'` → valid |
| 18 | rejects missing phone | `phone:''` → error on `phone` |
| 19 | rejects phone shorter than 7 characters | `phone:'071'` → error on `phone` |
| 20 | rejects invalid email | `email:'not-email'` → error on `email` |
| 21 | rejects mismatched passwords | `confirmPassword:'Mismatch1'` → error on `confirmPassword` |

### `forgotPasswordSchema`

| # | Test | Description |
|---|------|-------------|
| 22 | accepts valid email | `{email:'test@example.com'}` → valid |
| 23 | rejects invalid email | `email:'not-valid'` → error on `email` |
| 24 | rejects empty email | `email:''` → error on `email` |

### `resetPasswordSchema`

| # | Test | Description |
|---|------|-------------|
| 25 | accepts valid matching passwords | both `Password1` → valid |
| 26 | rejects weak password | `password:'weak'` → error on `password` |
| 27 | rejects mismatched passwords | `confirmPassword:'Mismatch1'` → error on `confirmPassword` |

### `changePasswordSchema`

| # | Test | Description |
|---|------|-------------|
| 28 | accepts valid change password data | all three fields valid → valid |
| 29 | rejects empty currentPassword | `currentPassword:''` → error on `currentPassword` |
| 30 | rejects weak newPassword | `newPassword:'weak'` → error on `newPassword` |
| 31 | rejects mismatched confirm password | `confirmPassword:'Mismatch1'` → error on `confirmPassword` |

### `editProfileSchema`

| # | Test | Description |
|---|------|-------------|
| 32 | accepts required fields only | `{firstName:'Alice', lastName:'Wonder'}` → valid |
| 33 | accepts optional fields | with `phone`, `university`, `nicNumber` → valid |
| 34 | rejects empty firstName | `firstName:''` → error on `firstName` |
| 35 | rejects empty lastName | `lastName:''` → error on `lastName` |
| 36 | rejects missing firstName | no `firstName` field → error on `firstName` |

---

## 4. `boarding.store.test.ts`

**Source under test:** `store/boarding.store.ts` (Zustand)  
**Tests:** 13

### `toggleSaved`

| # | Test | Description |
|---|------|-------------|
| 1 | adds an id when not already saved | `toggleSaved('abc')` → `savedIds` contains `'abc'` |
| 2 | removes an id when already saved | `savedIds:['abc','def']`, `toggleSaved('abc')` → `'abc'` removed, `'def'` remains |
| 3 | can toggle multiple unique ids independently | toggle `'a'` then `'b'` → both in `savedIds` |

### `isSaved`

| # | Test | Description |
|---|------|-------------|
| 4 | returns true when id is in savedIds | `savedIds:['x']`, `isSaved('x')` → `true` |
| 5 | returns false when id is not in savedIds | `isSaved('missing')` → `false` |

### `setSavedIds`

| # | Test | Description |
|---|------|-------------|
| 6 | replaces the savedIds array | `setSavedIds(['1','2','3'])` → array equals `['1','2','3']` |
| 7 | can clear savedIds by setting an empty array | `setSavedIds([])` → length `0` |

### `setFilters / clearFilters`

| # | Test | Description |
|---|------|-------------|
| 8 | sets filters | `setFilters({city:'Kandy', minRent:5000})` → filters reflect values |
| 9 | clearFilters resets filters to empty object | after `clearFilters()` → `filters === {}` |

### `setSortOption`

| # | Test | Description |
|---|------|-------------|
| 10 | sets the sort option | `setSortOption('PRICE_ASC')` → `sortOption === 'PRICE_ASC'` |

### `setCreateDraft / clearCreateDraft`

| # | Test | Description |
|---|------|-------------|
| 11 | merges new data into existing draft | two `setCreateDraft` calls → both keys present |
| 12 | later setCreateDraft calls override earlier values for the same key | `title:'First'` then `title:'Updated'` → `'Updated'` |
| 13 | clearCreateDraft resets draft to empty object | after `clearCreateDraft()` → `createDraft === {}` |

---

## 5. `storage.test.ts`

**Source under test:** `lib/storage.ts`  
**Tests:** 17  
**Mocks:** `expo-secure-store` (in-memory), `@react-native-async-storage/async-storage` (jest mock)

### `getToken / setToken / removeToken`

| # | Test | Description |
|---|------|-------------|
| 1 | stores and retrieves the access token via SecureStore | `setToken` calls `SecureStore.setItemAsync`; `getToken` returns stored value |
| 2 | falls back to AsyncStorage when SecureStore.getItemAsync throws | reads from AsyncStorage fallback |
| 3 | falls back to AsyncStorage when SecureStore.setItemAsync throws | writes to AsyncStorage fallback |
| 4 | removes token from SecureStore | `removeToken` calls `SecureStore.deleteItemAsync` with the token key |
| 5 | falls back to AsyncStorage removeItem when SecureStore.deleteItemAsync throws | removes from AsyncStorage fallback |

### `getRefreshToken / setRefreshToken / removeRefreshToken`

| # | Test | Description |
|---|------|-------------|
| 6 | stores and retrieves the refresh token via SecureStore | stores and reads back correctly |
| 7 | falls back to AsyncStorage when SecureStore throws on get | reads from AsyncStorage fallback |
| 8 | removes refresh token | `removeRefreshToken` calls `SecureStore.deleteItemAsync` with the refresh token key |

### `getUser / setUser / removeUser`

| # | Test | Description |
|---|------|-------------|
| 9 | serialises and stores user to AsyncStorage | user object JSON-stringified in AsyncStorage |
| 10 | deserialises and returns stored user | reads JSON from AsyncStorage and parses back to object |
| 11 | returns null when no user is stored | `getUser()` → `null` |
| 12 | removes user from AsyncStorage | after `removeUser()`, AsyncStorage key is `null` |

### `isOnboardingDone / setOnboardingDone`

| # | Test | Description |
|---|------|-------------|
| 13 | returns false when onboarding has not been marked done | fresh state → `false` |
| 14 | returns true after setOnboardingDone is called | after `setOnboardingDone()` → `true` |

### `clear`

| # | Test | Description |
|---|------|-------------|
| 15 | removes user, onboarding flag, access token, and refresh token | `clear()` → user/onboarding removed from AsyncStorage; both token keys deleted from SecureStore |

---

## 6. `boarding.lib.test.ts`

**Source under test:** `lib/boarding.ts`  
**Tests:** 14  
**Mocks:** `lib/api` (axios instance)

### `searchBoardings`

| # | Test | Description |
|---|------|-------------|
| 1 | calls GET /boardings with no params when called with defaults | `GET /boardings` with `params: {}` |
| 2 | builds query string from provided params | `city`, `minRent`, `page`, `size` serialised as strings |
| 3 | joins amenities array with comma | `['WIFI','PARKING']` → `params.amenities = 'WIFI,PARKING'` |
| 4 | omits undefined optional params | `city:'Kandy'` only → `minRent` and `maxRent` not in params |

### `getBoardingBySlug`

| # | Test | Description |
|---|------|-------------|
| 5 | calls GET /boardings/:slug | `GET /boardings/my-place`; response `boarding.slug === 'my-place'` |

### `getMyListings`

| # | Test | Description |
|---|------|-------------|
| 6 | calls GET /boardings/my-listings | `GET /boardings/my-listings` |

### `createBoarding`

| # | Test | Description |
|---|------|-------------|
| 7 | calls POST /boardings with payload | `POST /boardings` with full payload; response contains boarding city |

### `updateBoarding`

| # | Test | Description |
|---|------|-------------|
| 8 | calls PUT /boardings/:id with merged id in body | `PUT /boardings/b1` body includes `{title:'Updated Title', id:'b1'}` |

### `submitBoardingForApproval`

| # | Test | Description |
|---|------|-------------|
| 9 | calls PATCH /boardings/:id/submit | `PATCH /boardings/b1/submit` |

### `deactivateBoarding`

| # | Test | Description |
|---|------|-------------|
| 10 | calls PATCH /boardings/:id/deactivate | `PATCH /boardings/b1/deactivate` |

### `activateBoarding`

| # | Test | Description |
|---|------|-------------|
| 11 | calls PATCH /boardings/:id/activate | `PATCH /boardings/b1/activate` |

### `deleteBoardingImage`

| # | Test | Description |
|---|------|-------------|
| 12 | calls DELETE /boardings/:id/images/:imageId | `DELETE /boardings/b1/images/img1` |

### `getBoardingReviews`

| # | Test | Description |
|---|------|-------------|
| 13 | calls GET /boardings/:slug/reviews | `GET /boardings/my-place/reviews` |

---

## 7. `payment.lib.test.ts`

**Source under test:** `lib/payment.ts`  
**Tests:** 8  
**Mocks:** `lib/api` (axios instance)

### `createPayment`

| # | Test | Description |
|---|------|-------------|
| 1 | calls POST /payments with payload | `POST /payments` with required fields; response `payment.id === 'p1'` |
| 2 | includes optional referenceNumber when provided | `referenceNumber:'REF123'` forwarded in body |

### `getMyPayments`

| # | Test | Description |
|---|------|-------------|
| 3 | calls GET /payments/my-payments | `GET /payments/my-payments`; response `payments === []` |

### `getPaymentById`

| # | Test | Description |
|---|------|-------------|
| 4 | calls GET /payments/:id | `GET /payments/p1`; response `payment.id === 'p1'` |

### `getBoardingPayments`

| # | Test | Description |
|---|------|-------------|
| 5 | calls GET /payments/my-boardings | `GET /payments/my-boardings` |

### `confirmPayment`

| # | Test | Description |
|---|------|-------------|
| 6 | calls PATCH /payments/:id/confirm | `PATCH /payments/p1/confirm` |

### `rejectPayment`

| # | Test | Description |
|---|------|-------------|
| 7 | calls PATCH /payments/:id/reject with reason | `PATCH /payments/p1/reject` with `{reason:'Invalid proof'}` |

---

## 8. `reservation.lib.test.ts`

**Source under test:** `lib/reservation.ts`  
**Tests:** 9  
**Mocks:** `lib/api` (axios instance)

| # | Function | Test | Description |
|---|----------|------|-------------|
| 1 | `createReservation` | calls POST /reservation with payload | `POST /reservation`; response `reservation.id === 'res1'` |
| 2 | `getMyReservations` | calls GET /reservation/my-requests | `GET /reservation/my-requests` |
| 3 | `getReceivedReservations` | calls GET /reservation/my-boardings | `GET /reservation/my-boardings` |
| 4 | `getReservationById` | calls GET /reservation/:id | `GET /reservation/res1`; response `reservation.id === 'res1'` |
| 5 | `getRentalPeriods` | calls GET /reservation/:id/rental-periods | `GET /reservation/res1/rental-periods` |
| 6 | `approveReservation` | calls PATCH /reservation/:id/approve | `PATCH /reservation/res1/approve` |
| 7 | `rejectReservation` | calls PATCH /reservation/:id/reject with reason | `PATCH /reservation/res1/reject` with `{reason:'Not available'}` |
| 8 | `cancelReservation` | calls PATCH /reservation/:id/cancel | `PATCH /reservation/res1/cancel` |
| 9 | `completeReservation` | calls PATCH /reservation/:id/complete | `PATCH /reservation/res1/complete` |

---

## 9. `visit.lib.test.ts`

**Source under test:** `lib/visit.ts`  
**Tests:** 7  
**Mocks:** `lib/api` (axios instance)

| # | Function | Test | Description |
|---|----------|------|-------------|
| 1 | `createVisitRequest` | calls POST /visit-requests with payload | `POST /visit-requests`; response `visitRequest.id === 'v1'` |
| 2 | `createVisitRequest` | includes optional message when provided | `message:'Please confirm'` forwarded in body |
| 3 | `getMyVisitRequests` | calls GET /visit-requests/my-requests | `GET /visit-requests/my-requests` |
| 4 | `getReceivedVisitRequests` | calls GET /visit-requests/my-boardings | `GET /visit-requests/my-boardings` |
| 5 | `approveVisitRequest` | calls PATCH /visit-requests/:id/approve | `PATCH /visit-requests/v1/approve` |
| 6 | `rejectVisitRequest` | calls PATCH /visit-requests/:id/reject with reason | `PATCH /visit-requests/v1/reject` with `{reason:'Fully booked'}` |
| 7 | `cancelVisitRequest` | calls PATCH /visit-requests/:id/cancel | `PATCH /visit-requests/v1/cancel` |

---

## 10. `review.lib.test.ts`

**Source under test:** `lib/review.ts`  
**Tests:** 20  
**Mocks:** `lib/api` (axios instance)

### Review normalisation (tested via `getReviewById`)

| # | Test | Description |
|---|------|-------------|
| 1 | maps student name to reviewerName | `student.firstName + ' ' + student.lastName` → `reviewerName` |
| 2 | maps studentId to authorId | `raw.studentId` → `review.authorId` |
| 3 | converts images array into ReviewMedia with type "image" | 2 image URLs → 2 `{type:'image'}` entries |
| 4 | converts video string into ReviewMedia with type "video" | video URL → `{type:'video'}` entry |
| 5 | produces no video media when video is null | `video:null` → 0 video media items |
| 6 | maps likeCount and dislikeCount to reactions | `likeCount:5, dislikeCount:1` → `reactions.likes:5, reactions.dislikes:1, userReaction:null` |
| 7 | normalises nested comments | comment `commentor.firstName + lastName` → `authorName`; `commentorId` → `authorId` |
| 8 | sets _count.comments to the number of comments | 2 comments → `_count.comments === 2` |
| 9 | handles empty images and null video gracefully | `images:[], video:null` → `media.length === 0` |

### API functions

| # | Function | Test | Description |
|---|----------|------|-------------|
| 10 | `getReviewStats` | calls GET /reviews/boarding/:id/stats | `GET /reviews/boarding/b1/stats` |
| 11 | `getBoardingReviewsById` | calls GET /reviews/boarding/:id | `GET /reviews/boarding/b1` with `params:{}` |
| 12 | `getBoardingReviewsById` | normalises raw reviews in the response | raw `student` → `reviewerName:'Bob Jones'` |
| 13 | `getMyReviews` | calls GET /reviews/my | `GET /reviews/my` with `params:{}` |
| 14 | `deleteReview` | calls DELETE /reviews/:id | `DELETE /reviews/r1` |
| 15 | `reactToReview` | calls POST /reviews/:id/reactions with type payload | `POST /reviews/r1/reactions` with `{type:'LIKE'}` |
| 16 | `addComment` | calls POST /reviews/:reviewId/comments with comment payload | `POST /reviews/r1/comments` with `{comment:'Great place!'}` |
| 17 | `updateComment` | calls PUT /reviews/comments/:id with comment payload | `PUT /reviews/comments/c1` with `{comment:'Updated comment'}` |
| 18 | `deleteComment` | calls DELETE /reviews/comments/:id | `DELETE /reviews/comments/c1` |
| 19 | `reactToComment` | calls POST /reviews/comments/:id/reactions with type payload | `POST /reviews/comments/c1/reactions` with `{type:'DISLIKE'}` |

---

## 11. `auth.store.test.ts`

**Source under test:** `store/auth.store.ts` (Zustand)  
**Tests:** 26  
**Mocks:** `lib/api`, `lib/storage`, `lib/user`, `expo-router`

### Synchronous setters

| # | Test | Description |
|---|------|-------------|
| 1 | setUser sets user in store | `setUser(mockUser)` → `state.user === mockUser` |
| 2 | setToken sets token in store | `setToken('tok')` → `state.token === 'tok'` |
| 3 | setSelectedRole sets selectedRole | `setSelectedRole('owner')` → `state.selectedRole === 'owner'` |

### `login`

| # | Test | Description |
|---|------|-------------|
| 4 | posts credentials, stores tokens, fetches profile, and sets authenticated state | `POST /auth/login`; tokens persisted to storage; `getCurrentUserProfile` called; `isAuthenticated:true`, `isLoading:false` |
| 5 | sets isLoading false even when login fails | network error thrown → `isLoading:false` |

### `register`

| # | Test | Description |
|---|------|-------------|
| 6 | posts to /auth/register with role uppercased and strips confirmPassword/terms | `role:'student'` → `role:'STUDENT'` in body; `confirmPassword` and `terms` absent |
| 7 | maps owner role to OWNER | `role:'owner'` → `role:'OWNER'` in body |
| 8 | sets isLoading false after registration fails | error thrown → `isLoading:false` |

### `logout`

| # | Test | Description |
|---|------|-------------|
| 9 | calls /auth/logout with the stored refreshToken, clears storage, and resets state | `POST /auth/logout` with `{refreshToken:'rt'}`; `storage.clear()` called; state reset |
| 10 | still clears state even if logout API call fails | network error → state still reset, storage cleared |
| 11 | reads refreshToken from storage when store has none | falls back to `storage.getRefreshToken()` → sent to API |

### `checkAuth`

| # | Test | Description |
|---|------|-------------|
| 12 | returns false when no refresh token in storage | `storage.getRefreshToken()` → `null` → returns `false` |
| 13 | refreshes tokens, fetches profile, and returns true on success | `POST /auth/refresh`; new tokens stored; `getCurrentUserProfile` called; `isAuthenticated:true`; returns `true` |
| 14 | returns false and calls logout when refresh fails | expired token → error → `logout()` called → returns `false` |

### `hydrate`

| # | Test | Description |
|---|------|-------------|
| 15 | does nothing when no token in storage | all storage values `null` → `isAuthenticated:false` |
| 16 | sets authenticated state from storage when all values present | token, refreshToken, user all present → `isAuthenticated:true` |
| 17 | falls back to stored user when getCurrentUserProfile fails | `getCurrentUserProfile` rejects (offline) → stored user used, `isAuthenticated:true` |

### `updateProfile`

| # | Test | Description |
|---|------|-------------|
| 18 | calls updateCurrentUserProfile, merges result, and persists to storage | `updateCurrentUserProfile` called; merged user saved to storage; `user.firstName` updated; `isLoading:false` |

### `refreshProfile`

| # | Test | Description |
|---|------|-------------|
| 19 | fetches fresh profile and merges with current user | `getCurrentUserProfile` called; fresh `phone` merged into stored user; `storage.setUser` called |

---

## Infrastructure

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration — `testEnvironment: node`, `babel-jest` transform, `@/` alias mapping, `transformIgnorePatterns` for Expo/RN packages |
| `__mocks__/expo-secure-store.ts` | In-memory SecureStore mock with `getItemAsync`, `setItemAsync`, `deleteItemAsync` as jest spies |
| `lib/__mocks__/api.ts` | Manual axios mock — exposes `get`, `post`, `put`, `patch`, `delete` as jest functions; prevents `expo-router`'s JSX/ESM chain from loading |
