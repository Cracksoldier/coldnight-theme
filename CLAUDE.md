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
│   ├── fonts/           ← self-hosted woff2 files (JetBrains Mono + Roboto)
│   └── js/              ← vanilla JS; copied verbatim to public/js/
└── scripts/
    └── helpers.js       ← Hexo helper + tag plugin registrations
```

## CSS rules

- Never hardcode color values — always reference a variable from `_variables.scss`.
- `$font-sans` and `$font-mono` are **unquoted** SCSS lists. Wrapping them in quotes causes the browser to treat the entire comma-separated value as one unrecognised font name.
- All spacing uses `$sp-*` tokens from `_variables.scss`. Do not use raw `px` or `rem` values for spacing.

## Fonts (self-hosted)

Fonts are **not** loaded from the Google Fonts CDN. The woff2 files (latin + latin-ext subsets of JetBrains Mono and Roboto) live in `source/fonts/`; the `@font-face` rules are in `source/css/_fonts.scss` (imported first by `style.scss`).

- `src:` URLs in `_fonts.scss` must be **relative** (`../fonts/…`) so they resolve correctly on subdirectory deployments — never root-absolute `/fonts/…`.
- `head.ejs` preloads the primary body font (`roboto-latin-400-normal.woff2`).
- To add weights/styles, download the woff2 + unicode-range blocks from the fonts.googleapis.com css2 API (with a woff2-capable User-Agent) and regenerate the `@font-face` rules — keep `font-display: swap`.

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
- Canonical and `og:url` use `page.permalink || url` (Hexo's per-page `url` local) with a trailing `index.html` stripped — never fall back to `config.url`, or every archive/tag page canonicalises to the site root.
- `og:locale` needs territory form (`en_US`, `de_DE`); `config.language` is usually bare. `head.ejs` maps it (exceptions table + `xx_XX` fallback).
- Post covers and the pinned hero are the LCP element: they must stay `loading="eager" fetchpriority="high"`. The blanket lazy-load pass in `helpers.js` skips any `<img>` that already has a `loading=` attribute.
- JSON-LD (`BlogPosting` + `BreadcrumbList`, posts only) is emitted in `head.ejs` via `<%- JSON.stringify(obj).replace(/</g, '\\u003c') %>` — the raw `<%-` is required (JSON must not be HTML-encoded) and the `<` escape prevents `</script>` breakout from post titles/descriptions. Never switch it to `<%=`.

## Cached site-wide helpers

`related_posts(page, limit)` and `pinned_post()` (registered in `scripts/helpers.js`) replace inline `site.posts` scans in templates. They build a tag/category index once per generation cycle — caches are reset in the `before_generate` filter. Never iterate all of `site.posts` inside a per-post EJS template; add or reuse a cached helper instead (inline scans are O(n²) over a full build).

Related-post scoring: 2 pts per shared tag, 1 pt for the same first category; ties broken by date (newest first).

## Showroom generator

Registered in `scripts/helpers.js`. Key rules:

- The `layout` key in each route object must be at the **top level**, not inside `data`. Hexo uses it to select the EJS template; inside `data` it serialises to JSON instead.
- The generator paginates at 9 projects per page, emitting `showroom/index.html` (page 1) and `showroom/page/N/index.html` for subsequent pages.
- Projects are collected via the shared `collectProjects(locals)` (see "Showroom project collection" below).

## Shared page description

`pageDescription(page)` in `scripts/helpers.js` is the **single** description chain — `description:` → excerpt → start of the body — consumed by both `head.ejs` (og:description / meta description / JSON-LD, via the registered `page_description` EJS helper) and the llms.txt generator. Do not re-implement the chain inline anywhere.

- Each candidate is normalised (`plainText`: stripHtml + entity decode + whitespace collapse) **before** the fallback decision — an excerpt that strips to whitespace (image- or code-only intro) must not short-circuit the chain.
- The body fallback bounds input to 4 KB before the regex passes and trims a cut-off partial tag or unclosed `<pre>`/`<figure>`/`<math>` block so no markup/code text leaks.
- No length cap inside — callers cap (`head.ejs` slices at 160 with `config.description` fallback; the generator caps at 200 on a word boundary).

## llms.txt generator

Registered in `scripts/helpers.js` above the showroom generator. **Opt-in**: `llms_txt.enabled` defaults to `false`; when enabled, `llms_txt.full: false` suppresses the companion `llms-full.txt`. **Per-page opt-out**: `llms_txt: false` front-matter excludes a post/project/page from both files — check `included()` when adding new sections.

- `/llms.txt` — llmstxt.org index: `# config.title`, `> config.description` (both run through `plainText` — multi-line YAML must not inject markdown structure), then `## Posts` (newest first), `## Projects` (via the shared `collectProjects`), `## Optional` (remaining titled pages). Descriptions come from the shared `pageDescription` chain; projects prefer a `plainText`-sanitised `subtitle:`.
- `/llms-full.txt` — full markdown body of each post/project via `page._content` (raw markdown, front-matter already removed), **not** `stripHtml(page.content)` — `stripHtml` removes `<pre>`/`<figure>` wholesale and would drop every code block. `<!-- more -->` markers are stripped; unrendered `{% … %}` tags in the body are acceptable. Note `_content` bypasses render-time transforms — a site using content-protection plugins must opt affected posts out via `llms_txt: false`.
- URLs come from `page.permalink` with a trailing `index.html` stripped — same rule as canonical/og:url in `head.ejs`. Link labels are markdown-escaped (`[` `]`); link targets percent-encode `(` `)` and whitespace (`escMdUrl`) so explicit `permalink:` front-matter can't truncate the link.
- Routes return plain strings — Hexo serves `.txt` string routes verbatim as `text/plain`.

