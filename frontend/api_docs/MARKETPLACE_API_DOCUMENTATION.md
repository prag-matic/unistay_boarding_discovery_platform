# Marketplace API Documentation

## Base URL
```
/api/marketplace
```

This document mirrors the backend Marketplace API contract used by the mobile app and admin panel.

## Mobile/Frontend Endpoints

### Search listings
- Method: `GET`
- Path: `/marketplace`
- Query: `page`, `size`, `search`, `adType`, `category`, `city`, `district`, `minPrice`, `maxPrice`, `sortBy`, `sortDir`
- Client: `searchMarketplaceItems()` in `frontend/lib/marketplace.ts`

### Get listing by id
- Method: `GET`
- Path: `/marketplace/:id`
- Client: `getMarketplaceItemById()`

### Get my ads (student)
- Method: `GET`
- Path: `/marketplace/my-ads`
- Auth: required (`STUDENT`)
- Client: `getMyMarketplaceAds()`

### Create listing (student)
- Method: `POST`
- Path: `/marketplace`
- Auth: required (`STUDENT`)
- Client: `createMarketplaceItem()`

### Update listing (student)
- Method: `PUT`
- Path: `/marketplace/:id`
- Auth: required (`STUDENT`, owner only)
- Client: `updateMarketplaceItem()`

### Delete listing (student)
- Method: `DELETE`
- Path: `/marketplace/:id`
- Auth: required (`STUDENT`, owner only)
- Client: `deleteMarketplaceItem()`

### Upload listing images (student)
- Method: `POST`
- Path: `/marketplace/:id/images`
- Auth: required (`STUDENT`, owner only)
- Content type: `multipart/form-data`
- Field: `images`
- Max count: `4`
- Client: `uploadMarketplaceImages()`

### Report listing
- Method: `POST`
- Path: `/marketplace/:id/report`
- Auth: required
- Client: `reportMarketplaceItem()`

## Admin Endpoints

### Get open reports
- Method: `GET`
- Path: `/marketplace/reports/open`
- Auth: required (`ADMIN`)

### Takedown listing
- Method: `PATCH`
- Path: `/marketplace/:id/takedown`
- Auth: required (`ADMIN`)

### Reinstate listing
- Method: `PATCH`
- Path: `/marketplace/:id/reinstate`
- Auth: required (`ADMIN`)

### Resolve report
- Method: `PATCH`
- Path: `/marketplace/reports/:reportId/resolve`
- Auth: required (`ADMIN`)
- Body status values: `RESOLVED`, `DISMISSED`
