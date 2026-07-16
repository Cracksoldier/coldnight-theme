'use strict'

const themeVersion = require('../package.json').version
const moment = require('moment-timezone')

let _tabCounter = 0

const stripHtml = (html) => html
  .replace(/<(pre|figure)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  // KaTeX emits each formula twice (MathML + HTML); drop the MathML copy so
  // word/reading-time counts aren't inflated
  .replace(/<math\b[\s\S]*?<\/math>/gi, '')
  .replace(/<[^>]+>/g, '')

const escHtml = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const unescHtml = s => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")

// ─── Reading time helper ──────────────────────────────────────────────────────
// Usage in EJS: <%= reading_time(post.content) %>

const countWords = content =>
  content ? stripHtml(content).trim().split(/\s+/).filter(Boolean).length : 0

hexo.extend.helper.register('reading_time', function (content) {
  if (!content) return ''
  const minutes = Math.max(1, Math.round(countWords(content) / 200))
  return minutes + ' min read'
})

hexo.extend.helper.register('word_count', function (content) {
  if (!content) return ''
  return countWords(content).toLocaleString() + ' words'
})

// ─── Image-path helpers ───────────────────────────────────────────────────────
// Single source of truth for "does this config value name an image file" and
// its MIME type — consumed by header.ejs (navbar icons) and head.ejs (favicon).
// Usage in EJS: <% if (is_image_path(value)) %> / <%= image_mime(value) %>

const IMAGE_EXT_MIME = {
  svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon', gif: 'image/gif',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif'
}

const imagePathExt = (value) => {
  if (typeof value !== 'string') return null
  const m = value.trim().match(/\.(\w+)(\?.*)?$/)
  const ext = m && m[1].toLowerCase()
  return ext && IMAGE_EXT_MIME[ext] ? ext : null
}

hexo.extend.helper.register('is_image_path', value => !!imagePathExt(value))

hexo.extend.helper.register('image_mime', function (value) {
  const ext = imagePathExt(value)
  return ext ? IMAGE_EXT_MIME[ext] : ''
})

// ─── Abstract renderer helper ─────────────────────────────────────────────────
// Usage in EJS: <%- render_abstract(page.abstract) %>
// Renders front-matter `abstract:` field as markdown HTML.

hexo.extend.helper.register('render_abstract', function (text) {
  if (!text) return ''
  try {
    return hexo.render.renderSync({ text: String(text), engine: 'markdown' })
  } catch (e) {
    return '<p>' + escHtml(String(text)) + '</p>'
  }
})

// ─── Difficulty meter helper ──────────────────────────────────────────────────
// Usage in EJS: <%- difficulty_meter(post) %>            — post meta rows/cards
//               <%- difficulty_meter(page, 'page') %>    — project detail page
//               <%- difficulty_meter(p, 'overlay') %>    — showroom card overlay
// Renders front-matter `difficulty:` (wins) or `effort:` as a 1–5 signal-bar
// pill; the label word follows the key used. Renders '' unless the value is an
// integer 1–5 (integer strings are coerced; non-integer values are silently
// dropped — no fallback to effort: when difficulty: is present but invalid).
// theme.difficulty: false disables globally.

function difficultyLevel(post) {
  if (!post) return null
  const key = post.difficulty != null ? 'difficulty' : 'effort'
  let v = post[key]
  if (v == null) return null
  if (typeof v === 'string' && /^[1-5]$/.test(v.trim())) v = Number(v.trim())
  if (!Number.isInteger(v) || v < 1 || v > 5) return null
  return { level: v, key }
}

hexo.extend.helper.register('difficulty_meter', function (post, variant) {
  if (this.theme && this.theme.difficulty === false) return ''
  const meter = difficultyLevel(post)
  if (meter === null) return ''
  const label = (meter.key === 'effort' ? 'Effort: ' : 'Difficulty: ') + meter.level + ' of 5'
  let bars = ''
  for (let i = 1; i <= 5; i++) {
    bars += '<span class="difficulty__bar' + (i <= meter.level ? ' difficulty__bar--filled' : '') + '" aria-hidden="true"></span>'
  }
  // overlay pills sit inside the card <a>; aria-hidden keeps the level out of
  // the link's accessible name (the project page itself carries the full label)
  const aria = variant === 'overlay'
    ? 'aria-hidden="true"'
    : 'role="img" aria-label="' + label + '"'
  return '<span class="difficulty difficulty--level-' + meter.level +
    (variant ? ' difficulty--' + variant : '') +
    '" ' + aria + ' title="' + label + '">' + bars + '</span>'
})

// ─── Card / hero cover resolution ────────────────────────────────────────────
// Single definition of the thumbnail chain — consumed by post-card.ejs and
// pinned-post.ejs; never re-inline it in a template. cover_image: false
// (bare boolean) opts one post out; cover.fallback: false disables the
// site-wide cover.default fallback (the string "false" is tolerated because
// silently keeping the fallback would invert the user's intent). og:image in
// head.ejs deliberately keeps its own cover.default fallback in both cases.

hexo.extend.helper.register('resolve_cover', function (post) {
  if (post.cover_image === false) return ''
  if (post.cover_image) return post.cover_image
  const cover = this.theme && this.theme.cover
  if (!cover || cover.fallback === false || cover.fallback === 'false') return ''
  return cover.default || ''
})

// ─── TOC helper ───────────────────────────────────────────────────────────────
// Usage in EJS: <%- render_toc(page.content) %>

hexo.extend.helper.register('render_toc', function (content) {
  if (!content) return ''
  const maxDepth = (this.theme && this.theme.toc && this.theme.toc.max_depth) || 3
  const headingRe = /<h([23])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi
  const items = []
  let match
  while ((match = headingRe.exec(content)) !== null) {
    const level = parseInt(match[1], 10)
    if (level <= maxDepth) {
      items.push({ level, id: match[2], text: match[3].replace(/<[^>]+>/g, '').trim() })
    }
  }
  if (!items.length) return ''

  let html = '<ol class="toc-list">\n'
  items.forEach(function (item) {
    html +=
      '<li class="toc-item toc-item--h' + item.level + '">' +
      '<a href="#' + escHtml(item.id) + '" class="toc-link">' + escHtml(item.text) + '</a>' +
      '</li>\n'
  })
  html += '</ol>'
  return html
})

// ─── Gallery tag plugin ───────────────────────────────────────────────────────
// Usage: {% gallery [cols] %}
// ![alt text](image-url)
// ![alt text](image-url)
// {% endgallery %}

hexo.extend.tag.register('gallery', function (args, content) {
  const cols = parseInt(args[0], 10) || 3
  const mdImageRe = /!\[([^\]]*)\]\(([^)]+)\)/g

  let items = ''
  let match
  while ((match = mdImageRe.exec(content)) !== null) {
    const altE = escHtml(match[1] || '')
    const srcE = escHtml(match[2] || '')
    const dataSubHtml = altE ? ' data-sub-html="' + altE + '"' : ''
    items +=
      '<a href="' + srcE + '"' + dataSubHtml + '>' +
        '<img src="' + srcE + '" alt="' + altE + '" loading="lazy">' +
        (altE ? '<span class="lg-gallery-caption">' + altE + '</span>' : '') +
      '</a>\n'
  }

  if (!items) return ''

  return (
    '<div class="lg-gallery" data-cols="' + cols + '">\n' +
    items +
    '</div>\n'
  )
}, { ends: true })