## JSON Feed generator

Registered in `scripts/helpers.js` next to the llms.txt generator. Emits `/feed.json` (JSON Feed 1.1) — **default on** (`json_feed.enabled: true`), independent of `social.rss`; `json_feed.limit` caps items (invalid/missing → 20). `head.ejs` emits the `application/feed+json` alternate link under the same gate.

- Item `id`/`url` come from `cleanPermalink(post)` — same trailing-`index.html` rule as canonical/og:url.
- `content_html` absolutises root-relative `href`/`src` values via `origin = new URL(config.url).origin` — root-relative paths already contain `config.root`, so prepending the bare origin is correct on subdirectory deployments. Do not use `config.url` here (would double-apply the root).
- `date_modified` is only emitted when `updated:` is explicit in front-matter, via the shared `hasExplicitUpdated()` — same mtime rationale as the stale-warning section.
- `feed_url` is built with `new URL(config.root + 'feed.json', config.url)` — subdirectory-safe.
- String route (`{ path, data: JSON-string }`), like llms.txt.

## Internal link checker

Two-phase design in `scripts/helpers.js` (`link_check.enabled`, default on; `link_check.fail`, default off):

1. **Collect** — an `after_render:html` filter (public alias of `_after_html_render`, executed per-route with `locals.path` = route path) regexes `href` values out of final HTML into a module-level array (reset in `before_generate`). Entries without a string `locals.path` are skipped (view-render call sites pass a source path instead).
2. **Validate** — a `before_exit` filter builds a `Set` from `hexo.route.list()` (accepting `p`, `p + 'index.html'`, `p + '/index.html'`) and checks every collected internal href: skips fragments/`mailto:`/`tel:`/`javascript:`/`data:`/protocol-relative/other-host; strips origin + `config.root`; resolves page-relative paths against the linking page. Findings are **aggregated by missing target** (one warn line per target with count + up to 3 example pages). With `fail: true` it logs `hexo.log.fatal` and sets `process.exitCode = 1`.

