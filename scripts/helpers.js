'use strict'

const themeVersion = require('../package.json').version

let _tabCounter = 0

const stripHtml = (html) => html
  .replace(/<(pre|figure)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, '')

const escHtml = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

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
const EXTERNAL_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'

// ─── Language label fix ──────────────────────────────────────────────────────
// Hexo emits `<figure class="highlight bash">` but not `data-lang="bash"`.
// The CSS ::before rule uses attr(data-lang), so we inject it at build time.

hexo.extend.filter.register('after_render:html', function (html) {
  html = html.replace(
    /<figure class="highlight ([a-zA-Z0-9_+\-]+)">/g,
    (match, lang) => `<figure class="highlight ${lang}" data-lang="${lang}">`
  )

  if (hexo.theme.config.mermaid && hexo.theme.config.mermaid.enabled) {
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/g, (figure) => {
      const codeMatch = figure.match(/<code[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)<\/code>/)
      if (!codeMatch) return figure
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

  return html
})

// ─── Grid per_page sync ───────────────────────────────────────────────────────
// Overrides index_generator.per_page so the user only needs to set grid.columns
// and grid.rows in the theme config.

hexo.extend.filter.register('before_generate', function () {
  _tabCounter = 0
  hexo.theme.config.version = themeVersion

  const grid = hexo.theme.config.grid
  if (grid && grid.columns && grid.columns > 1) {
    hexo.config.index_generator = hexo.config.index_generator || {}
    hexo.config.index_generator.per_page = grid.columns * (grid.rows || 3)
  }
})

hexo.extend.tag.register('note', function (args, content) {
  const type = (args[0] || 'info').toLowerCase()
  const icon = NOTE_ICONS[type] || NOTE_ICONS.info
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

// ─── External link handler ────────────────────────────────────────────────────

hexo.extend.filter.register('after_post_render', function (data) {
  if (!hexo.theme.config.external_links) return data

  let siteHostname = ''
  try { siteHostname = new URL(hexo.config.url).hostname } catch (e) {}

  data.content = data.content.replace(
    /<a\b([^>]*?)href="(https?:\/\/[^"]*?)"([^>]*?)>/gi,
    (match, before, href, after) => {
      if (/\btarget\s*=/i.test(before + after)) return match
      if (/\bdownload\b/i.test(before + after)) return match
      try {
        if (siteHostname && new URL(href).hostname === siteHostname) return match
      } catch (e) { return match }
      return `<a${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`
    }
  )

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