// ─── Note/callout tag ─────────────────────────────────────────────────────────
// Usage: {% note tip %} content {% endnote %}
// Types: tip | info | warning | danger

const NOTE_ICONS = {
  tip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
}

const DOWNLOAD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
const PDF_ICON     = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
const EXTERNAL_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
const PLAY_ICON    = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
const VOLUME_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'

// ─── Language label fix ──────────────────────────────────────────────────────
// Hexo emits `<figure class="highlight bash">` but not `data-lang="bash"`.
// The CSS ::before rule uses attr(data-lang), so we inject it at build time.

hexo.extend.filter.register('after_render:html', function (html) {
  // Pass 1 — inject data-lang and optionally extract // filename: comment
  html = html.replace(
    /<figure class="highlight ([a-zA-Z0-9_+\-]+)">([\s\S]*?)<\/figure>/g,
    (match, lang, body) => {
      let dataFilename = ''
      let cleanBody = body
      const fnMatch = body.match(
        /<span class="hljs-comment">(?:\/\/|#|\/\*)\s*filename:\s*([^<]+?)(?:\s*\*\/)?\s*<\/span><br>/
      )
      if (fnMatch) {
        dataFilename = ` data-filename="${fnMatch[1].trim().replace(/"/g, '&quot;')}"`
        cleanBody = body.slice(0, fnMatch.index) + body.slice(fnMatch.index + fnMatch[0].length)
      }
      return `<figure class="highlight ${lang}" data-lang="${lang}"${dataFilename}>${cleanBody}</figure>`
    }
  )

  if (hexo.theme.config.mermaid && hexo.theme.config.mermaid.enabled) {
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/g, (figure) => {
      const codeMatch = figure.match(/<code[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)<\/code>/)
      if (!codeMatch) return figure
      // <br> must become \n (hljs encodes line breaks as <br>, mermaid needs \n).
      // Other entities are decoded so the mermaid parser receives plain text.
      // NOTE: decoding &lt; → < puts a literal < into the div's innerHTML; a
      // diagram label containing < would corrupt surrounding HTML. Edge case in
      // practice since mermaid syntax rarely uses < in node text.
      const src = codeMatch[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&#123;/g, '{').replace(/&#125;/g, '}')
        .replace(/<br>/g, '\n')
        .trim()
      return `<div class="mermaid">${src}</div>`
    })
  }

  if (hexo.theme.config.image_captions !== false) {
    html = html.replace(/<p>(<img\b[^>]*>)<\/p>/g, (match, imgTag) => {
      const altMatch = imgTag.match(/\balt="([^"]*)"/)
      const alt = altMatch ? altMatch[1].trim() : ''
      if (!alt) return match
      return `<figure>${imgTag}<figcaption>${alt}</figcaption></figure>`
    })
  }

  // Pass 4 — lazy-load all body images not already carrying a loading= attribute
  html = html.replace(/<img\b([^>]*?)(\s*\/?>)/gi, (match, attrs, close) => {
    if (/\bloading\s*=/i.test(attrs)) return match
    return `<img${attrs} loading="lazy"${close}`
  })

  return html
})

// ─── Cached site-wide lookups ─────────────────────────────────────────────────
// related_posts / pinned_post are called once per rendered page; without a
// cache each call scans all posts (O(n²) over a full build).

let _postIndexCache = null
let _pinnedPostCache

function getPostIndex(posts) {
  if (_postIndexCache) return _postIndexCache
  const byTag = new Map()
  const byCat = new Map()
  posts.each(p => {
    if (p.tags) p.tags.each(t => {
      if (!byTag.has(t.name)) byTag.set(t.name, [])
      byTag.get(t.name).push(p)
    })
    if (p.categories && p.categories.length) {
      const cat = p.categories.first().name
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat).push(p)
    }
  })
  _postIndexCache = { byTag, byCat }
  return _postIndexCache
}

// Score: 2 pts per shared tag, 1 pt for same (first) category.
hexo.extend.helper.register('related_posts', function (page, limit) {
  limit = limit || 3
  const { byTag, byCat } = getPostIndex(this.site.posts)
  const scores = new Map()
  const bump = (p, pts) => {
    if (p.path === page.path) return
    const cur = scores.get(p.path)
    if (cur) cur.score += pts
    else scores.set(p.path, { post: p, score: pts })
  }
  if (page.tags) page.tags.each(t => (byTag.get(t.name) || []).forEach(p => bump(p, 2)))
  if (page.categories && page.categories.length) {
    (byCat.get(page.categories.first().name) || []).forEach(p => bump(p, 1))
  }
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score || b.post.date - a.post.date)
    .slice(0, limit)
    .map(x => x.post)
})

hexo.extend.helper.register('pinned_post', function () {
  if (_pinnedPostCache === undefined) {
    _pinnedPostCache = this.site.posts.sort('-date').toArray().find(p => p.pinned) || null
  }
  return _pinnedPostCache
})

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

let _heatmapCache = null

