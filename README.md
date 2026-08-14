# coldnight

A dark navy Hexo blog theme. Minimal, readable, and opinionated.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- Dark navy design with configurable sidebar
- Post grid with cover images, reading-time estimates, and optional pinned hero
- Full-text search (client-side JSON index)
- Series navigation strip for multi-part posts
- Sidebar widgets: TOC, recent posts, tag cloud, archives, about
- Tag plugin ecosystem: `{% gallery %}`, `{% note %}`, `{% tabs %}`, `{% timeline %}`, `{% spoiler %}`, `{% download %}`, `{% video %}`, `{% pdf %}`, `{% audio %}`
- KaTeX math rendering (`$...$` inline, `$$...$$` block)
- Mermaid diagram support
- In-page PDF preview via PDF.js (lazy-loaded modal)
- LightGallery image viewer with zoom and thumbnails
- ePub export button
- Privacy-friendly click-to-load video embeds (YouTube nocookie / Vimeo)
- Links page — masonry bookmark board with a configurable heading and optional tag filtering
- Showroom page — paginated project portfolio with optional AI-assisted badge
- Difficulty/effort indicator — 1–5 signal-bar meter from `difficulty:`/`effort:` front-matter on posts and projects
- Accessible: skip nav, ARIA labels, keyboard navigation

## Requirements

- Hexo 6+
- `hexo-renderer-dartsass` (SCSS compilation)
- `hexo-renderer-marked` (Markdown)

## Installation

### Via npm

```bash
npm install hexo-theme-coldnight hexo-renderer-dartsass hexo-renderer-marked
```

Set the theme in your site's `_config.yml`:

```yaml
theme: coldnight
```

Configure the theme by creating `_config.coldnight.yml` in your site root (Hexo 5+ standard — this file survives theme updates):

```yaml
# paste and customise options from node_modules/hexo-theme-coldnight/_config.yml
navbar:
  title: My Blog
```

### Via git submodule

```bash
git submodule add https://github.com/Cracksoldier/coldnight-theme.git themes/coldnight
```

Set the theme in your site's `_config.yml`:

```yaml
theme: coldnight
```

Configure via `theme_config:` in your site's `_config.yml`, or edit `themes/coldnight/_config.yml` directly.

When cloning a site that uses the submodule:

```bash
git clone --recurse-submodules <your-site-repo>
# or after a plain clone:
git submodule update --init
```

## Configuration

All options live in `themes/coldnight/_config.yml` (submodule) or `node_modules/hexo-theme-coldnight/_config.yml` (npm) and can be overridden per-site via `_config.coldnight.yml` or `theme_config:` in the site's `_config.yml`.

