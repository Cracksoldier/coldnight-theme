'use strict'

let _tabCounter = 0

const stripHtml = (html) => html
  .replace(/<(pre|figure)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, '')

// ─── Reading time helper ──────────────────────────────────────────────────────
// Usage in EJS: <%= reading_time(post.content) %>

hexo.extend.helper.register('reading_time', function (content) {
  if (!content) return ''
  const words = stripHtml(content).trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 200))
  return minutes + ' min read'
})

hexo.extend.helper.register('word_count', function (content) {
  if (!content) return ''
  const count = stripHtml(content).trim().split(/\s+/).filter(Boolean).length
  return count.toLocaleString() + ' words'
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
      '<a href="#' + item.id + '" class="toc-link">' + item.text + '</a>' +
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
    const alt = match[1] || ''
    const src = match[2] || ''
    const dataSubHtml = alt ? ' data-sub-html="<p>' + alt + '</p>"' : ''
    items +=
      '<a href="' + src + '"' + dataSubHtml + '>' +
        '<img src="' + src + '" alt="' + alt + '" loading="lazy">' +
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

// ─── Language label fix ──────────────────────────────────────────────────────
// Hexo emits `<figure class="highlight bash">` but not `data-lang="bash"`.
// The CSS ::before rule uses attr(data-lang), so we inject it at build time.

hexo.extend.filter.register('after_render:html', function (html) {
  html = html.replace(
    /<figure class="highlight ([a-zA-Z0-9_+\-]+)">/g,
    (match, lang) => `<figure class="highlight ${lang}" data-lang="${lang}">`
  )

  if (hexo.theme.config.image_captions !== false) {
    html = html.replace(/<p>(<img\b[^>]*>)<\/p>/g, (match, imgTag) => {
      const altMatch = imgTag.match(/\balt="([^"]*)"/)
      const alt = altMatch ? altMatch[1].trim() : ''
      if (!alt) return match
      return `<figure>${imgTag}<figcaption>${alt}</figcaption></figure>`
    })
  }

  return html
})

// ─── Grid per_page sync ───────────────────────────────────────────────────────
// Overrides index_generator.per_page so the user only needs to set grid.columns
// and grid.rows in the theme config.

hexo.extend.filter.register('before_generate', function () {
  _tabCounter = 0

  const grid = hexo.theme.config.grid
  if (grid && grid.columns && grid.columns > 1) {
    hexo.config.index_generator = hexo.config.index_generator || {}
    hexo.config.index_generator.per_page = grid.columns * (grid.rows || 3)
  }
})

hexo.extend.tag.register('note', function (args, content) {
  const type = (args[0] || 'info').toLowerCase()
  const icon = NOTE_ICONS[type] || NOTE_ICONS.info
  const rendered = hexo.render.renderSync({ text: content, engine: 'markdown' })

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
    const rendered = hexo.render.renderSync({ text: tab.body, engine: 'markdown' })
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