// GitHub-style contribution calendar built once per generation cycle from
// site.posts. Weeks run Sun–Sat and the grid ends on the Saturday of the
// current week so columns stay aligned; days after "today" are marked
// isFuture so the template can render them as empty placeholders. All grid
// arithmetic runs on a single moment-timezone chain anchored to config.timezone
// (falling back to system-local when unset) — post.date carries no .tz() of
// its own (see adjustDateForTimezone in hexo's post processor), so it must be
// cloned and re-tz'd here the same way hexo's own list_archives helper does,
// or the count buckets and the today/future cutoff can disagree by a day.
hexo.extend.helper.register('heatmap_data', function (weeks) {
  weeks = weeks || 52
  if (_heatmapCache && _heatmapCache.weeks === weeks) return _heatmapCache.data

  const { config } = this
  const timezone = config.timezone

  const counts = new Map()
  this.site.posts.each(post => {
    let date = post.date.clone()
    if (timezone) date = date.tz(timezone)
    const key = date.format('YYYY-MM-DD')
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const now = timezone ? moment.tz(timezone) : moment()
  const today = now.clone().startOf('day')
  const end = today.clone().add(6 - today.day(), 'days')
  const start = end.clone().subtract(weeks * 7 - 1, 'days')

  const weeksArr = []
  let prevMonth = -1
  let windowMax = 0
  let total = 0
  for (let w = 0; w < weeks; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = start.clone().add(w * 7 + d, 'days')
      const key = date.format('YYYY-MM-DD')
      const count = counts.get(key) || 0
      const isFuture = date.isAfter(today)
      if (!isFuture) {
        total += count
        if (count > windowMax) windowMax = count
      }
      week.push({ count, isFuture, label: date.format('ddd, MMM D, YYYY') })
    }
    const m = start.clone().add(w * 7, 'days').month()
    week.monthLabel = m !== prevMonth ? MONTH_NAMES[m] : ''
    prevMonth = m
    weeksArr.push(week)
  }

  // Normalize colors against the max observed inside the visible window only
  // — a historical high-volume day outside the window must not dim it.
  weeksArr.forEach(week => week.forEach(day => {
    day.level = windowMax === 0 || day.count === 0 ? 0 : Math.min(4, Math.ceil((day.count / windowMax) * 4))
  }))

  const data = { weeks: weeksArr, total }
  _heatmapCache = { weeks, data }
  return data
})

// True when updated: is written in the post's front-matter. With Hexo's
// default updated_option 'mtime', page.updated falls back to file mtime —
// "now" on fresh clones/CI — so callers surfacing revision age must not
// trust page.updated unless it is explicit. Plain function because the
// json_feed generator needs it outside helper context.
function hasExplicitUpdated(page) {
  if (typeof page.raw !== 'string' || !page.updated) return false
  const parts = page.raw.split(/^---\s*$/m)
  // hexo-front-matter allows omitting the leading --- delimiter
  const fm = /^---/.test(page.raw) ? (parts[1] || '') : parts[0]
  return /^updated\s*:/m.test(fm)
}

hexo.extend.helper.register('has_explicit_updated', function (page) {
  return hasExplicitUpdated(page)
})

// ─── Grid per_page sync ───────────────────────────────────────────────────────
// Overrides index_generator.per_page so the user only needs to set grid.columns
// and grid.rows in the theme config.

hexo.extend.filter.register('before_generate', function () {
  _tabCounter = 0
  _postIndexCache = null
  _pinnedPostCache = undefined
  _heatmapCache = null
  _glossaryCache = undefined
  _linkCheckPages = []
  hexo.theme.config.version = themeVersion

  const grid = hexo.theme.config.grid
  if (grid && grid.columns && grid.columns > 1) {
    hexo.config.index_generator = hexo.config.index_generator || {}
    hexo.config.index_generator.per_page = grid.columns * (grid.rows || 3)
  }
})

hexo.extend.tag.register('note', function (args, content) {
  let type = (args[0] || 'info').toLowerCase()
  if (!NOTE_ICONS[type]) type = 'info'
  const icon = NOTE_ICONS[type]
  let rendered
  try {
    rendered = hexo.render.renderSync({ text: content, engine: 'markdown' })
  } catch (e) {
    rendered = '<pre>' + escHtml(content) + '</pre>'
  }

  return (
    '<div class="note note-' + type + '" role="note">' +
      '<span class="note-icon">' + icon + '</span>' +
      '<div>' + rendered + '</div>' +
    '</div>'
  )
}, { ends: true })

// ─── Tabs tag ─────────────────────────────────────────────────────────────────
// Usage:
// {% tabs %}
// <!-- tab JavaScript -->
// ```js
// console.log('hello')
// ```
// <!-- endtab -->
// <!-- tab Python -->
// ```py
// print('hello')
// ```
// <!-- endtab -->
// {% endtabs %}

hexo.extend.tag.register('tabs', function (args, content) {
  const uid = 'tabs-' + (++_tabCounter)
  const TAB_RE = /<!--\s*tab\s+(.*?)\s*-->([\s\S]*?)(?=<!--\s*(?:tab\b|endtab)\s*-->|$)/g
  const tabs = []
  let match
  while ((match = TAB_RE.exec(content)) !== null) {
    const name = match[1].trim()
    const body = match[2].trim()
    if (name) tabs.push({ name, body })
  }
  if (!tabs.length) return ''

  const inputs = tabs.map((_, i) =>
    `<input type="radio" name="${uid}" id="${uid}-${i}"${i === 0 ? ' checked' : ''} hidden>`
  ).join('\n')

  const labels = tabs.map((tab, i) =>
    `<label for="${uid}-${i}" class="tabs__label">${tab.name}</label>`
  ).join('\n')

  const panels = tabs.map(tab => {
    let rendered
    try {
      rendered = hexo.render.renderSync({ text: tab.body, engine: 'markdown' })
    } catch (e) {
      rendered = '<pre>' + escHtml(tab.body) + '</pre>'
    }
    return `<div class="tabs__panel">${rendered}</div>`
  }).join('\n')

  return (
    `<div class="tabs">\n` +
    `${inputs}\n` +
    `<nav class="tabs__nav">\n${labels}\n</nav>\n` +
    `<div class="tabs__panels">\n${panels}\n</div>\n` +
    `</div>`
  )
}, { ends: true })

// ─── Timeline tag ─────────────────────────────────────────────────────────────
// Usage:
// {% timeline %}
// <!-- entry 2026-01-15 :: My First Job -->
// Description with **Markdown** support.
// <!-- endentry -->
// {% endtimeline %}

hexo.extend.tag.register('timeline', function (args, content) {
  const ENTRY_RE = /<!--\s*entry\s+(.*?)\s*-->([\s\S]*?)(?=<!--\s*(?:entry\b|endentry)\s*-->|$)/g
  let items = ''
  let match
  while ((match = ENTRY_RE.exec(content)) !== null) {
    const parts = match[1].split('::')
    const date  = escHtml((parts[0] || '').trim())
    const title = escHtml((parts.slice(1).join('::') || '').trim())
    const body  = match[2].trim()
    let rendered
    try {
      rendered = hexo.render.renderSync({ text: body, engine: 'markdown' })
    } catch (e) {
      rendered = '<pre>' + escHtml(body) + '</pre>'
    }
    const header = (date || title)
      ? '<div class="timeline__header">' +
          (date  ? '<time class="timeline__date">'  + date  + '</time>' : '') +
          (title ? '<span class="timeline__title">' + title + '</span>' : '') +
        '</div>'
      : ''
    items +=
      '<div class="timeline__entry">' +
        '<div class="timeline__marker"></div>' +
        '<div class="timeline__content">' +
          header +
          '<div class="timeline__body">' + rendered + '</div>' +
        '</div>' +
      '</div>\n'
  }
  if (!items) return ''
  return '<div class="timeline">\n' + items + '</div>\n'
}, { ends: true })

// ─── Spoiler tag ──────────────────────────────────────────────────────────────
// Usage: {% spoiler [label] %} content {% endspoiler %}

hexo.extend.tag.register('spoiler', function (args, content) {
  const label = args.length ? escHtml(args.join(' ')) : 'Show spoiler'
  let rendered
  try {
    rendered = hexo.render.renderSync({ text: content, engine: 'markdown' })
  } catch (e) {
    rendered = '<pre>' + escHtml(content) + '</pre>'
  }
  return (
    '<details class="spoiler">' +
      '<summary class="spoiler__summary">' + label + '</summary>' +
      '<div class="spoiler__body">' + rendered + '</div>' +
    '</details>'
  )
}, { ends: true })

// ─── KaTeX math rendering ─────────────────────────────────────────────────────
// before_post_render: protect $...$ and $$...$$ from marked by converting to
// placeholder tags. after_post_render: render placeholders with katex node API.

hexo.extend.filter.register('before_post_render', function (data) {
  if (!hexo.theme.config.math || !hexo.theme.config.math.enabled) return data
  if (!data.content.includes('$')) return data

  // Single pass: code blocks (pre-rendered by Hexo/marked), inline code, then math.
  // Leftmost-wins — protected regions are skipped unchanged.
  const MATH_RE = /(<hexoPostRenderCodeBlock>[\s\S]*?<\/hexoPostRenderCodeBlock>|`[^`\n]+`|\$\$([\s\S]+?)\$\$|\$([^$\n\r]{1,500}?)\$)/g
  data.content = data.content.replace(MATH_RE, (match, _full, display, inline) => {
    if (display !== undefined)
      return `<div class="katex-d" data-e="${escHtml(display.trim())}"></div>`
    if (inline !== undefined)
      return `<span class="katex-i" data-e="${escHtml(inline.trim())}"></span>`
    return match  // code span or fenced block — leave unchanged
  })

  return data
})

hexo.extend.filter.register('after_post_render', function (data) {
  if (!hexo.theme.config.math || !hexo.theme.config.math.enabled) return data
  if (!data.content.includes('katex-d') && !data.content.includes('katex-i')) return data

  const katex = require('katex')
  const render = (expr, displayMode) => {
    try {
      return katex.renderToString(expr, { displayMode, throwOnError: false })
    } catch (e) {
      return `<span class="katex-error" title="${escHtml(expr)}">${escHtml(expr)}</span>`
    }
  }

  data.content = data.content.replace(
    /(<figure\b[^>]*>[\s\S]*?<\/figure>|<div class="katex-d" data-e="([^"]*)"[^>]*><\/div>|<span class="katex-i" data-e="([^"]*)"[^>]*><\/span>)/g,
    (match, _full, dispEnc, inlEnc) => {
      if (dispEnc !== undefined) return render(unescHtml(dispEnc), true)
      if (inlEnc !== undefined) return render(unescHtml(inlEnc), false)
      return match
    }
  )
  return data
})

// ─── External link handler ────────────────────────────────────────────────────

hexo.extend.filter.register('after_post_render', function (data) {
  if (!hexo.theme.config.external_links) return data

  // www.example.com and example.com are the same site
  const normHost = h => h.replace(/^www\./i, '')
  let siteHostname = ''
  try { siteHostname = normHost(new URL(hexo.config.url).hostname) } catch (e) {}

  data.content = data.content.replace(
    /<a\b([^>]*?)href="(https?:\/\/[^"]*?)"([^>]*?)>/gi,
    (match, before, href, after) => {
      if (/\btarget\s*=/i.test(before + after)) return match
      if (/\bdownload\b/i.test(before + after)) return match
      try {
        if (siteHostname && normHost(new URL(href).hostname) === siteHostname) return match
      } catch (e) { return match }
      return `<a${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`
    }
  )

  return data
})

// ─── Glossary tooltips ────────────────────────────────────────────────────────
// Wraps the first occurrence of each term from the site's
// source/_data/glossary.yml in <abbr class="glossary-term" title="definition">.
// No-op when the data file is absent; disable globally with glossary: false.

let _glossaryCache

function getGlossary() {
  if (_glossaryCache !== undefined) return _glossaryCache
  const data = (hexo.locals.get('data') || {}).glossary
  const terms = data && typeof data === 'object'
    ? Object.keys(data).filter(t => t.trim() && typeof data[t] === 'string' && data[t].trim())
    : []
  if (!terms.length) {
    _glossaryCache = null
    return null
  }
  const defs = new Map(terms.map(t => [t.toLowerCase(), data[t].trim()]))
  // Longest-first so "static site generator" beats "static site"
  const escaped = terms.sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  _glossaryCache = { defs, re: new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi') }
  return _glossaryCache
}

// Protected regions pass through untouched — code/pre, existing links and
// abbrs, headings, whole figures (covers highlight blocks), and every bare
// tag (incl. comments) — so matching only ever happens in inter-tag text and
// never inside attributes. ASCII \b means symbol-edged terms ("C++") won't
// boundary-match; documented limitation.
const GLOSSARY_SPLIT_RE = /(<(pre|code|abbr|a|h[1-6]|figure)\b[\s\S]*?<\/\2\s*>|<[^>]+>)/gi

hexo.extend.filter.register('after_post_render', function (data) {
  if (hexo.theme.config.glossary === false) return data
  const glossary = getGlossary()
  if (!glossary || !data.content) return data

  const wrapped = new Set()
  const processText = text => text.replace(glossary.re, match => {
    const key = match.toLowerCase()
    if (wrapped.has(key)) return match
    wrapped.add(key)
    return '<abbr class="glossary-term" title="' + escHtml(glossary.defs.get(key)) + '">' + match + '</abbr>'
  })

  let out = ''
  let last = 0
  let m
  GLOSSARY_SPLIT_RE.lastIndex = 0
  while ((m = GLOSSARY_SPLIT_RE.exec(data.content)) !== null) {
    out += processText(data.content.slice(last, m.index)) + m[0]
    last = m.index + m[0].length
  }
  data.content = out + processText(data.content.slice(last))
  return data
})

// ─── Download tag ─────────────────────────────────────────────────────────────
// Usage: {% download url [label] [external] %}

hexo.extend.tag.register('download', function (args) {
  const url   = args[0] || ''
  const isExt = args.indexOf('external') !== -1
  const parts = args.slice(1).filter(a => a !== 'external')
  const label = parts.length
    ? escHtml(parts.join(' '))
    : escHtml(url.split('/').pop().split('?')[0] || 'Download')
  const href  = escHtml(url)
  const badge = isExt
    ? '<span class="download-block__ext-badge" title="Hosted on an external server">' +
        EXTERNAL_ICON + ' External</span>'
    : ''
  return (
    '<div class="download-block">' +
      '<a class="btn btn--primary download-block__btn" href="' + href + '" download' +
         ' rel="noopener noreferrer">' +
        DOWNLOAD_ICON + ' ' + label +
      '</a>' +
      badge +
    '</div>'
  )
})

// ─── PDF embed tag ────────────────────────────────────────────────────────────
// Usage: {% pdf /path/to/file.pdf [Optional Title] %}

hexo.extend.tag.register('pdf', function (args) {
  const src   = args[0] || ''
  const title = args.length > 1
    ? args.slice(1).join(' ')
    : src.split('/').pop().replace(/\.pdf$/i, '')
  return (
    '<div class="pdf-card" data-pdf-src="' + escHtml(src) + '" data-pdf-title="' + escHtml(title) + '"' +
        ' role="button" tabindex="0" aria-label="Open PDF preview: ' + escHtml(title) + '">' +
      '<span class="pdf-card__icon">' + PDF_ICON + '</span>' +
      '<span class="pdf-card__body">' +
        '<span class="pdf-card__title">' + escHtml(title) + '</span>' +
        '<span class="pdf-card__hint">Click to preview</span>' +
      '</span>' +
    '</div>'
  )
})

// ─── Video embed tag ──────────────────────────────────────────────────────────
// Usage: {% video url [caption words] %}
// Supports: YouTube, Vimeo, direct .mp4/.webm/.ogv files

hexo.extend.tag.register('video', function (args) {
  const url     = (args[0] || '').trim()
  const caption = args.length > 1 ? escHtml(args.slice(1).join(' ')) : ''
  if (!url) return ''

  let embedHtml
  const ytMatch = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]+)/)
  const vmMatch  = !ytMatch && url.match(/vimeo\.com\/(\d+)/)
  const isFile   = !ytMatch && !vmMatch && /\.(mp4|webm|ogv)(\?|$)/i.test(url)

  if (ytMatch) {
    const id = escHtml(ytMatch[1])
    embedHtml = `<iframe src="https://www.youtube.com/embed/${id}"` +
      ` title="${caption || 'YouTube video'}"` +
      ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` +
      ` allowfullscreen loading="lazy"></iframe>`
  } else if (vmMatch) {
    const id = escHtml(vmMatch[1])
    embedHtml = `<iframe src="https://player.vimeo.com/video/${id}"` +
      ` title="${caption || 'Vimeo video'}"` +
      ` allow="autoplay; fullscreen; picture-in-picture"` +
      ` allowfullscreen loading="lazy"></iframe>`
  } else if (isFile) {
    embedHtml = `<video controls preload="metadata"><source src="${escHtml(url)}"></video>`
  } else {
    return `<p><a href="${escHtml(url)}">${escHtml(url)}</a></p>`
  }

  return (
    `<figure class="video-embed">` +
      `<div class="video-embed__wrapper">${embedHtml}</div>` +
      (caption ? `<figcaption>${caption}</figcaption>` : '') +
    `</figure>`
  )
})

// ─── 3D model viewer tag ──────────────────────────────────────────────────────
// Usage: {% model src="/models/foo.glb" %}
// Optional: height="400px"  bg="#1a1a2e"  view="iso"  autorotate="true"  thumbnail="/images/thumb.png"  caption="some text"

hexo.extend.tag.register('model', function (args) {
  if (!hexo.theme.config.model_viewer || hexo.theme.config.model_viewer.enabled === false) return ''
  const attrs = {}
  args.forEach(a => {
    const eq = a.indexOf('=')
    if (eq === -1) return
    attrs[a.slice(0, eq)] = a.slice(eq + 1).replace(/^(["'])(.*)\1$/, '$2')
  })
  if (!attrs.src) return ''
  const HEIGHT_RE = /^\d+(\.\d+)?(px|em|rem|vh|vw|%)$/
  const height = (attrs.height && HEIGHT_RE.test(attrs.height)) ? attrs.height : '400px'
  const bg = attrs.bg || (hexo.theme.config.model_viewer.background || '#1a1a2e')
  const view = attrs.view === 'iso' ? 'iso' : ''
  const autorotate = !!attrs.autorotate
  const caption = attrs.caption ? escHtml(attrs.caption) : ''
  const src = escHtml((hexo.config.root + attrs.src.replace(/^\//, '')).replace(/\/+/g, '/'))
  const thumbnail = attrs.thumbnail
    ? escHtml((hexo.config.root + attrs.thumbnail.replace(/^\//, '')).replace(/\/+/g, '/'))
    : ''
  const inner = thumbnail
    ? '<div class="model-viewer__poster">' +
        '<img src="' + thumbnail + '" alt="" class="model-viewer__poster-img">' +
        '<button class="model-viewer__load-btn" aria-label="Load 3D model">Load 3D model</button>' +
      '</div>'
    : '<div class="model-viewer__loading"><span class="model-viewer__spinner"></span></div>'
  return (
    '<div class="model-viewer-wrap">' +
      '<div class="model-viewer" data-src="' + src + '" data-bg="' + escHtml(bg) + '"' +
        (thumbnail ? ' data-thumbnail="' + thumbnail + '"' : '') +
        (view ? ' data-view="' + escHtml(view) + '"' : '') +
        (autorotate ? ' data-autorotate="true"' : '') +
        ' style="height:' + escHtml(height) + '">' +
        inner +
      '</div>' +
      (caption ? '<p class="model-viewer__caption">' + caption + '</p>' : '') +
    '</div>'
  )
})

// ─── Audio player tag ─────────────────────────────────────────────────────────
// Usage: {% audio src="/audio/file.mp3" [title="Track name"] [caption="…"] %}
// Supports: .mp3 .ogg .wav .flac .m4a

hexo.extend.tag.register('audio', function (args) {
  if (hexo.theme.config.audio_player === false) return ''
  const attrs = {}
  args.forEach(a => {
    const eq = a.indexOf('=')
    if (eq === -1) return
    attrs[a.slice(0, eq)] = a.slice(eq + 1).replace(/^(["'])(.*)\1$/, '$2')
  })
  if (!attrs.src) return ''
  const src     = escHtml((hexo.config.root + attrs.src.replace(/^\//, '')).replace(/\/+/g, '/'))
  const title   = attrs.title ? escHtml(attrs.title) : escHtml(attrs.src.split('/').pop())
  const caption = attrs.caption ? escHtml(attrs.caption) : ''
  return (
    '<div class="audio-player" data-src="' + src + '">' +
      '<div class="audio-player__body">' +
        '<button class="audio-player__play" aria-label="Play">' + PLAY_ICON + '</button>' +
        '<div class="audio-player__info">' +
          '<span class="audio-player__title">' + title + '</span>' +
          '<div class="audio-player__timeline">' +
            '<div class="audio-player__bar" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">' +
              '<div class="audio-player__fill"></div>' +
            '</div>' +
            '<span class="audio-player__time">0:00 / 0:00</span>' +
          '</div>' +
        '</div>' +
        '<button class="audio-player__mute" aria-label="Mute">' + VOLUME_ICON + '</button>' +
      '</div>' +
      (caption ? '<p class="audio-player__caption">' + caption + '</p>' : '') +
    '</div>'
  )
})

// ─── Compare slider tag ───────────────────────────────────────────────────────
// Usage:
// {% compare before="/images/old.png" after="/images/new.png" %}
// {% compare before="/a.png" after="/b.png" label_before="2019" label_after="2026" caption="Redesign" %}
// Without JS the slider renders as a static 50/50 split.

hexo.extend.tag.register('compare', function (args) {
  if (hexo.theme.config.compare_slider === false) return ''
  const attrs = {}
  args.forEach(a => {
    const eq = a.indexOf('=')
    if (eq === -1) return
    attrs[a.slice(0, eq)] = a.slice(eq + 1).replace(/^(["'])(.*)\1$/, '$2')
  })
  if (!attrs.before || !attrs.after) return ''
  const rootSrc     = s => escHtml((hexo.config.root + s.replace(/^\//, '')).replace(/\/+/g, '/'))
  const before      = rootSrc(attrs.before)
  const after       = rootSrc(attrs.after)
  const labelBefore = escHtml(attrs.label_before || 'Before')
  const labelAfter  = escHtml(attrs.label_after || 'After')
  const caption     = attrs.caption ? escHtml(attrs.caption) : ''
  return (
    '<figure class="compare-slider">' +
      '<div class="compare-slider__frame" style="--compare-pos:50%">' +
        '<img class="compare-slider__img compare-slider__img--after" src="' + after + '" alt="' + labelAfter + '" loading="lazy">' +
        '<img class="compare-slider__img compare-slider__img--before" src="' + before + '" alt="' + labelBefore + '" loading="lazy">' +
        '<div class="compare-slider__divider" aria-hidden="true"></div>' +
        '<span class="compare-slider__label compare-slider__label--before">' + labelBefore + '</span>' +
        '<span class="compare-slider__label compare-slider__label--after">' + labelAfter + '</span>' +
        '<input type="range" class="compare-slider__range" min="0" max="100" value="50"' +
          ' aria-label="Compare slider: ' + labelBefore + ' / ' + labelAfter + '">' +
      '</div>' +
      (caption ? '<figcaption>' + caption + '</figcaption>' : '') +
    '</figure>'
  )
})

// ─── Shared page description ──────────────────────────────────────────────────
// One line of plain text from a page: tags stripped (code/figure/math blocks
// dropped wholesale by stripHtml), entities decoded, whitespace collapsed.
const plainText = html =>
  unescHtml(stripHtml(String(html)).replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

// Priority: description → excerpt → start of the body. Single source for
// og:description (head.ejs, via the page_description helper) and the llms.txt
// generator. Each candidate is normalised BEFORE the fallback decision — an
// excerpt that strips to whitespace (image- or code-only intro) must not
// short-circuit the chain.
function pageDescription(page) {
  const fromDesc = page.description ? plainText(page.description) : ''
  if (fromDesc) return fromDesc
  const fromExcerpt = page.excerpt ? plainText(page.excerpt) : ''
  if (fromExcerpt) return fromExcerpt
  // Only ~200 visible chars are needed — bound the input before the regex
  // passes. A cut mid-tag or inside an unclosed <pre>/<figure>/<math> block
  // is trimmed so no markup or code text leaks through stripHtml.
  const bounded = String(page.content || '').slice(0, 4096)
    .replace(/<[^>]*$/, '')
    .replace(/<(pre|figure|math)\b(?![\s\S]*<\/\1>)[\s\S]*$/i, '')
  return plainText(bounded)
}

hexo.extend.helper.register('page_description', function (page) {
  return pageDescription(page)
})

// ─── Showroom project collection ──────────────────────────────────────────────
// Single definition of "what is a showroom project" — consumed by both the
// showroom and llms.txt generators; changing it in one place keeps the
// showroom pages and the llms.txt sections in sync.
const isProject = p => p.layout === 'project' && p.path.startsWith('showroom/')

function collectProjects(locals) {
  return locals.pages.toArray().filter(isProject).sort((a, b) => b.date - a.date)
}

// ─── llms.txt generator ───────────────────────────────────────────────────────
// Emits /llms.txt (llmstxt.org site index) and, unless llms_txt.full is false,
// /llms-full.txt with the complete markdown of every post and project.
// Opt-in: llms_txt.enabled defaults to false. Per-page opt-out: `llms_txt: false`
// in front-matter excludes a post/project/page from both files.

// Trailing index.html stripped like head.ejs does for canonical/og:url
const cleanPermalink = p => (p.permalink || '').replace(/index\.html$/, '')

function llmsDescription(page) {
  let text = pageDescription(page)
  if (text.length > 200) text = text.slice(0, 199).replace(/\s+\S*$/, '') + '…'
  return text
}

// [ and ] would corrupt the link label; ( ) and whitespace would terminate
// the link target early — percent-encode those in the URL.
const escMdLabel = s => String(s).replace(/([\[\]])/g, '\\$1')
const escMdUrl = u => String(u).replace(/[()\s]/g, c =>
  '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))

function llmsLinkLine(page, desc) {
  return '- [' + escMdLabel(page.title || page.path) + '](' + escMdUrl(cleanPermalink(page)) + ')' +
    (desc ? ': ' + desc : '')
}

hexo.extend.generator.register('llms_txt', function (locals) {
  const cfg = hexo.theme.config.llms_txt
  if (!cfg || !cfg.enabled) return []

  const included = p => p.llms_txt !== false
  const posts = locals.posts.sort('-date').toArray().filter(included)
  const projects = collectProjects(locals).filter(included)
  const otherPages = locals.pages.toArray().filter(p => !isProject(p) && p.title && included(p))

  const siteDesc = hexo.config.description ? plainText(hexo.config.description) : ''
  const header = '# ' + plainText(hexo.config.title || '') + '\n\n' +
    (siteDesc ? '> ' + siteDesc + '\n\n' : '')

  let index = header
  if (posts.length) {
    index += '## Posts\n\n' +
      posts.map(p => llmsLinkLine(p, llmsDescription(p))).join('\n') + '\n\n'
  }
  if (projects.length) {
    index += '## Projects\n\n' +
      projects.map(p => llmsLinkLine(p, (p.subtitle && plainText(p.subtitle)) || llmsDescription(p))).join('\n') + '\n\n'
  }
  if (otherPages.length) {
    index += '## Optional\n\n' +
      otherPages.map(p => llmsLinkLine(p, '')).join('\n') + '\n\n'
  }

  const routes = [{ path: 'llms.txt', data: index.trimEnd() + '\n' }]

  if (cfg.full !== false) {
    const entry = (page, extra) =>
      '---\n\n# ' + (page.title || page.path) + '\n\n' +
      'URL: ' + cleanPermalink(page) + '\n' +
      'Date: ' + (page.date ? page.date.format('YYYY-MM-DD') : '') + '\n' +
      (extra || '') + '\n' +
      String(page._content || '').replace(/<!--\s*more\s*-->/g, '').trim() + '\n\n'

    let full = header
    posts.forEach(p => {
      const tags = p.tags && p.tags.length
        ? 'Tags: ' + p.tags.map(t => t.name).join(', ') + '\n'
        : ''
      full += entry(p, tags)
    })
    projects.forEach(p => {
      const sub = p.subtitle ? plainText(p.subtitle) : ''
      full += entry(p, sub ? 'Subtitle: ' + sub + '\n' : '')
    })
    routes.push({ path: 'llms-full.txt', data: full.trimEnd() + '\n' })
  }

  return routes
})

// ─── JSON Feed generator ──────────────────────────────────────────────────────
// Emits /feed.json per JSON Feed 1.1 (jsonfeed.org). On by default; disable
// with json_feed.enabled: false. Independent of social.rss — that key only
// controls the atom.xml <link>s, and the atom feed itself requires the
// hexo-generator-feed plugin.

hexo.extend.generator.register('json_feed', function (locals) {
  const cfg = hexo.theme.config.json_feed
  if (!cfg || cfg.enabled === false) return []

  let origin, feedUrl
  try {
    origin = new URL(hexo.config.url).origin
    feedUrl = new URL(hexo.config.root + 'feed.json', hexo.config.url).href
  } catch (e) {
    return []
  }

  // Root-relative hrefs/srcs must be absolute in feed readers. Paths already
  // include config.root, so prefixing the bare origin is subdirectory-safe.
  const absolutise = html => String(html || '')
    .replace(/(href|src)="\/(?!\/)/g, '$1="' + origin + '/')

  const limit = parseInt(cfg.limit, 10) > 0 ? parseInt(cfg.limit, 10) : 20

  const items = locals.posts.sort('-date').toArray().slice(0, limit).map(post => {
    const url = cleanPermalink(post)
    const item = {
      id: url,
      url,
      title: post.title || post.path,
      content_html: absolutise(post.content),
      date_published: post.date.toISOString()
    }
    // Same explicit-updated rule as the stale banner and JSON-LD dateModified
    if (hasExplicitUpdated(post)) item.date_modified = post.updated.toISOString()
    const summary = pageDescription(post)
    if (summary) item.summary = summary
    if (post.tags && post.tags.length) item.tags = post.tags.map(t => t.name)
    return item
  })

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: plainText(hexo.config.title || ''),
    home_page_url: hexo.config.url,
    feed_url: feedUrl
  }
  const desc = hexo.config.description ? plainText(hexo.config.description) : ''
  if (desc) feed.description = desc
  if (hexo.config.language) feed.language = String(hexo.config.language)
  feed.items = items

  return [{ path: 'feed.json', data: JSON.stringify(feed, null, 2) + '\n' }]
})

// ─── Showroom generator ───────────────────────────────────────────────────────

hexo.extend.generator.register('showroom', function (locals) {
  const PER_PAGE = 9

  const projects = collectProjects(locals)

  if (!projects.length) return []

  const totalPages = Math.ceil(projects.length / PER_PAGE)
  const routes = []

  for (let i = 0; i < totalPages; i++) {
    const current = i + 1
    const slice = projects.slice(i * PER_PAGE, (i + 1) * PER_PAGE)
    const path = current === 1 ? 'showroom/index.html' : `showroom/page/${current}/index.html`

    routes.push({
      path,
      layout: ['showroom'],
      data: {
        projects: slice,
        total: projects.length,
        current,
        total_pages: totalPages,
        prev_link: current > 1
          ? (current === 2 ? 'showroom/' : `showroom/page/${current - 1}/`)
          : null,
        next_link: current < totalPages ? `showroom/page/${current + 1}/` : null
      }
    })
  }

  return routes
})

// ─── Internal link checker ────────────────────────────────────────────────────
// Warns (or fails with link_check.fail: true) on internal <a href>s that match
// no generated route. Two phases: hrefs are collected in after_render:html —
// which Hexo executes once per rendered route with the route path in
// locals.path (hexo/index.js createLoadThemeRoute) — because reading the lazy
// route streams in after_generate would render every page a second time.
// Validation runs in before_exit, after the generate console has consumed all
// routes; hexo server keeps collecting but never validates (no exit).

let _linkCheckPages = []

hexo.extend.filter.register('after_render:html', function (html, locals) {
  const cfg = hexo.theme.config.link_check
  if (!cfg || cfg.enabled === false) return
  if (!locals || typeof locals.path !== 'string') return
  const hrefs = []
  const re = /<a\b[^>]*?href="([^"]*)"/gi
  let m
  while ((m = re.exec(html)) !== null) hrefs.push(m[1])
  if (hrefs.length) _linkCheckPages.push({ page: locals.path, hrefs })
})

hexo.extend.filter.register('before_exit', function () {
  const cfg = hexo.theme.config.link_check
  if (!cfg || cfg.enabled === false || !_linkCheckPages.length) return

  const routes = new Set(hexo.route.list())
  const exists = p => {
    if (p === '' || routes.has(p)) return true
    const slashed = p.endsWith('/') ? p : p + '/'
    return routes.has(p + 'index.html') || routes.has(slashed + 'index.html')
  }

  const root = hexo.config.root || '/'
  let siteOrigin = ''
  try { siteOrigin = new URL(hexo.config.url).origin } catch (e) {}

  // Aggregate by missing target — a sitewide broken link (e.g. a footer href)
  // would otherwise repeat once per page and drown out everything else.
  const missing = new Map()
  _linkCheckPages.forEach(({ page, hrefs }) => {
    hrefs.forEach(href => {
      if (!href || /^(#|mailto:|tel:|javascript:|data:|\/\/)/i.test(href)) return
      let path = href
      if (/^https?:\/\//i.test(path)) {
        if (!siteOrigin || !path.startsWith(siteOrigin + '/')) return
        path = path.slice(siteOrigin.length)
      }
      path = path.replace(/[?#].*$/, '')
      if (!path) return
      if (path.startsWith(root)) path = path.slice(root.length)
      else if (path.startsWith('/')) path = path.slice(1)
      else {
        // Page-relative link — resolve against the linking route's directory
        try { path = new URL(path, 'https://x/' + page).pathname.slice(1) } catch (e) { return }
      }
      try { path = decodeURIComponent(path) } catch (e) {}
      if (!exists(path)) {
        if (!missing.has(href)) missing.set(href, [])
        missing.get(href).push(page)
      }
    })
  })
  _linkCheckPages = []

  missing.forEach((pages, href) => {
    const examples = pages.slice(0, 3).join(', ')
    hexo.log.warn('[link-check] missing ' + href + ' — linked from ' + pages.length +
      ' page' + (pages.length === 1 ? '' : 's') + ' (' + examples + (pages.length > 3 ? ', …' : '') + ')')
  })

  if (missing.size && cfg.fail) {
    hexo.log.fatal('[link-check] ' + missing.size + ' broken internal link target' + (missing.size === 1 ? '' : 's'))
    process.exitCode = 1
  }
})

// ─── Stats page generator ─────────────────────────────────────────────────────
// Opt-in (stats.enabled, default false): emits /stats/ with build-time posting
// statistics rendered by layout/stats.ejs. Zero client JS — bars are
// server-computed integer percentages. Dates run through the same
// config.timezone chain as the heatmap so year/month buckets agree with it.

hexo.extend.generator.register('stats', function (locals) {
  const cfg = hexo.theme.config.stats
  if (!cfg || !cfg.enabled) return []

  const posts = locals.posts.sort('-date').toArray()
  if (!posts.length) return []

  const timezone = hexo.config.timezone
  const localDate = d => (timezone ? d.clone().tz(timezone) : d.clone())

  let totalWords = 0
  const yearCounts = new Map()
  const monthKeys = new Set()
  posts.forEach(p => {
    totalWords += countWords(p.content)
    const d = localDate(p.date)
    const y = d.year()
    yearCounts.set(y, (yearCounts.get(y) || 0) + 1)
    monthKeys.add(d.format('YYYY-MM'))
  })

  const maxYearCount = Math.max(...yearCounts.values())
  const years = Array.from(yearCounts.keys()).sort((a, b) => b - a).map(y => ({
    year: y,
    count: yearCounts.get(y),
    pct: Math.round((yearCounts.get(y) / maxYearCount) * 100)
  }))

  // Longest run of consecutive months with at least one post. Month streaks —
  // day streaks degenerate to 1 on typical blog cadence.
  let streak = 0
  let run = 0
  let prev = null
  Array.from(monthKeys).sort().forEach(key => {
    const cur = moment(key, 'YYYY-MM')
    run = prev !== null && cur.diff(prev, 'months') === 1 ? run + 1 : 1
    if (run > streak) streak = run
    prev = cur
  })

  const topTags = locals.tags.toArray()
    .map(t => ({ name: t.name, path: t.path, count: t.posts.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10)

  return [{
    path: 'stats/index.html',
    layout: ['stats'],
    data: {
      title: 'Stats',
      post_count: posts.length,
      word_total: totalWords,
      tag_count: locals.tags.length,
      category_count: locals.categories.length,
      years,
      top_tags: topTags,
      streak_months: streak,
      since: localDate(posts[posts.length - 1].date).format('MMM YYYY')
    }
  }]
})