| Key | Default | Effect |
|-----|---------|--------|
| `navbar.title` | `"My Blog"` | Site name in the navbar |
| `navbar.icon` | `""` | Brand icon before the title: image path (`/images/logo.png`) or emoji/short text (`"❄"`); empty = built-in SVG logo |
| `navbar.icon_color` | `""` | CSS color for the text icon (e.g. `"#60a5fa"`, `steelblue`, `rgb(96 165 250 / 80%)`, `var(--accent)`); ignored for images |
| `navbar.icon_after` | `""` | Optional image path or emoji/text after the title |
| `navbar.icon_after_color` | `""` | CSS color for the after-title text icon; ignored for images |
| `navbar.links` | Home, Archive, Links, Showroom, About | Navbar link list |
| `favicon` | `""` | Favicon image path (`/favicon.png`, `/icon.svg`); empty or not an image path = theme default `favicon.svg`/`.ico` |
| `sidebar.position` | `right` | `left` \| `right` \| `hidden` |
| `sidebar.about` | `true` | `false` hides the About widget; it also hides itself when author, description, avatar and social links are all empty |
| `sidebar.widgets` | toc, recent\_posts, tags, archives, about | Widget order |
| `sponsor.enabled` | `false` | Show a sponsor/donate button |
| `social.github` | `""` | GitHub profile URL |
| `social.twitter` | `""` | Twitter/X profile URL |
| `social.rss` | `true` | RSS icon in navbar |
| `social.share` | `false` | X/Twitter + LinkedIn + copy-link buttons in post footer |
| `reading_time` | `true` | "N min read" on cards and post header |
| `word_count` | `true` | Word count in post header |
| `image_captions` | `true` | Wrap `<p><img alt="..."></p>` in `<figure><figcaption>` |
| `external_links` | `true` | `target="_blank"` + ↗ icon on external links in post body |
| `category_descriptions` | `{}` | Map of category name → hover/focus tooltip text on post pills and cards; empty = no tooltips |
| `permalink_button` | `true` | Copy-permalink icon in post metadata |
| `difficulty` | `true` | 1–5 signal-bar meter on posts, cards, and showroom projects (front-matter `difficulty:`/`effort:`) |
| `epub_export` | `true` | ePub download button in post metadata |
| `toc.enabled` | `true` | TOC sidebar widget and drawer |
| `toc.max_depth` | `3` | `2` = h2 only, `3` = h2 + h3 |
| `progress_bar` | `true` | Reading progress bar on post pages |
| `sticky_title` | `true` | Post title fades into navbar on scroll |
| `related_posts` | `true` | "You might also like" at the bottom of posts |
| `series` | `true` | Series navigation strip (requires `series:` front-matter) |
| `search.enabled` | `true` | Search box in navbar |
| `code.copy_button` | `true` | Copy-to-clipboard on code blocks |
| `code.language_label` | `true` | Language tag on code blocks |
| `code.collapse` | `true` | Auto-collapse long code blocks behind a "Show N more lines" button |
| `code.collapse_lines` | `25` | Visible lines when collapsed; blocks collapse only when longer by 5+ lines |
| `links.title` | `""` | `h1` on the links page; empty = the page's front-matter `title:`, then `"Links"` |
| `links.subtitle` | `""` | Optional line under the links-page `h1`; empty = nothing |
| `grid.columns` | `1` | Index page columns (1 = list, 2–6 = grid) |
| `grid.rows` | `3` | Rows per page; `per_page` is set to `columns × rows` |
| `cover.default` | `""` | Fallback cover image path |
| `cover.fallback` | `true` | `false` = posts without `cover_image` render no card/hero thumbnail (og:image still uses `cover.default`) |
| `cover.large` | `false` | `true` = card/hero thumbnails span the full card width above the text instead of sitting beside it (list view); per-post `cover_large:` overrides it |
| `cover.aspect_ratio` | `"16/9"` | Cover image aspect ratio |
| `lightgallery.enabled` | `true` | LightGallery CDN assets |
| `lightgallery.auto_mount` | `true` | Auto-wrap post images as gallery items |
| `lightgallery.zoom` | `true` | Zoom plugin |
| `lightgallery.thumbnail` | `true` | Thumbnail strip plugin |
| `mermaid.enabled` | `true` | Render ` ```mermaid ` blocks as SVG |
| `mermaid.theme` | `dark` | `default` \| `dark` \| `neutral` \| `forest` |
| `math.enabled` | `true` | KaTeX math rendering |
| `pdf_viewer` | `true` | Load PDF.js viewer on post pages |
| `audio_player` | `true` | Load audio player on post pages that use `{% audio %}` |
| `video_facade` | `true` | Click-to-load facade for `{% video %}` embeds; `false` = eager iframes |
| `model_viewer.enabled` | `true` | Enable the `{% model %}` Three.js viewer tag |
| `model_viewer.background` | `"#1a1a2e"` | Default canvas background colour for `{% model %}` |
| `llms_txt.enabled` | `false` | Opt-in — emit `/llms.txt` (LLM-friendly site index per [llmstxt.org](https://llmstxt.org)) |
| `llms_txt.full` | `true` | When enabled, also emit `/llms-full.txt` with complete post/project markdown |
| `giscus.enabled` | `false` | Opt-in GitHub Discussions comments widget |
| `giscus.repo` | `""` | `"owner/repo"` — from giscus.app setup |
| `giscus.repo_id` | `""` | Repo ID from giscus.app |
| `giscus.category` | `""` | Discussion category name |
| `giscus.category_id` | `""` | Category ID from giscus.app |
| `giscus.mapping` | `pathname` | `pathname` \| `url` \| `title` \| `og:title` |
| `giscus.reactions_enabled` | `true` | Emoji reactions on the discussion |
| `giscus.input_position` | `bottom` | `top` \| `bottom` |
| `giscus.theme` | `dark_dimmed` | Any valid giscus theme slug |
| `giscus.lang` | `""` | Empty = inherit `config.language` |

## Post front-matter

```yaml
---
title: My Post
date: 2026-01-01
categories: [Dev]
tags: [javascript, hexo]
cover_image: /images/cover.jpg      # optional; falls back to cover.default — `false` hides the card thumbnail for this post
cover_caption: "Photo by Jane Doe"  # optional; wraps cover in <figure><figcaption>
cover_large: true                   # optional; full-width thumbnail above the card body (overrides cover.large)
card_border: "#f5c518"              # optional; hex only — recolours this post's card/hero border
card_bg: "#1c1608"                  # optional; hex only — recolours this post's card/hero background
excerpt: "Override the auto-excerpt shown on post cards."
updated: 2026-06-01                 # optional; shows "↻ Updated YYYY-MM-DD"
pinned: true                        # optional; featured hero on index page 1
series: My Series Name              # optional; numbered series navigation strip
---
```

`<!-- more -->` in the post body also sets the excerpt boundary.

## Links page

A masonry board of external bookmarks at `/links/`. Create `source/links/index.md` with `layout: links`, then list the entries in `source/_data/links.yml`:

```yaml
- title: "Hexo Documentation"
  url: "https://hexo.io/docs/"
  abstract: "The official reference for Hexo."
  subtitle: "Static site generator"      # optional
  thumbnail: "/images/links/hexo.png"    # optional; local path or absolute URL
  tags: [docs, tools]                    # optional; list, single bare value, or omitted
