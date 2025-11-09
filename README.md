# Spentee Platform

Multi-channel personal finance management platform with a shared Node.js API, a React web dashboard, and an Expo/React Native mobile application.

## Overview
- Unified data model served by the Express/MongoDB API in `server`.
- Rich analytics dashboard implemented with React and ApexCharts in `client`.
- Cross-platform mobile client built with Expo, React Navigation, and native modules in `mobile`.
- Shared authentication strategy based on JWT with role-aware access control.

## Implementation Highlights
- Modular domain layers: dedicated models and routes for expenses, income, budgets, EMIs, and UPI payments.
- Consistent theming and charting components across web and mobile for comparable insights.
- Context-based state management (web) and React Query-style patterns (mobile) for authenticated API consumption.
- Automated admin bootstrap driven by environment variables to simplify provisioning.

## Tech Stack

| Area   | Tech                                                     |
|--------|----------------------------------------------------------|
| API    | Node.js 18+, Express, MongoDB/Mongoose, JWT, bcrypt      |
| Web    | React 18, React Router, ApexCharts, React TSParticles    |
| Mobile | Expo 49, React Native 0.72, React Navigation, RN Charts  |
| Tooling| npm, Expo CLI, Gradle, PowerShell helper scripts         |

## Repository Layout

- `server/` – REST API and data persistence layer. See `server/README.md`.
- `client/` – Web dashboard. See `client/README.md`.
- `mobile/` – Expo/React Native app. See `mobile/README.md`.
- `package.json` (root) – shared scripts or tooling.

## Environment Configuration

- `server/.env`
  - `MONGODB_URI` (required)
  - `JWT_SECRET` (required)
  - Optional: `PORT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `client/.env`
  - `REACT_APP_API_URL` (defaults to `http://localhost:5000/api` for development)
- `mobile/.env`
  - `EXPO_PUBLIC_API_URL` (or matching key consumed in `mobile/src/config/api.js`)

Keep secrets outside of version control. Duplicate `.env.example` if present or create files manually.

## Local Development

```bash
# 1. Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ../mobile && npm install

# 2. Start API (from root)
cd server
npm run dev

# 3. Start web client (new terminal)
cd client
npm start

# 4. Start mobile app (new terminal)
cd mobile
npm run start
```

## Build and Deployment Commands

| Target | Command | Notes |
|--------|---------|-------|
| API (prod) | `cd server && npm start` | Ensure production env vars are set |
| Web build | `cd client && npm run build` | Outputs to `client/build` |
| Mobile Android bundle | `cd mobile && npm run android` | Launches Expo run:android |
| Mobile APK (Gradle) | `cd mobile/android && gradlew assembleRelease` | Produces `app/build/outputs/apk/release` |

Automated build artifacts such as `client/build` and `mobile/android/build` should be regenerated per deployment and are not tracked in git.

## Additional Documentation

- Web client details: `client/README.md`
- Mobile app guides and scripts: `mobile/README.md`
- API routes and data contracts: `server/README.md`
- Platform-specific helper docs (icons, splash screens, emulator setup) are located in the respective directories.

## Support

For issues or enhancement requests, open a ticket in the repository tracker. Pull requests are welcome after discussion.
