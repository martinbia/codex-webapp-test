# codex-webapp-test

Clickable webapp prototype for Android tablets.

## Demo

A small, touch-friendly, responsive German-language webapp for showing a clickable mock-up. The home screen links to three example views:

- **Informationen** — short placeholder copy and a locally embedded SVG illustration.
- **Übungen** — a three-step example walkthrough (not medical guidance).
- **Videos** — select a local folder (for example, Android Documents/SMART) and play its videos directly on the device.

Each detail view includes a way to return to the home screen. The back/forward browser history also works via URL hashes.

## Files

- `index.html`: four accessible HTML views and example content
- `style.css`: touch-first layout, mobile/tablet breakpoints, colors and illustrations
- `app.js`: minimal hash-based view navigation, route-change events, page titles, and service worker registration
- `video-library.js`: local Android folder/file selection, IndexedDB handle persistence, permissions and HTML5 playback
- `manifest.webmanifest`: PWA metadata, relative start URL and standalone display mode
- `service-worker.js`: caches the local app shell to support offline use
- `icons/`: Android home-screen and maskable PNG icons

No build step, package installation, account, backend, paid API or server-side processing is necessary. IndexedDB stores only a selected directory handle; video bytes are not copied to IndexedDB, GitHub or any server. The demo loads an optional Google Fonts webfont; system fonts are used if it is unavailable, including offline. All other assets and graphics are stored locally in the project.

## Install as an Android PWA

1. Open the published GitHub Pages URL in **Google Chrome** on the Android tablet.
2. After the new release is deployed, **remove the old home-screen shortcut**, if present.
3. Open Chrome's three-dot menu and choose **Install app** (or **Add to Home screen → Install** if that option appears).
4. Launch the installed **Mock-up** icon from the home screen. The manifest requests `display: standalone`, so the installed app should appear without Chrome's address and tab bars.
5. Reload the app once while online before testing offline behavior. Once the service worker has installed and cached all required local assets, the app shell is available offline.

Note: Some Android browsers/devices may offer only a browser shortcut rather than installation. The service worker requires HTTPS (provided by GitHub Pages) and can use the browser's cache. On a first visit, stay online until the service worker finishes installing. When GitHub Pages is updated, reopen online for fresh content; external Google Fonts are not cached for offline use.

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
- [ ] Confirm local file playback and clear messaging for unsupported video formats.
- [ ] Confirm the installed app opens without Chrome browser controls.
- [ ] Test offline after a successful online launch and service worker installation.

All content is fictitious. Do not use this public repository to store private project data.

## Videos from Android Documents/SMART

1. In Chrome or the installed PWA, open the **Videos** page.
2. Tap **Videoordner auswählen** and use the Android picker to navigate to **Documents → SMART**. A web app cannot automatically open a particular path or discover local files without a user choice.
3. The app lists video files in that folder (MP4, WebM, OGG/OGV, MOV, M4V and 3GP extensions) sorted by filename. Tap a name to play it inline with native HTML5 controls.
4. Tap **Liste aktualisieren** after adding a new file to SMART; tap **Ordner wechseln** to choose another folder.
5. The directory handle is stored in IndexedDB for the same origin. When you reopen the PWA, it reloads the handle and checks read permission. The browser may revoke permission or prompt for it again. In that case tap **Zugriff erneut erlauben**. No permanent authorization is guaranteed.
6. Tap **Ordner vergessen** to discard the saved handle (without deleting local video files).
7. If folder picking is not available, use **Ordner als Dateien auswählen** or **Videodateien auswählen**. This fallback is session-only, and on some Android versions the folder-file picker may not be offered; the multi-file picker should still be usable.

**Browser limitations:** Use an up-to-date Chrome on Android and HTTPS. File System Access support is browser/version/device dependent; Chrome versions may expose showDirectoryPicker only in some contexts. Always check the actual device. The browser can reject restricted folder locations, and Android may expose different labels in its Documents picker. Video decoding depends on the installed codecs; MP4/H.264 + AAC is a good first test. Files within nested directories are not scanned by the persistent picker (only immediate directory entries); the folder-file fallback may return nested paths.

**Offline:** Once installed and the PWA's app shell is cached, the interface can work offline. Locally selected videos are loaded from File objects via temporary blob URLs; those URLs are revoked when switching videos, navigating away from Videos, or closing the page. Videos are *not* placed in the service-worker cache. If the Android file permission is no longer granted, selecting or re-authorizing may require a user action even when offline.

### Suggested Android validation

- [ ] Start installed PWA without browser address bar, open Videos and select Documents/SMART.
- [ ] Verify MP4 playback, pause/seek, fullscreen and volume if browser exposes it.
- [ ] Restart the PWA: saved folder is restored or a one-tap permission request appears.
- [ ] Add another video to SMART and choose Liste aktualisieren; verify sorting.
- [ ] Navigate to Informationen during playback: playback stops; return to Videos and start again.
- [ ] Try alternative folder/file selection on unsupported browsers.
- [ ] Use Ordner vergessen: confirm local video files remain untouched.
- [ ] Switch offline after first online launch and successful local access.
