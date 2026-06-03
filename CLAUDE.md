# CLAUDE.md — coldnight theme

This file provides guidance to Claude Code (claude.ai/code) when working on the **coldnight Hexo theme**.

## Architecture

```
themes/coldnight/
├── _config.yml          ← theme defaults (overridable via site _config.yml theme_config:)
├── layout/
│   ├── _partial/        ← reusable fragments included via partial()
│   │   └── widgets/     ← sidebar widgets (recent-posts, tag-cloud, archive, about, toc)
│   └── *.ejs            ← one file per Hexo page type
├── source/
│   ├── css/             ← SCSS source; compiled by hexo-renderer-dartsass
│   └── js/              ← vanilla JS; copied verbatim to public/js/
└── scripts/
    └── helpers.js       ← Hexo helper + tag plugin registrations
```

## CSS rules

- Never hardcode color values — always reference a variable from `_variables.scss`.
- `$font-sans` and `$font-mono` are **unquoted** SCSS lists. Wrapping them in quotes causes the browser to treat the entire comma-separated value as one unrecognised font name.
- All spacing uses `$sp-*` tokens from `_variables.scss`. Do not use raw `px` or `rem` values for spacing.

## Page shells

- **Two-column** (`post`, `index`): `.page-wrapper` with CSS Grid (`65fr 35fr`), `.main-content` + `.sidebar`.
- **Full-width** (`archive`, `tag`, `category`, `page`, `showroom`, `project`, `links`): `.archive-wrapper`. No sidebar.
- Both shells use `width: 92%; max-width: 1600px; margin: 0 auto` — percentage scales naturally on normal monitors, the cap prevents over-stretching on ultra-wide screens. Navbar (`.navbar__inner`) and footer (`.footer-inner`) use the same constraint.
- Both need `flex: 1` because `body` is `display: flex; flex-direction: column; min-height: 100vh`.

## EJS gotchas

- `post-card.ejs` expects a local variable — always call it as `partial('_partial/post-card', { post })`.
- Cover image `src` must use `<%- url_for(coverImg) %>`, never `<%= coverImg %>` — required for subdirectory deployments.
- The tag/category page accent colour uses `<span class="page-header__accent">` — never an inline `style=`.
- For OG `og:image`, use `full_url_for(path)` not `config.url + url_for(path)` — `url_for` already prepends the root path, so manual concatenation double-applies the subdirectory; and for already-absolute URLs it produces a mangled string like `https://site.comhttps://cdn.com/img.jpg`.

## Showroom generator

Registered in `scripts/helpers.js`. Key rules:

- The `layout` key in each route object must be at the **top level**, not inside `data`. Hexo uses it to select the EJS template; inside `data` it serialises to JSON instead.
- The generator paginates at 9 projects per page, emitting `showroom/index.html` (page 1) and `showroom/page/N/index.html` for subsequent pages.
- Projects are collected by filtering `locals.pages` for `layout === 'project'` and `path.startsWith('showroom/')`.

## Showroom AI-assisted badge

The `ai_assisted` front-matter field (bare YAML boolean) renders a blue pill badge on the project card. Template uses strict `=== true` checks throughout — `!!` coercion must not be used because truthy non-boolean values like `"no"` or `1` would be misclassified. CSS for the badge is `.project-card__ai-badge` in `_components.scss`.

## Navbar defaults

`navbar.links` in `_config.yml` ships with only `[Home, Archive, About]`. **Links and Showroom are opt-in** — a site that doesn't have those pages must not show them in the nav or they will 404. Users add them back via `theme_config:` in their site's `_config.yml`:

```yaml
theme_config:
  navbar:
    links:
      - { name: Home,     url: / }
      - { name: Archive,  url: /archives }
      - { name: Links,    url: /links }
      - { name: Showroom, url: /showroom }
      - { name: About,    url: /about }
```

Never add Links/Showroom back to the theme's own `_config.yml` — it's consumed by all sites.

## Archive filter chips

Uses the `hidden` attribute (not `display:none`) for accessible show/hide. JS is in `source/js/archive-filter.js` (IIFE pattern). The archive/tag/category pages require `per_page: 0` in the site config — guaranteed by the site repo, not the theme.

## PDF viewer tag

`{% pdf /path/to/file.pdf Optional Title %}` emits a `.pdf-card` div with `data-pdf-src` and `data-pdf-title` attributes. The JS (`pdf-viewer.js`) reads both from `dataset` — never query child elements for the title. The modal is a lazily-created native `<dialog>`; PDF.js is loaded from jsDelivr CDN on first click only.

