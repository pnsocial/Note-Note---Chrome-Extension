# Daily Markdown Note — Chrome Extension

Replaces the **new tab** page with a **daily Markdown** journal stored locally in `chrome.storage.local` (no network upload; no cloud sync by default — the extension only uses the local storage API, not `chrome.storage.sync`).

## Features

- **One page per day** (only today is editable; past days are read-only).
- **Markdown** with rendered preview (DOMPurify + marked) and a quick format toolbar.
- **Search**, **month calendar** (popover), **export** a single day or **ZIP** all `.md` files.
- **Light/dark theme**, **word count / reading time** next to the today heading.
- Shortcuts: **Ctrl/⌘ + Shift + Y** (theme), **Ctrl/⌘ + Shift + G** (search).

## Install from a release (ZIP)

Official builds are attached to **GitHub Releases** (permanent assets, unlike Actions artifacts):

1. Open [**Releases**](https://github.com/pnsocial/Note-Note---Chrome-Extension/releases) → pick the latest or [**Latest**](https://github.com/pnsocial/Note-Note---Chrome-Extension/releases/latest).
2. Under **Assets**, download `daily-markdown-note-<version>.zip`.
3. Unzip — the top-level folder must contain `manifest.json`.
4. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → choose that folder.

> Release ZIPs are produced by the [**Release**](.github/workflows/release.yml) workflow whenever a **`v*`** tag is pushed that matches the `"version"` field in `manifest.json` (e.g. manifest `1.0.0` → tag `v1.0.0`).

## Install from source

1. Clone the repo or download the source ZIP (not the extension ZIP from Releases).
2. Chrome → `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select the project root (folder containing `manifest.json`).

## Project layout

| Path | Description |
|------|-------------|
| `manifest.json` | MV3 config, new tab override |
| `newtab.html` | New tab page |
| `css/styles.css` | Styles |
| `js/` | Editor, storage, renderer, calendar, ZIP, … |
| `icons/` | Extension icons (PNG + source SVG) |

No **npm** or bundler — runs directly in the browser.

## GitHub Actions

### Release (ZIP for end users)

When you push a `v<version>` tag that matches `"version"` in `manifest.json`, the [**Release**](.github/workflows/release.yml) workflow:

1. Verifies the tag matches the manifest version.
2. Builds `daily-markdown-note-<version>.zip`.
3. Creates a **GitHub Release** and attaches the ZIP under **Assets**.

Example for version `1.0.0` (already in `manifest.json`):

```bash
git add manifest.json && git commit -m "Bump version to 1.0.0"   # if you changed version
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

### Build (every push to `main`)

The [**Build**](.github/workflows/build.yml) workflow runs on **push** or **pull request** to `main`:

1. Validates `manifest.json` (JSON).
2. Packages the extension as `daily-markdown-note.zip` for CI smoke testing.

#### Download CI artifact

1. Open the **Actions** tab:  
   [https://github.com/pnsocial/Note-Note---Chrome-Extension/actions](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions)
2. Open the latest successful run.
3. Under **Artifacts**, download **`extension-zip`** (contains `daily-markdown-note.zip`).

> Artifacts expire per repository/org settings (often a few weeks).

### Node.js on GitHub Actions (addressed)

GitHub is deprecating **Node.js 20** as the runtime for JavaScript actions (default moves to **Node.js 24** around June 2026; Node 20 removed from runners around **September 16, 2026**). Older `actions/checkout@v4` and `actions/upload-artifact@v4` could show warnings such as:

> Node.js 20 actions are deprecated …

This repo uses **`actions/checkout@v5`** and **`actions/upload-artifact@v5`** (action runtime on Node 24), so you do not need `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` in the workflow. Details: [GitHub Blog — deprecation of Node 20 on Actions runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

[![Build](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml)

## License

Add a `LICENSE` file (e.g. MIT) when you are ready.