**Why not `after_generate`**: generation runs routes with `cache: false`; reading lazy route streams there would render everything a second time. Collect-during-render avoids that. The `locals.path` route-path argument is the one internal-behavior dependency — if it breaks on a Hexo upgrade, the fallback is an `after_generate` stream read at the cost of a double render.

## Glossary tooltips

`glossary: true` (default on) wraps the **first occurrence** per post of each term from the site's `source/_data/glossary.yml` (flat map, multi-word keys quoted) in `<abbr class="glossary-term" title="definition">`. Implemented as an `after_post_render` filter in `scripts/helpers.js`; styled in `_typography.scss` (dotted `$accent-light` underline, `cursor: help`).

- Terms are compiled once per generation into a longest-first alternation regex (`_glossaryCache`, reset in `before_generate`).
- **Protected-region split**: the content is split on `<pre>`/`<code>`/`<a>`/`<abbr>`/`<h1-6>`/`<figure>` blocks and bare tags; only inter-tag text chunks are matched — guarantees no wraps inside attributes, code, existing links, or headings.
- Known limitation: ASCII `\b` boundaries — symbol-edged terms like `C++` won't match.

## Stats page

`stats.enabled` is **opt-in** (default `false`). When enabled, a generator in `scripts/helpers.js` emits `stats/index.html` via `layout/stats.ejs` (top-level `layout: ['stats']` key — same rule as the showroom generator). Zero client JS; year-bar widths are server-computed integer percentages in inline `style=` (same posture as `--compare-pos`).

- Word totals use the shared `countWords()` (also feeds `reading_time`/`word_count`).
- Year buckets use the heatmap timezone pattern (`post.date.clone().tz(config.timezone)` when set).
- **Streak = consecutive months with ≥1 post** (day streaks degenerate to 1 on typical blogs).
- Sites enabling it should also add a `Stats` navbar link via `theme_config:` — never in the theme's own `_config.yml`.

## Share buttons (post footer)

Gated by `social.share` (default off). X/Twitter, LinkedIn, Bluesky are plain intent-URL anchors — zero JS. Copy-link and **Mastodon** are wired in `copy-code.js`:

- Mastodon has no central instance, so the button prompts for a domain (prefilled from localStorage key `coldnight:mastodon-instance`; cancel = no-op). Input is sanitised (scheme/path stripped, lowercased) and validated against `/^[a-z0-9.-]+\.[a-z]{2,}$/` — invalid → error toast. The share URL scheme is **hardcoded** (`'https://' + domain + '/share?text=…'`) so `javascript:` can never survive; opened with `window.open(url, '_blank', 'noopener')`. localStorage access is try/catch-wrapped (private-mode Safari throws).

## Showroom project collection

`collectProjects(locals)` / `isProject(p)` in `scripts/helpers.js` are the single definition of "what is a showroom project" (`layout === 'project' && path.startsWith('showroom/')`, newest first) — used by both the showroom and llms.txt generators. Never inline the predicate again; the llms.txt `## Optional` classification is defined as `!isProject`, so a drifted copy silently reclassifies pages.

## Showroom AI-assisted badge

The `ai_assisted` front-matter field (bare YAML boolean) renders a blue pill badge on the project card. Template uses strict `=== true` checks throughout — `!!` coercion must not be used because truthy non-boolean values like `"no"` or `1` would be misclassified. CSS for the badge is `.project-card__ai-badge` in `_components.scss`.

## Difficulty meter

The `difficulty_meter(post, variant?)` helper (registered in `scripts/helpers.js`) renders the optional `difficulty:` / `effort:` front-matter as a 1–5 signal-bar pill (`.difficulty` in `_components.scss`).

