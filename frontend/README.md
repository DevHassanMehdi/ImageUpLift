# ImageUpLift — Frontend

React single-page app for uploading images, applying smart recommendations, converting (vectorize/outline/enhance), browsing history, and viewing analytics. Modern light/dark UI with themed components and responsive layouts.

## Features
- **Convert page**: upload, live recommendations applied to settings, modes (vectorize/outline/enhance), themed preview/compare with press-and-hold zoom and divider controls.
- **Gallery**: DB-backed history, filter by mode, reopen conversions to re-run with new settings, one-click delete.
- **Analytics**: charts for mode usage, performance, output sizes, content types, daily trend, peak hours; themed tooltips and cards.
- **Theming/UX**: auto-detects OS light/dark, smooth transitions, consistent cards/buttons/sliders/toasts.

## Stack
- React 18, Recharts, modern CSS with CSS variables for themes.
- Uses REST APIs from the backend (see `back-end/README.md`) for conversions, gallery, analytics, and recommendations.

## Setup
```bash
cd frontend
npm install
npm start
# open http://localhost:3000
```

Env:
- `REACT_APP_API_BASE_URL` (default `http://localhost:5001`)

## Scripts
- `npm start` — dev server
- `npm run build` — production build

## Structure (key paths)
- `src/pages/Convert.jsx` — main conversion UI
- `src/pages/Gallery.jsx` — history grid
- `src/pages/Analytics.jsx` — analytics dashboard
- `src/components/` — shared UI (Navbar, PreviewPane, SettingsPanel, Gallery*, Analytics cards, Toasts)
- `src/index.css` — global theming/spacing/styles

## Notes
- Theme respects `prefers-color-scheme` and user toggle.
- Preview and gallery components are modular for reuse; light/dark sizing is aligned to avoid layout shift.
