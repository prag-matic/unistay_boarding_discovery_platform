# UniStay Frontend (Expo)

## Run locally

- `npm install`
- `npm run start`
- `npm run android`
- `npm run ios`

## Build Android/iOS (EAS)

This frontend now includes `eas.json` for cloud builds.

1. Install dependencies: `npm install`
2. Login to Expo: `npx eas login`
3. Configure project once (if needed): `npx eas init`
4. Trigger builds:
   - Android production: `npm run build:android`
   - Android preview: `npm run build:android:preview`
   - iOS production: `npm run build:ios`
   - iOS preview: `npm run build:ios:preview`

## Environment variables

Copy `.env.example` to `.env` and set required values before building.
