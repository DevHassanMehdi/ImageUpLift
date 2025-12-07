# ImageUpLift

AI-powered image conversion and enhancement suite with a modern web UI. Upload an image, get smart recommendations for the best mode/settings, preview before/after, revisit past conversions, and track usage with built-in analytics.

## Highlights
- **Smart recommendations**: CLIP/GPT-informed pipeline inspects uploads (metadata, sharpness, content type) to auto-select mode and parameters.
- **Multiple modes**: Vectorize, Outline, Enhance, with alpha-safe handling for transparent logos.
- **Rich preview**: Side-by-side compare, drag divider, press-and-hold zoom, dark/light aware.
- **History & re-run**: Gallery backed by a database; filter, reopen, and re-run conversions with new settings.
- **Analytics**: Mode usage, performance, content mix, daily trends, and peak hours from live conversion data.
- **Modern UI/UX**: Responsive, unified light/dark themes, smooth transitions, consistent cards/buttons/sliders.

## Tech Stack
- **Frontend**: React, Recharts, modern CSS (themed light/dark), componentized layout.
- **Backend**: FastAPI/Python, CLIP/GPT-based recommendation pipeline, OpenCV, ESRGAN (Real-ESRGAN), VTracer, Potrace, torch.
- **Data/Infra**: SQLite/DB models, REST APIs, file storage for inputs/outputs, analytics aggregation.

## Project Structure
- `frontend/` — React app (Convert, Gallery, Analytics). See `frontend/README.md`.
- `back-end/` — FastAPI services, conversion/recommendation/analytics pipelines. See `back-end/README.md`.

## Getting Started
1) Install and run backend: see `back-end/README.md`.
2) Install and run frontend: see `frontend/README.md`.
3) Open the web app, upload an image, explore recommendations, conversions, gallery, and analytics.

## Links
- Backend docs: [`back-end/README.md`](back-end/README.md)
- Frontend docs: [`frontend/README.md`](frontend/README.md)