- Validation: only integers 1–5 render (integer strings like `"3"` are coerced; anything else — non-integer values, out-of-range, words — silently renders `''`). `difficulty:` wins over `effort:`; if `difficulty:` is present but invalid there is **no fallback** to `effort:`.
- The label word follows the front-matter key that supplied the value: `difficulty:` → "Difficulty: N of 5", `effort:` → "Effort: N of 5".
- Global opt-out: `theme.difficulty === false` short-circuits inside the helper — call sites need no gating.
- Call sites (5): `post.ejs` (`.post-meta`), `_partial/post-card.ejs`, `_partial/pinned-post.ejs`, `showroom.ejs` (overlay variant: `difficulty_meter(p, 'overlay')`, positioned top-left — top-right belongs to the AI badge), `project.ejs` (`'page'` variant — `.difficulty--page` carries the bottom margin, no sibling selectors). Deliberately **not** on archive/tag/category pages.
- Filled-bar colour shifts by level: `$success` (1–2), `$amber` (3), `$danger` (4–5). Accessibility: the pill has `role="img"` + `aria-label`; individual bars are `aria-hidden`. The **overlay variant is fully `aria-hidden`** (only a `title` tooltip) so the level does not pollute the card link's accessible name — do not add `role="img"` back to it.
- The pill chrome is shared via the `%accent-pill` placeholder in `_components.scss` (also consumed by `.series-nav__badge`) — restyle the pill there, not per-component.

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

## Navbar brand icons & favicon

`navbar.icon` (before the title) and `navbar.icon_after` (after the title) accept **an image path or a text/emoji snippet**. Top-level `favicon` accepts **an image path only**. Image detection is the shared `is_image_path()` helper in `scripts/helpers.js` (extension allowlist `svg|png|jpe?g|gif|webp|ico|avif`, optional query string); its sibling `image_mime()` maps the same allowlist to MIME types. **Never re-inline the extension list in a template** — header.ejs and head.ejs both consume these helpers so the sniff rule and the MIME map cannot drift.

