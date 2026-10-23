# REDWAVE — Telegram Mini App

Static HTML/CSS/JavaScript mini app. No build step is required.

## Music catalogue
The app uses Jamendo's API and stream URLs. To use it, create a Jamendo API application at https://devportal.jamendo.com/ and copy its Client ID. Open REDWAVE, click the profile icon in the top bar, and paste the Client ID. The ID is stored in this browser's local storage. The catalogue excludes tracks shorter than 90 seconds, but actual playback availability and track duration are controlled by Jamendo and the rights holder. This is not a licence to stream commercial catalogue music.

## Cloudflare Pages via GitHub
- Put `index.html`, `style.css`, `app.js`, and `README.md` at the repository root (not inside an extra nested project folder).
- Cloudflare Pages build command: leave blank (or use `exit 0`).
- Build output directory: `.` (repository root).
- Production branch: `main` (or the actual branch containing the files).
- After each GitHub commit to the production branch, Cloudflare Pages deploys automatically.

## Notes
- Do not commit bot tokens, passwords, or private API secrets.
- Jamendo Client ID is a public client identifier, not a secret. Follow Jamendo API terms and each track's licence.
