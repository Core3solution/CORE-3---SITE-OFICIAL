# CORE 3 — site (static)

Plain HTML/CSS/JS, no framework. Open `index.html` or serve the folder with any static server.

- `index.html` – shell, fonts, base CSS/keyframes
- `app.js` – GENERATED: Home, GlassCube and ChromeKnot templates + logic
- `dc-lite.js` – small runtime (sc-if / sc-for / {{ }} bindings / diffing)
- `assets/` – images and icons

Source of truth is the design export in `project/`. Regenerate with `node tools/build.mjs`.
Contact channels (WhatsApp, e-mail, social links, legal docs) are still placeholders; see `CONTACT` and the toasts in the Home logic.