- Non-string config values (bare YAML booleans/numbers) are ignored, not stringified — `cfgStr` in `header.ejs`, `typeof` check in `head.ejs`.
- Image branch: `src`/`href` uses `<%= url_for(...) %>` — url_for for subdirectory deployments, **escaped** because hexo-util's `url_for` returns absolute `http(s)://` values verbatim (a quote in a query string would break out of the attribute under `<%- %>`). EJS escaping of `&`/`"` in a URL attribute is valid HTML.
- Text branch is emitted escaped via `<%= %>` — inline SVG in config is deliberately not supported; ship a file instead. Text icons get `width: auto; min-width: 28px; white-space: nowrap` (`.navbar__logo--text`) so multi-character values widen the box instead of overflowing it.
- `favicon` values that fail `is_image_path()` (text, unknown extension, non-string, empty) fall back to the legacy pair: `/favicon.svg` + `/favicon.ico` links. The `type` attribute always comes from `image_mime()`, never from the raw config value.
- Both brand slots are `aria-hidden` / empty-`alt` so the brand link's accessible name stays the `aria-label`. `.navbar__icon-after` hides below `$bp-tablet` together with `.navbar__title`; the before-icon stays visible on mobile.
- `navbar.icon_color` / `navbar.icon_after_color` set the text-icon font colour via an inline `style="color: …"` on the span (config-driven colours can't live in compiled SCSS — same reason as the view-transitions inline style). The value is **allowlist-validated** (`ICON_COLOR_RE`: hex, keyword, and `rgb()/rgba()/hsl()/hsla()/hwb()/lab()/lch()/oklab()/oklch()/color()/var()` with `[\w\s.,%/#-]` args — covers modern space/slash syntax) before being interpolated raw — quotes, semicolons, and nested parens never pass, preventing CSS/attribute injection (same posture as the model-viewer `height` allowlist). Invalid values are silently dropped (inherit). Image icons ignore these keys. Note: colour only affects glyphs rendered as text — colour-emoji glyphs ignore CSS `color`.

## Archive filter chips

Uses the `hidden` attribute (not `display:none`) for accessible show/hide. JS is in `source/js/archive-filter.js` (IIFE pattern). The archive/tag/category pages require `per_page: 0` in the site config — guaranteed by the site repo, not the theme.

## PDF viewer tag

`{% pdf /path/to/file.pdf Optional Title %}` emits a `.pdf-card` div with `data-pdf-src` and `data-pdf-title` attributes. The JS (`pdf-viewer.js`) reads both from `dataset` — never query child elements for the title. The modal is a lazily-created native `<dialog>`; PDF.js is loaded from jsDelivr CDN on first click only.

## Tag plugins (all in `scripts/helpers.js`)

| Tag | Syntax |
|-----|--------|
| `{% note %}` | `{% note info/tip/warning/danger %}...{% endnote %}` — type is allowlisted against `NOTE_ICONS`; unknown types fall back to `info` |
| `{% tabs %}` | `{% tabs %}<!-- tab Name -->...<!-- endtab -->{% endtabs %}` |
| `{% gallery %}` | `{% gallery cols %}![](img)...{% endgallery %}` |
| `{% timeline %}` | `{% timeline %}<!-- event DATE -->...<!-- endevent -->{% endtimeline %}` |
| `{% spoiler %}` | `{% spoiler Label %}...{% endspoiler %}` |
| `{% download %}` | `{% download /path/to/file Label %}` |
| `{% pdf %}` | `{% pdf /path/to/file.pdf Optional Title %}` |
| `{% video %}` | `{% video <url> Optional Caption %}` |
| `{% model %}` | `{% model src="/models/foo.glb" [height="400px"] [bg="#111"] [view="iso"] [autorotate="true"] [caption="…"] %}` |
| `{% audio %}` | `{% audio src="/audio/file.mp3" [title="…"] [caption="…"] %}` |
| `{% compare %}` | `{% compare before="/a.png" after="/b.png" [label_before="…"] [label_after="…"] [caption="…"] %}` |

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

## ePub export

`source/js/epub-export.js` builds the ePub client-side with JSZip. Two invariants:

- **Content is serialized with `XMLSerializer`**, never `innerHTML` — `innerHTML` emits named entities (`&nbsp;`) and unclosed voids that strict ePub readers reject as invalid XML.
- **Images are fetched and bundled** into `OEBPS/images/` with manifest entries so the file works offline. Unfetchable images (CORS-blocked hotlinks) fall back to their absolute URL, keeping the XHTML valid.

## Code block collapse

Long code blocks auto-collapse behind a "Show N more lines" button (`code.collapse`, default on; threshold `code.collapse_lines`, default 25). Implementation is split between `copy-code.js` and `_code.scss`:

- **Config reaches the static JS via a `data-collapse-lines` attribute** on the copy-code.js `<script>` tag in `post.ejs` (same pattern as search.js's `data-search-url`); the attribute is omitted entirely when `code.collapse: false`, and copy-code.js treats a missing/invalid value as disabled.
- **No-JS = fully expanded** — JS adds `.code-collapsible.is-collapsed` and the `.code-collapse` footer; the CSS `max-height` only applies under `.is-collapsed`. Never move the collapsed state into build-time markup.
- **Hysteresis**: `COLLAPSE_MARGIN = 5` in copy-code.js — a block only collapses when it exceeds `collapse_lines + 5`, so the button never hides ≤5 lines.
- Line counting prefers `td.gutter .line` spans (exact for hljs figures), then `<br>` count + 1, then `textContent` newlines (bare `<pre>`).
- The collapsed height is a CSS calc from `--code-visible-lines` × `$code-line` (`_code.scss`) — `$code-line` is an **absolute** line-height shared by the gutter and code columns; don't change one without the other or line numbers drift.
- Print always expands (`_print.scss`). Copy button is unaffected (it clones the code node, not the visible layout).
- No per-block opt-out yet; the future path is extending the `data-lang`/`data-filename` regex pass in `scripts/helpers.js` (e.g. a `// no-collapse` first-line comment).

## Search

`source/js/search.js` filters the full `search.json` content (title + entire body + tags) — do not re-introduce a content-length cap, it silently hides results. `mark()` takes **plain unescaped text** and escapes segment-wise around a single alternation regex; never apply per-term `.replace()` passes to already-escaped HTML (terms like `amp` or `mark` would match inside entities/tags and corrupt the markup).

## Giscus comments

`layout/_partial/giscus.ejs` renders the `<script>` tag that loads the Giscus iframe from `giscus.app`. It is included from `post.ejs` when `theme.giscus.enabled` is `true`, `repo` and `category_id` are non-empty, and `page.comments !== false`.

All config values are output via EJS `<%= %>` (auto-HTML-encodes). `mapping` is validated against an explicit allowlist; `theme` against `/^[a-z_]+$/`; `lang` is stripped of non-`[a-z-]` chars.

To enable: fill in the IDs from the [giscus.app](https://giscus.app) setup wizard and set `giscus.enabled: true` in the theme config (or site `theme_config:`). To suppress on a single post, add `comments: false` to front-matter.

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

## Compare slider

`{% compare before="..." after="..." %}` renders a before/after image slider (`<figure class="compare-slider">`). The interactive control is a transparent full-size native `<input type="range">` — pointer, touch, and keyboard handling come free; do not replace it with custom drag handlers. The *before* image is clipped via `clip-path: inset(0 calc(100% - var(--compare-pos)) 0 0)`; `compare-slider.js` (IIFE, conditionally loaded like audio/model) only updates the `--compare-pos` custom property. Without JS the slider is a static 50/50 split. Both images carry explicit `loading="lazy"` so the blanket lazy pass skips them. Disable globally with `compare_slider: false`.

## Stale-post warning

Opt-in via theme config (`stale_warning.enabled` + `stale_warning.months`, default 24); per-post opt-out with `stale_warning: false` front-matter. Rendered in `post.ejs` reusing the `{% note %}` warning markup (`.note.note-warning.stale-warning`).

- **Age is computed at build time** — fine for static sites (rebuilds happen on publish), but the banner does not age in place on a stale deployment.
- **`page.updated` is only trusted when `updated:` is explicit in front-matter**, via the `has_explicit_updated(page)` helper in `scripts/helpers.js` (parses `page.raw`; handles hexo-front-matter's optional leading `---`). With Hexo's default `updated_option: 'mtime'`, `page.updated` falls back to file mtime, which is "now" on fresh clones/CI and would permanently mask the banner. Do not simplify to `page.updated || page.date`. The JSON-LD `dateModified` in `head.ejs` uses the same helper for the same reason.

## View transitions & reduced motion

- `head.ejs` emits an inline `<style>@media not (prefers-reduced-motion: reduce){@view-transition{navigation:auto}}</style>` when `view_transitions !== false` — inline because compiled SCSS can't read theme config. Progressive enhancement; non-supporting browsers ignore it.
- `prefers-reduced-motion: reduce` coverage: central block in `_base.scss` (scroll-behavior, `.fade-in`, `.toast`) plus co-located nested `@media` blocks in `_components.scss` (toc-drawer entrance animations, hover zoom/lift transforms — opacity/color transitions are kept). JS honours it via `matchMedia` in `back-to-top.js` (instant jump) and `model-viewer.js` (no autorotate). **Loading/progress indicators (`model-viewer-spin`, `audio-pulse`) are intentionally exempt** — they convey state, not decoration.

## helpers.js gotchas

- `stripHtml` (feeds `reading_time` / `word_count`) strips `<math>` elements — KaTeX emits every formula twice (MathML + HTML) and counts would double without this.
- The `external_links` filter strips a leading `www.` from both hostnames before comparing — `www.example.com` and `example.com` are the same site.

## JS patterns

All JS files are standalone IIFEs (`(function () { 'use strict'; ... })()`). No bundler. Files are copied verbatim to `public/js/`. Each script is only loaded on the pages that need it — check the relevant `.ejs` template for the `<script>` tag.
