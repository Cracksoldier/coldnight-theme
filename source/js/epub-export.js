;(function () {
  'use strict'

  function showToast(message, type) {
    var container = document.getElementById('toast-container')
    if (!container) return
    var toast = document.createElement('div')
    toast.className = 'toast toast--' + (type || 'info')
    toast.innerHTML =
      '<span style="flex:1">' + message + '</span>' +
      '<button class="toast__close" aria-label="Dismiss">&times;</button>'
    toast.querySelector('.toast__close').addEventListener('click', function () { toast.remove() })
    container.appendChild(toast)
    setTimeout(function () { toast.remove() }, 3500)
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  // Hexo's line-numbered hljs output is a two-cell table (gutter | code).
  // Readers style and paginate the cells independently — and Foliate forces
  // pre-wrap — so numbers and code drift apart into two boxes. Rebuild each
  // as a single <pre> with the number inline at the start of every line.
  // Every highlighted <pre> gets .epub-code, which the stylesheet colours.
  var LINE_MODS = [
    ['.hljs-addition', 'epub-code__line--add'],
    ['.hljs-deletion', 'epub-code__line--del'],
    ['mark, .marked',  'epub-code__line--mark'] // hljs mode emits <mark>
  ]

  function flattenCodeTables(root) {
    root.querySelectorAll('figure.highlight').forEach(function (fig) {
      var table = fig.querySelector('table')
      var gutter = fig.querySelector('td.gutter')
      var cell = fig.querySelector('td.code')
      if (!table || !gutter || !cell) {
        var plain = fig.querySelector('pre')
        if (plain) plain.classList.add('epub-code')
        return
      }
      var src = cell.querySelector('code') || cell.querySelector('pre')
      if (!src) return

      var labels = Array.prototype.map.call(gutter.querySelectorAll('.line'), function (el) {
        return el.textContent
      })
      // Range.cloneContents re-creates partly selected ancestors, so an hljs
      // span crossing a <br> (multi-line comment/string) stays balanced.
      var brs = Array.prototype.slice.call(src.querySelectorAll('br'))
      var lines = []
      var range = document.createRange()
      for (var i = 0; i <= brs.length; i++) {
        if (i === 0) range.setStart(src, 0)
        else range.setStartAfter(brs[i - 1])
        if (i < brs.length) range.setEndBefore(brs[i])
        else range.setEnd(src, src.childNodes.length)
        lines.push(range.cloneContents())
      }
      var count = labels.length || lines.length
      // A trailing <br> leaves an empty final fragment beyond the gutter count
      if (!labels.length && lines.length > 1 && !lines[lines.length - 1].textContent) count--

      var pre = document.createElement('pre')
      pre.className = 'epub-code epub-code--numbered'
      var code = document.createElement('code')
      if (src.tagName === 'CODE' && src.className) code.className = src.className
      for (var n = 0; n < count; n++) {
        var line = document.createElement('span')
        line.className = 'epub-code__line'
        var ln = document.createElement('span')
        ln.className = 'epub-code__ln'
        ln.textContent = labels[n] || String(n + 1)
        line.appendChild(ln)
        if (lines[n]) {
          // Tint the whole row for diff/marked lines, not just the token span
          LINE_MODS.forEach(function (m) {
            if (lines[n].querySelector(m[0])) line.classList.add(m[1])
          })
          line.appendChild(lines[n])
        }
        code.appendChild(line)
      }
      pre.appendChild(code)
      table.parentNode.replaceChild(pre, table)
    })
  }

  function getCleanContent() {
    var body = document.querySelector('.post-body')
    if (!body) return null
    var clone = body.cloneNode(true)
    clone.querySelectorAll('.code-toolbar, .code-collapse, .heading-anchor, script').forEach(function (el) { el.remove() })
    clone.querySelectorAll('.code-collapsible').forEach(function (el) {
      el.classList.remove('code-collapsible', 'is-collapsed')
      el.style.removeProperty('--code-visible-lines')
      if (!el.getAttribute('style')) el.removeAttribute('style')
    })
    flattenCodeTables(clone)
    replaceMedia(clone)
    return clone
  }

  function absUrl(u) {
    try { return new URL(u || '', window.location.href).href } catch (e) { return '' }
  }

  function fileName(u) {
    return decodeURIComponent((u.split('?')[0].split('/').pop()) || u)
  }

  function mediaLink(href, label) {
    var p = document.createElement('p')
    p.className = 'epub-media'
    var a = document.createElement('a')
    a.setAttribute('href', href)
    a.textContent = '▶ ' + label
    p.appendChild(a)
    return p
  }

  var PROVIDER_NAMES = { youtube: 'YouTube', vimeo: 'Vimeo' }

  // Embedded iframes are mapped back to the provider's watch page via an
  // allowlist; anything else just links to its own src.
  function watchUrl(src) {
    var m = src.match(/^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/)
    if (m) return { href: 'https://www.youtube.com/watch?v=' + m[1], provider: 'YouTube' }
    m = src.match(/^https:\/\/player\.vimeo\.com\/video\/(\d+)/)
    if (m) return { href: 'https://vimeo.com/' + m[1], provider: 'Vimeo' }
    return { href: src, provider: '' }
  }

  // Players, facades and iframes need JS or network access that ePub readers
  // don't offer, so every audio/video embed becomes a plain link. Media files
  // are never bundled; only a YouTube facade thumbnail is kept (embedImages
  // bundles it afterwards).
  function replaceMedia(root) {
    root.querySelectorAll('.audio-player').forEach(function (player) {
      var src = absUrl(player.getAttribute('data-src'))
      if (!src) { player.remove(); return }
      var titleEl = player.querySelector('.audio-player__title')
      var captionEl = player.querySelector('.audio-player__caption')
      var frag = document.createDocumentFragment()
      frag.appendChild(mediaLink(src, (titleEl && titleEl.textContent.trim()) || fileName(src)))
      if (captionEl && captionEl.textContent.trim()) {
        var cap = document.createElement('p')
        cap.className = 'epub-media__caption'
        cap.textContent = captionEl.textContent.trim()
        frag.appendChild(cap)
      }
      player.replaceWith(frag)
    })

    root.querySelectorAll('.video-embed__wrapper').forEach(function (wrap) {
      var out = document.createDocumentFragment()
      var facade = wrap.querySelector('a.video-facade')
      var iframe = wrap.querySelector('iframe')
      var video = wrap.querySelector('video')

      if (facade) {
        var href = facade.getAttribute('href') || ''
        var title = facade.getAttribute('data-video-title') || 'Video'
        var provider = PROVIDER_NAMES[facade.getAttribute('data-provider')] || ''
        var thumb = facade.querySelector('.video-facade__thumb')
        if (thumb) {
          var p = document.createElement('p')
          var a = document.createElement('a')
          a.setAttribute('href', href)
          var img = document.createElement('img')
          img.setAttribute('src', thumb.getAttribute('src'))
          img.setAttribute('alt', title)
          a.appendChild(img)
          p.appendChild(a)
          out.appendChild(p)
        }
        out.appendChild(mediaLink(href, (provider ? 'Watch on ' + provider + ': ' : 'Watch: ') + title))
      } else if (iframe) {
        var w = watchUrl(absUrl(iframe.getAttribute('src')))
        var t = iframe.getAttribute('title') || 'Video'
        out.appendChild(mediaLink(w.href, (w.provider ? 'Watch on ' + w.provider + ': ' : 'Watch: ') + t))
      } else if (video) {
        var source = video.querySelector('source')
        var vsrc = absUrl((source && source.getAttribute('src')) || video.getAttribute('src'))
        if (vsrc) out.appendChild(mediaLink(vsrc, 'Video: ' + fileName(vsrc)))
      } else {
        return
      }
      wrap.replaceWith(out)
    })
  }

  function getPostData(btn) {
    return {
      title:    btn.dataset.title    || (document.querySelector('.post-title') || {}).textContent || 'Untitled',
      author:   btn.dataset.author   || '',
      url:      btn.dataset.url      || window.location.href,
      slug:     btn.dataset.slug     || 'post',
      language: btn.dataset.language || 'en',
      content:  getCleanContent()
    }
  }

  var IMG_TYPES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    svg: 'image/svg+xml', webp: 'image/webp', avif: 'image/avif'
  }

  // Fetch every <img> and bundle it into the zip so the ePub works offline.
  // Rewrites srcs to the bundled path; unfetchable images (e.g. CORS-blocked
  // hotlinks) fall back to their absolute URL so the XHTML stays valid.
  function embedImages(root, zip) {
    if (!root) return Promise.resolve([])
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img'))
    var manifest = []
    var jobs = imgs.map(function (img, i) {
      var abs
      try { abs = new URL(img.getAttribute('src') || '', window.location.href).href } catch (e) { return Promise.resolve() }
      return fetch(abs).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.blob()
      }).then(function (blob) {
        var ext  = (abs.split('?')[0].split('.').pop() || '').toLowerCase()
        var type = IMG_TYPES[ext] || blob.type || 'image/png'
        if (!IMG_TYPES[ext]) ext = (type.split('/')[1] || 'png').replace('+xml', '')
        var name = 'images/img' + i + '.' + ext
        zip.file('OEBPS/' + name, blob)
        manifest.push('<item id="img' + i + '" href="' + name + '" media-type="' + type + '"/>')
        img.setAttribute('src', name)
      }).catch(function () {
        img.setAttribute('src', abs)
      })
    })
    return Promise.all(jobs).then(function () { return manifest.join('') })
  }

  function buildEpub(data) {
    var zip = new JSZip() // eslint-disable-line no-undef
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

    // mimetype must be the first file and stored without compression
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    return embedImages(data.content, zip).then(function (imageItems) {
      // XMLSerializer emits well-formed XML (self-closed voids, no named
      // entities like &nbsp;) — required by strict ePub readers.
      var contentXhtml = data.content
        ? new XMLSerializer().serializeToString(data.content)
        : ''

      zip.file('META-INF/container.xml',
        '<?xml version="1.0"?>' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
          '<rootfiles>' +
            '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>' +
          '</rootfiles>' +
        '</container>')

      zip.file('OEBPS/content.opf',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">' +
          '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
            '<dc:identifier id="uid">' + esc(data.url) + '</dc:identifier>' +
            '<dc:title>' + esc(data.title) + '</dc:title>' +
            (data.author ? '<dc:creator>' + esc(data.author) + '</dc:creator>' : '') +
            '<dc:language>' + esc(data.language) + '</dc:language>' +
            '<meta property="dcterms:modified">' + now + '</meta>' +
          '</metadata>' +
          '<manifest>' +
            '<item id="nav"     href="nav.xhtml"     media-type="application/xhtml+xml" properties="nav"/>' +
            '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>' +
            '<item id="css"     href="style.css"     media-type="text/css"/>' +
            imageItems +
          '</manifest>' +
          '<spine><itemref idref="content"/></spine>' +
        '</package>')

      zip.file('OEBPS/nav.xhtml',
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html>' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">' +
          '<head><title>' + esc(data.title) + '</title></head>' +
          '<body>' +
            '<nav epub:type="toc">' +
              '<ol><li><a href="content.xhtml">' + esc(data.title) + '</a></li></ol>' +
            '</nav>' +
          '</body>' +
        '</html>')

      zip.file('OEBPS/content.xhtml',
        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html>' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' +
          '<head>' +
            '<meta charset="UTF-8"/>' +
            '<title>' + esc(data.title) + '</title>' +
            '<link rel="stylesheet" type="text/css" href="style.css"/>' +
          '</head>' +
          '<body>' +
            '<h1>' + esc(data.title) + '</h1>' +
            contentXhtml +
          '</body>' +
        '</html>')

      zip.file('OEBPS/style.css',
        'body{font-family:Georgia,"Times New Roman",serif;line-height:1.7;max-width:42em;margin:0 auto;padding:1em}' +
        'h1,h2,h3{line-height:1.3}' +
        'pre,code{font-family:monospace;font-size:.9em}' +
        'pre{background:#f5f5f5;padding:1em;white-space:pre-wrap;overflow-x:auto}' +
        // Code blocks: a self-contained dark panel in the site's own palette
        // (copied from _variables.scss / _code.scss — keep in sync), so it
        // reads the same on white, sepia and dark reader themes. Foliate
        // injects `body *{color:inherit;background-color:<theme bg>;
        // border-color:currentColor}` all !important; every rule here is
        // therefore !important and .epub-code-scoped to outrank that (0,0,2).
        'figure.highlight{margin:1.5em 0}figure.highlight pre{margin:0}' +
        '.epub-code{background-color:#0f2040 !important;color:#e2e8f0 !important;' +
          'border:1px solid #1e3a6e !important;border-radius:6px;padding:.75em 1em;line-height:1.5}' +
        '.epub-code *{background-color:transparent !important}' +
        '.epub-code mark{color:inherit !important}' + // UA default is black
        '.epub-code.epub-code--numbered{padding:0}' +
        // One block per line (see flattenCodeTables). The gutter is each
        // line's left border, so it runs unbroken past wrapped continuation
        // lines and across page breaks; the inset shadow is the separator.
        // The negative indent pulls the number into the border on the first
        // line only — wrapped lines hang at the code edge.
        '.epub-code .epub-code__line{display:block;border-left:3.2em solid #0a1628 !important;' +
          'box-shadow:inset 1px 0 0 #1e3a6e;padding:0 1em 0 .8em;text-indent:-4em}' +
        '.epub-code .epub-code__line:first-child{padding-top:.75em}' +
        '.epub-code .epub-code__line:last-child{padding-bottom:.75em}' +
        '.epub-code .epub-code__ln{display:inline-block;width:3.2em;box-sizing:border-box;' +
          'padding-right:.6em;margin-right:.8em;text-indent:0;text-align:right;' +
          'color:#64748b !important;-webkit-user-select:none;user-select:none}' +
        '.epub-code .epub-code__line--add{background-color:rgba(16,185,129,.15) !important;box-shadow:inset 3px 0 0 #10b981}' +
        '.epub-code .epub-code__line--del{background-color:rgba(239,68,68,.12) !important;box-shadow:inset 3px 0 0 #ef4444}' +
        '.epub-code .epub-code__line--mark{background-color:rgba(37,99,235,.18) !important;box-shadow:inset 3px 0 0 #2563eb}' +
        // highlight.js tokens — same groups and colours as _code.scss
        '.epub-code .hljs-comment,.epub-code .hljs-quote{color:#8b949e !important;font-style:italic}' +
        '.epub-code .hljs-keyword,.epub-code .hljs-selector-tag{color:#ff7b72 !important}' +
        '.epub-code .hljs-number,.epub-code .hljs-string,.epub-code .hljs-meta .hljs-meta-string,' +
          '.epub-code .hljs-literal,.epub-code .hljs-doctag,.epub-code .hljs-regexp,' +
          '.epub-code .hljs-formula{color:#a5d6ff !important}' +
        '.epub-code .hljs-title,.epub-code .hljs-section,.epub-code .hljs-name,' +
          '.epub-code .hljs-selector-id,.epub-code .hljs-selector-class{color:#d2a8ff !important}' +
        '.epub-code .hljs-attribute,.epub-code .hljs-attr,.epub-code .hljs-variable,' +
          '.epub-code .hljs-template-variable,.epub-code .hljs-class .hljs-title,' +
          '.epub-code .hljs-type{color:#ffa657 !important}' +
        '.epub-code .hljs-symbol,.epub-code .hljs-bullet,.epub-code .hljs-subst,' +
          '.epub-code .hljs-meta,.epub-code .hljs-meta .hljs-keyword,.epub-code .hljs-selector-attr,' +
          '.epub-code .hljs-selector-pseudo,.epub-code .hljs-link{color:#79c0ff !important}' +
        '.epub-code .hljs-built_in{color:#ffa198 !important}' +
        '.epub-code .hljs-addition{color:#7ee8a2 !important}' +
        '.epub-code .hljs-deletion{color:#ffa198 !important}' +
        '.epub-code .hljs-emphasis{font-style:italic}.epub-code .hljs-strong{font-weight:bold}' +
        'img{max-width:100%}' +
        'a{color:#4080ff}' +
        'blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:1em;color:#555}' +
        'table{border-collapse:collapse;width:100%}' +
        'td,th{border:1px solid #ddd;padding:.5em}' +
        'figure{margin:1.5em 0}figcaption{font-size:.875em;color:#666;text-align:center;margin-top:.25em}' +
        'details summary{cursor:pointer;font-weight:600}' +
        '.epub-media a{font-weight:600}' +
        '.epub-media__caption{font-size:.875em;color:#666;margin-top:-.5em}' +
        // Charts. The theme palette is tuned for the dark site background and
        // washes out on ePub white, so this is a darkened parallel set — and it
        // avoids var(), which older reader engines don't resolve. Each rule
        // covers SVG fill/stroke and the legend swatch's background at once.
        '.chart__series--1{fill:#2563eb;stroke:#2563eb;background:#2563eb}' +
        '.chart__series--2{fill:#d97706;stroke:#d97706;background:#d97706}' +
        '.chart__series--3{fill:#059669;stroke:#059669;background:#059669}' +
        '.chart__series--4{fill:#0891b2;stroke:#0891b2;background:#0891b2}' +
        '.chart__series--5{fill:#dc2626;stroke:#dc2626;background:#dc2626}' +
        '.chart__series--6{fill:#64748b;stroke:#64748b;background:#64748b}' +
        '.chart__series polyline{fill:none;stroke-width:2.5}' +
        '.chart--pie .chart__series path,.chart--pie .chart__series circle{stroke:#fff;stroke-width:2}' +
        '.chart__svg{width:100%;height:auto}' +
        '.chart__gridline{stroke:#ddd}.chart__axisline{stroke:#999}' +
        // SVG <text> would otherwise inherit the serif body font and render as
        // hairlines at these sizes.
        '.chart__svg text{font-family:sans-serif}' +
        '.chart__tick{fill:#555;font-size:11px}' +
        '.chart__slice-label{fill:#fff;font-size:13px;font-weight:600}' +
        '.chart__legend{list-style:none;padding:0;font-size:.85em}' +
        '.chart__legend-item{display:inline-block;margin-right:1em}' +
        '.chart__swatch{display:inline-block;width:.7em;height:.7em;margin-right:.35em}')

      return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
    })
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.epub-export-btn')
    if (!btn) return

    btn.addEventListener('click', function () {
      btn.disabled = true
      var data = getPostData(btn)
      buildEpub(data).then(function (blob) {
        triggerDownload(blob, data.slug + '.epub')
        showToast('ePub downloaded', 'success')
        btn.disabled = false
      }).catch(function () {
        showToast('ePub export failed', 'error')
        btn.disabled = false
      })
    })
  })
})()
