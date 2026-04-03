# Boarding Creation Validation Guide (Frontend)

This document describes validation rules for creating a boarding listing via:

- **Endpoint:** `POST /api/boardings`
- **Auth:** Required (`OWNER` role)
- **Content-Type:** `application/json`

> Note: Images are **not** uploaded in this endpoint. Create the boarding first, then upload images using `POST /api/boardings/:id/images`.

---

## Request Body Rules

### Required fields

| Field | Type | Rules | Example |
|---|---|---|---|
| `title` | string | min 10, max 200 characters | `"Spacious Single Room Near Campus"` |
| `description` | string | min 30, max 5000 characters | `"Fully furnished room with attached bathroom and high-speed WiFi."` |
| `city` | string | required, non-empty | `"Colombo"` |
| `district` | string | required, non-empty | `"Western"` |
| `monthlyRent` | number (integer) | min 1000, max 500000 | `25000` |
| `boardingType` | enum | `SINGLE_ROOM` \| `SHARED_ROOM` \| `ANNEX` \| `HOUSE` | `"SINGLE_ROOM"` |
| `genderPref` | enum | `MALE` \| `FEMALE` \| `ANY` | `"ANY"` |
| `latitude` | number | 5.9 to 9.9 (Sri Lanka bounds) | `6.9271` |
| `longitude` | number | 79.5 to 81.9 (Sri Lanka bounds) | `79.8612` |
| `maxOccupants` | number (integer) | min 1, max 20 | `2` |

### Optional fields

| Field | Type | Rules | Default |
|---|---|---|---|
| `address` | string | optional | - |
| `nearUniversity` | string | optional | - |
| `currentOccupants` | number (integer) | min 0, and must be `<= maxOccupants` | `0` |
| `amenities` | array of enum strings | optional, deduplicated by backend | `[]` |
| `rules` | array of strings | each item must be non-empty | - |

---

## Amenity Values

Valid `amenities` values:

- `WIFI`
- `AIR_CONDITIONING`
- `HOT_WATER`
- `LAUNDRY`
- `PARKING`
- `SECURITY`
- `KITCHEN`
- `GYM`
- `SWIMMING_POOL`
- `STUDY_ROOM`
- `COMMON_AREA`
- `BALCONY`
- `GENERATOR`
- `WATER_TANK`

### Amenity normalization behavior

Backend normalizes amenity input by:

- trimming whitespace
- converting to uppercase
- replacing spaces/hyphens with `_`
- removing duplicates

Examples:

- `"hot water"` -> `"HOT_WATER"`
- `"air-conditioning"` -> `"AIR_CONDITIONING"`

---

## Type Expectations (Important for Frontend)

Send numeric fields as actual numbers in JSON, not strings.

✅ Correct:

```json
{
  "monthlyRent": 25000,
  "latitude": 6.9271,
  "maxOccupants": 2
}
```

❌ Incorrect:

```json
{
  "monthlyRent": "25000",
  "latitude": "6.9271",
  "maxOccupants": "2"
}
```

---

## Valid Sample Payload

```json
{
  "title": "Spacious Single Room Near University of Colombo",
  "description": "Fully furnished single room with attached bathroom, WiFi, and quiet study environment.",
  "city": "Colombo",
  "district": "Western",
  "address": "No. 120, Reid Avenue, Colombo 07",
  "monthlyRent": 28000,
  "boardingType": "SINGLE_ROOM",
  "genderPref": "ANY",
  "amenities": ["wifi", "hot water", "KITCHEN"],
  "nearUniversity": "University of Colombo",
  "latitude": 6.9022,
  "longitude": 79.8607,
  "maxOccupants": 2,
  "currentOccupants": 1,
  "rules": ["No smoking inside rooms", "Guests only until 9 PM"]
}
```

---

## Validation Error Response (422)

When validation fails, backend returns:

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must be at least 10 characters"
    },
    {
      "field": "monthlyRent",
      "message": "Expected number, received string"
    }
  ],
  "timestamp": "2026-03-20T10:30:00.000Z"
}
```

### Common validation failures

- `title` shorter than 10 chars
- `description` shorter than 30 chars
- numeric fields sent as strings
- `latitude` / `longitude` outside Sri Lanka range
- invalid enum values for `boardingType`, `genderPref`, `amenities`
- `currentOccupants > maxOccupants`
- empty string inside `rules`

---

## Frontend Validation Checklist

Before calling `POST /api/boardings`, verify:

- all required fields are present
- `monthlyRent`, `maxOccupants`, `currentOccupants` are integers
- lat/lng values are within allowed bounds
- enum values are exact (or converted before send)
- `currentOccupants <= maxOccupants`
- each rule item is non-empty after trim
- send JSON with correct data types
