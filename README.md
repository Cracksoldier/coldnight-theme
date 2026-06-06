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
- Showroom page — paginated project portfolio with optional AI-assisted badge
- Accessible: skip nav, ARIA labels, keyboard navigation

## Requirements

- Hexo 6+
- `hexo-renderer-dartsass` (SCSS compilation)
- `hexo-renderer-marked` (Markdown)

## Installation

### Via npm

```bash
npm install hexo-theme-coldnight
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
| `navbar.links` | Home, Archive, Links, Showroom, About | Navbar link list |
| `sidebar.position` | `right` | `left` \| `right` \| `hidden` |
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
| `permalink_button` | `true` | Copy-permalink icon in post metadata |
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
| `grid.columns` | `1` | Index page columns (1 = list, 2–6 = grid) |
| `grid.rows` | `3` | Rows per page; `per_page` is set to `columns × rows` |
| `cover.default` | `""` | Fallback cover image path |
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
| `model_viewer.enabled` | `true` | Enable the `{% model %}` Three.js viewer tag |
| `model_viewer.background` | `"#1a1a2e"` | Default canvas background colour for `{% model %}` |
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
cover_image: /images/cover.jpg      # optional; falls back to cover.default
cover_caption: "Photo by Jane Doe"  # optional; wraps cover in <figure><figcaption>
excerpt: "Override the auto-excerpt shown on post cards."
updated: 2026-06-01                 # optional; shows "↻ Updated YYYY-MM-DD"
pinned: true                        # optional; featured hero on index page 1
series: My Series Name              # optional; numbered series navigation strip
---
```

`<!-- more -->` in the post body also sets the excerpt boundary.

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

Supports YouTube, Vimeo, and direct video URLs.

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