## Tag plugins (all in `scripts/helpers.js`)

| Tag | Syntax |
|-----|--------|
| `{% note %}` | `{% note info/tip/warning/danger %}...{% endnote %}` |
| `{% tabs %}` | `{% tabs %}<!-- tab Name -->...<!-- endtab -->{% endtabs %}` |
| `{% gallery %}` | `{% gallery cols %}![](img)...{% endgallery %}` |
| `{% timeline %}` | `{% timeline %}<!-- event DATE -->...<!-- endevent -->{% endtimeline %}` |
| `{% spoiler %}` | `{% spoiler Label %}...{% endspoiler %}` |
| `{% download %}` | `{% download /path/to/file Label %}` |
| `{% pdf %}` | `{% pdf /path/to/file.pdf Optional Title %}` |
| `{% video %}` | `{% video <url> Optional Caption %}` |
| `{% model %}` | `{% model src="/models/foo.glb" [height="400px"] [bg="#111"] [view="iso"] [autorotate="true"] [caption="…"] %}` |
| `{% audio %}` | `{% audio src="/audio/file.mp3" [title="…"] [caption="…"] %}` |

## Abstract block

Set `abstract:` in post front-matter to render a styled callout between the post header and body. Supports inline markdown. Rendered by `layout/_partial/post-abstract.ejs` via the `render_abstract` EJS helper (registered in `scripts/helpers.js`).

## 3D model viewer

`{% model src="..." %}` renders a Three.js WebGL canvas. The tag emits `<div class="model-viewer" data-src="...">`. `post.ejs` detects `class="model-viewer"` in `page.content` and conditionally loads Three.js and loader scripts — only on posts that use the tag.

Vendor files in `source/vendor/three/`:
- `three.module.min.js` — Three.js r170 ESM build
- `GLTFLoader.js`, `STLLoader.js`, `OrbitControls.js`, `BufferGeometryUtils.js` — addons with `from 'three'` imports rewritten to `from './three.module.min.js'`

The viewer JS is an IIFE at `source/js/model-viewer.js`. It reads `window.__THREE_VIEWER__` which the inline module script in `post.ejs` assigns after importing Three.js.

### model-viewer.js gotchas

- **`height` is allowlist-validated** in `scripts/helpers.js` — only `px|em|rem|vh|vw|%` units pass; anything else falls back to `400px`. This prevents CSS injection via semicolons (e.g. `height="400px;color:red"`). Do not relax this to `escHtml` alone.
- **`bg` is applied to `container.style.background`** at init time (before the canvas is ready) so the element shows the author's chosen colour during load and on WebGL failure, not the hardcoded CSS default.
- **`fitCamera` guards degenerate geometry** — an empty GLTF scene produces an ±Infinity bounding box; a point-mesh produces size=0. Both are clamped to `size=1`/`center=(0,0,0)` to prevent `camera.near=0`/NaN and a broken projection matrix.
- **`IntersectionObserver` gates the rAF loop** — rendering is paused when the container is off-screen and resumed when it re-enters the viewport. Falls back to an unconditional loop on browsers without IntersectionObserver.
- **`ResizeObserver` uses `entry.contentRect`** (not `container.clientWidth`) — avoids a forced reflow and correctly handles containers inside `display:none` parents (which do not re-fire the observer on reveal via clientWidth).

## Audio player

`{% audio src="..." %}` renders a custom HTML5 audio player with dark-themed controls. The tag emits `<div class="audio-player" data-src="...">`. `post.ejs` detects `class="audio-player"` in `page.content` and conditionally loads `audio-player.js` — only on posts that use the tag.

The player is a pure IIFE (`source/js/audio-player.js`) with no dependencies. At runtime it creates a hidden `<audio>` element, wires custom play/pause, seek, and mute controls, and exposes:
- Play/pause toggle (SVG icons swap; `aria-label` updated)
- Seek bar via Pointer Events API (supports both mouse and touch drag)
- Keyboard seek: focus the bar, press ← / → to jump ±5 seconds
- Mute toggle (SVG icon swaps between volume and mute)
- Loading spinner via `.is-loading` class on `waiting`/`canplay` events
- Mutual pause: starting one player automatically pauses all others on the page

Set `audio_player: false` in the theme config to disable the tag globally.

## JS patterns

All JS files are standalone IIFEs (`(function () { 'use strict'; ... })()`). No bundler. Files are copied verbatim to `public/js/`. Each script is only loaded on the pages that need it — check the relevant `.ejs` template for the `<script>` tag.
