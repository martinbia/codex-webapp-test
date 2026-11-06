# codex-webapp-test

Clickable webapp prototype for Android tablets.

## Demo

A small, touch-friendly, responsive German-language webapp for showing a clickable mock-up. The home screen links to three example views:

- **Informationen** — short placeholder copy and a locally embedded SVG illustration.
- **Übungen** — a three-step example walkthrough (not medical guidance).
- **Videos** — a clearly identified video placeholder (no video is loaded or played).

Each detail view includes a way to return to the home screen. The back/forward browser history also works via URL hashes.

## Files

- `index.html`: four accessible HTML views and example content
- `style.css`: touch-first layout, mobile/tablet breakpoints, colors and illustrations
- `app.js`: minimal hash-based view navigation and page titles

No build step, package installation, account, backend, paid API or server-side processing is necessary. There is no data storage. The demo loads an optional Google Fonts webfont; system fonts are used if it is unavailable. The other assets and graphics are embedded in the app.

## Local testing

Open `index.html` in a browser. Tap each of the three cards and use the back link. Optionally use browser developer tools to simulate portrait and landscape tablet screens. No development server is required.

## GitHub Pages deployment

After merging the pull request into `main`:

1. Open the GitHub repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose **main** and **/(root)**, then save.
4. Wait for the initial publishing action to complete and visit:
   https://martinbia.github.io/codex-webapp-test/

The project uses relative paths (`./style.css` and `./app.js`) and URL hashes, so it works correctly when GitHub Pages serves it from the `/codex-webapp-test/` subpath.

## Review checklist

- [ ] Open the initial home view.
- [ ] Open Informationen, Übungen and Videos using the cards.
- [ ] Return home from each detail view.
- [ ] Test browser back/forward behavior.
- [ ] Test tablet portrait and landscape orientations.
- [ ] Confirm that no actual video is suggested or played.

All content is fictitious. Do not use this public repository to store private project data.
