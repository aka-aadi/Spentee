# Spentee Web Client

React dashboard for the Spentee finance platform. Provides analytics, budgeting tools, and transaction management against the shared API.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- Running instance of the Spentee API (`server` directory)

## Environment

Create `client/.env` and configure the API base URL:

```
REACT_APP_API_URL=http://localhost:5000/api
```

For production builds, set this to the deployed API URL.

## Install and Run

```bash
# from repository root
cd client
npm install

# development server with hot reload
npm start
```

The app runs at `http://localhost:3000` by default.

## Build and Preview

```bash
npm run build          # create optimized bundle in client/build
npm install -g serve   # optional, once
serve -s build         # preview locally
```

Clean generated assets with `rm -rf build` (Linux/macOS) or `Remove-Item -Recurse -Force build` (PowerShell) before rebuilding if needed.

## Testing and Linting

```bash
npm test    # run React Testing Library suite
```

The project inherits linting from Create React App (`react-scripts`). Add custom checks via additional npm scripts if required.

## Key Libraries

- React Router for navigation
- ApexCharts and React ApexCharts for data visualizations
- Axios for API requests
- Date-fns, XLSX, and FileSaver for data transformations and exports

## Deployment

Netlify, Vercel, or static hosting can serve the build output. Typical Netlify settings:

- Base directory: `client`
- Build command: `npm install && npm run build`
- Publish directory: `client/build`
- Environment variable: `REACT_APP_API_URL` pointing to production API

Refer to the root `README.md` for the full platform architecture.*** End Patch

