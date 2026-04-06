<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/32e53ee5-60f0-4b97-9008-f146278ceb17

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set environment values in [.env.local](.env.local):
   - `GEMINI_API_KEY` (if Gemini features are used)
   - `VITE_API_BASE_URL` (optional; defaults to same-origin `/api`)
3. Run the app:
   `npm run dev`
