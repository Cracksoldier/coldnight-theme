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
- **Full-width** (`archive`, `tag`, `category`, `page`, `showroom`, `project`, `links`): `.archive-wrapper`, `max-width: 1100px`. No sidebar.
- Both need `flex: 1` because `body` is `display: flex; flex-direction: column; min-height: 100vh`.

## EJS gotchas

- `post-card.ejs` expects a local variable — always call it as `partial('_partial/post-card', { post })`.
- Cover image `src` must use `<%- url_for(coverImg) %>`, never `<%= coverImg %>` — required for subdirectory deployments.
- The tag/category page accent colour uses `<span class="page-header__accent">` — never an inline `style=`.

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

## JS patterns

All JS files are standalone IIFEs (`(function () { 'use strict'; ... })()`). No bundler. Files are copied verbatim to `public/js/`. Each script is only loaded on the pages that need it — check the relevant `.ejs` template for the `<script>` tag.