```

`title`, `url`, and `abstract` are required; the rest are optional.

Tags are opt-in per entry. As soon as **any** entry has them, a single-select filter chip bar appears above the grid and each tagged card grows a row of clickable tag pills — clicking either narrows the board to that tag, and the count line switches to `N of M links`. Entries without tags stay visible only under the `All` chip. With no tags anywhere, the bar is not rendered at all.

Set the heading and an optional standfirst with `links.title` / `links.subtitle` (see [Configuration](#configuration)); by default the `h1` falls back to the page's own front-matter `title:`, then to `"Links"`.

## Showroom

The showroom is a paginated portfolio grid at `/showroom/` (9 projects per page). Each project is a Hexo page under `source/showroom/<slug>/index.md`:

```yaml
---
title: "Project Title"
subtitle: "Short tagline"
cover_image: /images/showroom/project.png
layout: project                    # required
date: 2026-01-01                   # controls sort order (newest first)
ai_assisted: true                  # optional; bare boolean — shows a badge on the card
---
```

The showroom index is generated automatically — no `source/showroom/index.md` needed.

## Tag plugins

### `{% note %}`

```
{% note info %}
An informational callout. Types: info | tip | warning | danger
{% endnote %}
```

### `{% gallery %}`

```
{% gallery 3 %}
![Alt text](/images/photo1.jpg)
![Alt text](/images/photo2.jpg)
{% endgallery %}
```

### `{% tabs %}`

```
{% tabs %}
<!-- tab Tab One -->
Content for tab one.
<!-- endtab -->
<!-- tab Tab Two -->
Content for tab two.
<!-- endtab -->
{% endtabs %}
```

### `{% timeline %}`

```
{% timeline %}
<!-- event 2026-01-01 -->
Something happened.
<!-- endevent -->
{% endtimeline %}
```

### `{% spoiler %}`

```
{% spoiler Click to reveal %}
Hidden content here.
{% endspoiler %}
```

### `{% download %}`

```
{% download /files/report.pdf Report PDF %}
```

### `{% pdf %}`

```
{% pdf /files/document.pdf Optional Title %}
```

Opens in a PDF.js modal on click. Lazy-loads PDF.js from jsDelivr on first use.

### `{% video %}`

```
{% video https://www.youtube.com/watch?v=... Optional Caption %}
```

Supports YouTube, Vimeo, and direct video URLs. YouTube and Vimeo render as a **click-to-load facade** by default: no third-party iframe until the visitor clicks play (YouTube shows its cookie-free `i.ytimg.com` thumbnail; Vimeo gets a themed placeholder — zero external requests). The injected YouTube player uses the `youtube-nocookie.com` domain. Without JavaScript the facade is a plain link to the provider watch page. Set `video_facade: false` to restore eager iframes.

### `{% model %}`

```
{% model src="/models/robot.glb" %}
{% model src="/models/part.stl" view="iso" autorotate="true" caption="Bracket assembly" %}
```

Embeds an interactive Three.js WebGL canvas. Drag to orbit, scroll to zoom, right-click to pan. Three.js is only loaded on posts that use the tag.

| Parameter | Required | Default | Notes |
|-----------|----------|---------|-------|
| `src` | yes | — | Path to `.glb`, `.gltf`, or `.stl` |
| `height` | no | `400px` | CSS length — `px\|em\|rem\|vh\|vw\|%` |
| `bg` | no | `#1a1a2e` | Canvas background colour |
| `view` | no | `front` | `front` = camera on Z axis; `iso` = isometric (1,1,1) diagonal |
| `autorotate` | no | — | Any non-empty value (e.g. `"true"`) enables continuous spin |
| `caption` | no | — | Plain-text caption below the viewer |

Set `model_viewer.enabled: false` in the theme config to disable the tag globally.

### `{% audio %}`

```
{% audio src="/audio/episode.mp3" %}
{% audio src="/audio/episode.mp3" title="Episode 1" caption="Recorded live" %}
```

Embeds a custom HTML5 audio player with dark-themed controls: play/pause, scrubable progress bar, time label, and mute toggle. Multiple players on the same page automatically pause each other when a new one starts.

| Parameter | Required | Notes |
|-----------|----------|-------|
| `src` | yes | Path to `.mp3`, `.ogg`, `.wav`, `.flac`, or `.m4a` |
| `title` | no | Player label; defaults to the filename |
| `caption` | no | Small muted text rendered below the player |

**Keyboard:** focus the seek bar and use ← / → to jump ±5 seconds.

Set `audio_player: false` in the theme config to disable the tag globally.

## llms.txt

Opt-in support for the [llms.txt convention](https://llmstxt.org) — a markdown index of the site that LLMs can consume without parsing HTML:

```yaml
llms_txt:
  enabled: true   # emit /llms.txt — site title, description, and link lists for posts, projects, and pages
  full: true      # also emit /llms-full.txt — the complete markdown body of every post and project
```

`/llms.txt` lists every post (newest first) and showroom project with a one-line description (front-matter `description:` → excerpt → start of the body; projects use `subtitle:`), plus remaining pages under an `## Optional` section. `/llms-full.txt` appends each post's and project's raw markdown body with its URL, date, and tags. Both files are generated at build time — no runtime cost.

To exclude a specific post, project, or page from both files (an unlisted page, a post you don't want packaged for LLM ingestion), set `llms_txt: false` in its front-matter.

## Giscus comments

Giscus embeds GitHub Discussions-based comments via an `<iframe>` from `giscus.app`. Anonymous visitors can read all comments; GitHub login is only required to post.

**Setup:**

1. Go to [giscus.app](https://giscus.app), connect your repo, and copy the generated IDs.
2. Set `giscus.enabled: true` and fill in the IDs in the theme config (or site `theme_config:`):

```yaml
giscus:
  enabled: true
  repo: "owner/repo"
  repo_id: "R_..."
  category: "Announcements"
  category_id: "DIC_..."
```

The widget appears below the article body on all posts. To suppress it on a single post, add `comments: false` to that post's front-matter.

## License

MIT
