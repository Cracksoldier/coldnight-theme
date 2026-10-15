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
    replaceCompare(clone)
    return clone
  }

  // The compare slider stacks "before" over "after" and clips it with CSS;
  // in an ePub that CSS and the range input are gone, leaving the two images
  // side by side in after/before order with the labels run together. Rebuild
  // each slider as before-then-after stacked images, each with its label.
  // Runs before embedImages, which then bundles the images as usual.
  function replaceCompare(root) {
    root.querySelectorAll('figure.compare-slider').forEach(function (fig) {
      var frame = fig.querySelector('.compare-slider__frame')
      if (!frame) return
      var items = document.createDocumentFragment()
      ;[['before', 'Before'], ['after', 'After']].forEach(function (side) {
        var img = frame.querySelector('.compare-slider__img--' + side[0])
        if (!img) return
        var labelEl = frame.querySelector('.compare-slider__label--' + side[0])
        var label = (labelEl && labelEl.textContent.trim()) || img.getAttribute('alt') || side[1]
        var item = document.createElement('div')
        item.className = 'epub-compare__item'
        var copy = document.createElement('img')
        copy.setAttribute('src', img.getAttribute('src'))
        copy.setAttribute('alt', label === side[1] ? label : side[1] + ': ' + label)
        item.appendChild(copy)
        var p = document.createElement('p')
        p.className = 'epub-compare__label'
        p.textContent = label
        item.appendChild(p)
        items.appendChild(item)
      })
      frame.replaceWith(items)
      fig.className = 'epub-compare'
    })
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

  // Chart colours for the ePub. The theme palette is tuned for the dark site
  // background and washes out on ePub white, so this is a darkened parallel
  // set — and it avoids var(), which older reader engines don't resolve.
  // Series index → colour; feeds both the SVG rules and the legend swatches.
  var SERIES_COLORS = ['#2563eb', '#d97706', '#059669', '#0891b2', '#dc2626', '#64748b']

  // Embedded inside each chart SVG file, which as an <img> can't see the
  // book's stylesheet.
  var CHART_CSS =
    SERIES_COLORS.map(function (c, i) {
      return '.chart__series--' + (i + 1) + '{fill:' + c + ';stroke:' + c + '}'
    }).join('') +
    '.chart__series polyline{fill:none;stroke-width:2.5}' +
    '.chart--pie .chart__series path,.chart--pie .chart__series circle{stroke:#fff;stroke-width:2}' +
    '.chart__gridline{stroke:#ddd}.chart__axisline{stroke:#999}' +
    // SVG <text> would otherwise inherit a serif font and render as hairlines
    // at these sizes; ticks are larger than on the site because the chart is
    // scaled down to the reader's column width.
    'text{font-family:sans-serif}' +
    '.chart__tick{fill:#555;font-size:13px}' +
    '.chart__slice-label{fill:#fff;font-size:14px;font-weight:600}'

  var SVG_NS = 'http://www.w3.org/2000/svg'

  // Many readers (FBReader among them) ignore inline <svg> and print its text
  // content instead, but do render SVG referenced by <img>. Writes the SVG as a
  // standalone file with an intrinsic size and a white backing (legible in a
  // reader's dark mode) and returns the <img> wrapper plus its manifest item.
  function svgToFile(svg, zip, name, label, css) {
    var vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
    if (vb.length !== 4 || !(vb[2] > 0 && vb[3] > 0)) {
      vb = [0, 0, parseFloat(svg.getAttribute('width')) || 800, parseFloat(svg.getAttribute('height')) || 600]
      svg.setAttribute('viewBox', vb.join(' '))
    }
    svg.setAttribute('width', String(Math.round(vb[2])))
    svg.setAttribute('height', String(Math.round(vb[3])))
    svg.style.removeProperty('max-width')
    if (!svg.getAttribute('style')) svg.removeAttribute('style')

    var bg = document.createElementNS(SVG_NS, 'rect')
    bg.setAttribute('x', String(vb[0]))
    bg.setAttribute('y', String(vb[1]))
    bg.setAttribute('width', String(vb[2]))
    bg.setAttribute('height', String(vb[3]))
    bg.setAttribute('fill', '#fff')
    svg.insertBefore(bg, svg.firstChild)
    if (css) {
      var style = document.createElementNS(SVG_NS, 'style')
      style.textContent = css
      svg.insertBefore(style, svg.firstChild)
    }

    var href = 'images/' + name + '.svg'
    zip.file('OEBPS/' + href, '<?xml version="1.0" encoding="UTF-8"?>' + new XMLSerializer().serializeToString(svg))

    var wrap = document.createElement('div')
    wrap.className = 'epub-figure'
    var img = document.createElement('img')
    img.setAttribute('src', href)
    img.setAttribute('alt', label)
    wrap.appendChild(img)
    return { node: wrap, item: '<item id="' + name + '" href="' + href + '" media-type="image/svg+xml"/>' }
  }

  var FLAT_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray',
    'opacity', 'display', 'visibility', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor']

  // rgba() → rgb() + *-opacity; simple SVG renderers don't parse alpha colours.
  function setPaint(el, prop, value) {
    var m = value.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/)
    if (!m) { el.setAttribute(prop, value); return }
    el.setAttribute(prop, 'rgb(' + m[1] + ',' + m[2] + ',' + m[3] + ')')
    var op = prop + '-opacity'
    var prev = parseFloat(el.getAttribute(op))
    el.setAttribute(op, String(parseFloat(m[4]) * (isNaN(prev) ? 1 : prev)))
  }

  // Mermaid styles its SVG through #id-scoped <style> rules and positions
  // label lines with em offsets and tspans; reader SVG engines (e.g. FBReader)
  // handle none of that, leaving unfilled black boxes and misplaced text. Bake
  // the computed styles into presentation attributes, resolve positions to
  // plain px on <text> and drop the stylesheet so the file renders the same
  // everywhere.
  function flattenSvgStyles(svg) {
    var host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    // Off-screen, not visibility:hidden — that would be inherited and baked
    // into every element as visibility="hidden".
    host.style.cssText = 'position:absolute;left:-99999px;top:0'
    host.appendChild(svg)
    document.body.appendChild(host)
    try {
      // Read everything before writing anything: stripping a parent's class
      // would change what its descendants' #id .class rules resolve to.
      var els = Array.prototype.slice.call(svg.querySelectorAll('*')).filter(function (el) {
        return !el.closest('style, title, desc')
      })
      var computed = els.map(function (el) {
        var cs = window.getComputedStyle(el)
        var vals = {}
        FLAT_PROPS.forEach(function (prop) { vals[prop] = cs.getPropertyValue(prop) })
        vals.fontSize = parseFloat(cs.fontSize) || 16
        vals.baseline = cs.getPropertyValue('dominant-baseline')
        return vals
      })
      els.forEach(function (el, i) {
        var vals = computed[i]
        var fontSize = vals.fontSize
        FLAT_PROPS.forEach(function (prop) {
          var v = vals[prop]
          if (!v) return
          if (prop === 'display') { if (v === 'none') el.setAttribute('display', 'none'); return }
          if (prop === 'visibility') { if (v === 'hidden') el.setAttribute('visibility', 'hidden'); return }
          if (prop === 'fill' || prop === 'stroke') setPaint(el, prop, v)
          else if (prop.indexOf('-opacity') === -1 || !el.hasAttribute(prop)) el.setAttribute(prop, v)
        })
        ;['x', 'y', 'dx', 'dy'].forEach(function (a) {
          var v = el.getAttribute(a)
          if (v && /em$/.test(v)) el.setAttribute(a, String(parseFloat(v) * fontSize))
        })
        // Fold dy and dominant-baseline into y: fewer constructs for a reader
        // engine to get wrong, same rendering in a full one.
        var NUM = /^-?\d+(\.\d+)?$/
        var y = el.getAttribute('y')
        var dy = el.getAttribute('dy')
        if (y && dy && NUM.test(y) && NUM.test(dy)) {
          y = String(parseFloat(y) + parseFloat(dy))
          el.setAttribute('y', y)
          el.removeAttribute('dy')
        }
        if (y && NUM.test(y) && /^(middle|central)$/.test(vals.baseline)) {
          el.setAttribute('y', String(parseFloat(y) + 0.35 * fontSize))
        }
        el.removeAttribute('dominant-baseline')
        el.removeAttribute('alignment-baseline')
        el.removeAttribute('style')
        el.removeAttribute('class')
      })
      svg.querySelectorAll('style').forEach(function (s) { s.remove() })
      splitTextRows(svg)
    } finally {
      host.remove()
    }
    return svg
  }

  // Mermaid places each label line in a <tspan> with its own x/y. Reader SVG
  // engines (FBReader) position only the <text> element and ignore tspan
  // coordinates, so every label ends up a line too high and multi-line labels
  // collapse onto one line. Give each positioned row its own <text>.
  function splitTextRows(svg) {
    var NUM = /^-?\d+(\.\d+)?$/
    Array.prototype.slice.call(svg.querySelectorAll('text')).forEach(function (text) {
      var kids = Array.prototype.slice.call(text.childNodes)
      var hasLooseText = kids.some(function (n) { return n.nodeType === 3 && n.textContent.trim() })
      var rows = kids.filter(function (n) { return n.nodeType === 1 })
      if (hasLooseText || !rows.length) return
      if (!rows.every(function (r) {
        return r.tagName === 'tspan' && (NUM.test(r.getAttribute('y') || '') || NUM.test(r.getAttribute('dy') || ''))
      })) return
      // Track the current y the way SVG does: absolute y resets it, dy adds.
      var curY = parseFloat(text.getAttribute('y')) || 0
      rows.forEach(function (row) {
        var ry = row.getAttribute('y')
        var rdy = row.getAttribute('dy')
        if (NUM.test(ry || '')) curY = parseFloat(ry)
        if (NUM.test(rdy || '')) curY += parseFloat(rdy)
        var t = text.cloneNode(false)
        Array.prototype.forEach.call(row.attributes, function (a) {
          if (a.name !== 'dx' && a.name !== 'dy') t.setAttribute(a.name, a.value)
        })
        t.setAttribute('y', String(curY))
        while (row.firstChild) t.appendChild(row.firstChild)
        text.parentNode.insertBefore(t, text)
      })
      text.remove()
    })
    // Words come as one tspan each with a leading space (" submits"), which
    // such engines trim — merge same-styled, unpositioned runs into one.
    function attrKey(el) {
      return Array.prototype.map.call(el.attributes, function (a) { return a.name + '=' + a.value }).sort().join('|')
    }
    Array.prototype.slice.call(svg.querySelectorAll('text')).forEach(function (text) {
      var prev = null
      Array.prototype.slice.call(text.childNodes).forEach(function (n) {
        var mergeable = n.nodeType === 1 && n.tagName === 'tspan' && !n.children.length &&
          !['x', 'y', 'dx', 'dy'].some(function (a) { return n.hasAttribute(a) })
        if (mergeable && prev && attrKey(prev) === attrKey(n)) {
          prev.textContent += n.textContent
          n.remove()
        } else {
          prev = mergeable ? n : null
        }
      })
    })
  }

  function sourceBlock(text) {
    var pre = document.createElement('pre')
    pre.textContent = text
    return pre
  }

  // The live diagrams use the site's dark theme and HTML labels in
  // <foreignObject>, which SVG-as-image renderers drop. Re-render each one from
  // the source stashed by post.ejs with a light theme and SVG <text> labels,
  // then restore the page's own config.
  function embedDiagrams(root, zip) {
    var nodes = root ? Array.prototype.slice.call(root.querySelectorAll('.mermaid')) : []
    if (!nodes.length) return Promise.resolve([])
    var cm = window.coldnightMermaid
    var items = []
    if (cm) {
      cm.mermaid.initialize(Object.assign({}, cm.config, {
        startOnLoad: false, theme: 'default', htmlLabels: false, flowchart: { htmlLabels: false }
      }))
    }
    function restore() {
      if (cm) cm.mermaid.initialize(Object.assign({}, cm.config, { startOnLoad: false }))
    }

    var chain = Promise.resolve()
    nodes.forEach(function (node, i) {
      chain = chain.then(function () {
        var src = node.getAttribute('data-source')
        if (!src) { node.remove(); return }
        if (!cm) { node.replaceWith(sourceBlock(src)); return }
        return cm.mermaid.render('epub-mermaid-' + i, src).then(function (res) {
          var tpl = document.createElement('template')
          tpl.innerHTML = res.svg
          var svg = tpl.content.querySelector('svg')
          if (!svg) throw new Error('no svg')
          var f = svgToFile(flattenSvgStyles(svg), zip, 'diagram' + i, 'Diagram ' + (i + 1))
          items.push(f.item)
          node.replaceWith(f.node)
        }).catch(function () {
          node.replaceWith(sourceBlock(src))
        })
      })
    })
    return chain.then(
      function () { restore(); return items },
      function (e) { restore(); throw e }
    )
  }

  // Readers drop empty inline-block swatches, ignore list-style:none and
  // override text colours in dark mode, so the legend becomes a colourless
  // bullet list. Rebuild it as a paragraph with a tiny SVG colour square per
  // series — images are the one thing those readers render faithfully.
  function flattenLegends(root, zip) {
    var written = {}
    var items = []
    root.querySelectorAll('ul.chart__legend').forEach(function (ul) {
      var p = document.createElement('p')
      p.className = 'chart__legend'
      ul.querySelectorAll('.chart__legend-item').forEach(function (li) {
        var item = document.createElement('span')
        item.className = 'chart__legend-item'
        var sw = li.querySelector('.chart__swatch')
        var m = sw && sw.className.match(/chart__series--(\d+)/)
        var color = m && SERIES_COLORS[(parseInt(m[1], 10) - 1) % SERIES_COLORS.length]
        if (color) {
          var name = 'swatch' + m[1]
          var href = 'images/' + name + '.svg'
          if (!written[name]) {
            written[name] = true
            zip.file('OEBPS/' + href,
              '<?xml version="1.0" encoding="UTF-8"?>' +
              '<svg xmlns="' + SVG_NS + '" width="12" height="12" viewBox="0 0 12 12">' +
              '<rect width="12" height="12" fill="' + color + '"/></svg>')
            items.push('<item id="' + name + '" href="' + href + '" media-type="image/svg+xml"/>')
          }
          var img = document.createElement('img')
          img.className = 'chart__swatch'
          img.setAttribute('src', href)
          img.setAttribute('alt', '')
          img.setAttribute('width', '12')
          img.setAttribute('height', '12')
          item.appendChild(img)
          item.appendChild(document.createTextNode('\u00A0'))
        }
        if (sw) sw.remove()
        item.appendChild(document.createTextNode(li.textContent.trim()))
        if (p.firstChild) p.appendChild(document.createTextNode('\u2003'))
        p.appendChild(item)
      })
      ul.replaceWith(p)
    })
    return items
  }

  function embedCharts(root, zip) {
    if (!root) return []
    var items = flattenLegends(root, zip)
    Array.prototype.slice.call(root.querySelectorAll('svg.chart__svg')).forEach(function (svg, i) {
      var title = svg.querySelector('title')
      var f = svgToFile(svg.cloneNode(true), zip, 'chart' + i, (title && title.textContent.trim()) || 'Chart', CHART_CSS)
      svg.replaceWith(f.node)
      items.push(f.item)
    })
    return items
  }

  // Runs after embedImages, which would otherwise try to fetch the new
  // images/*.svg paths from the site and rewrite them to broken absolute URLs.
  function embedFigures(root, zip) {
    var chartItems = embedCharts(root, zip)
    return embedDiagrams(root, zip).then(function (diagramItems) {
      return chartItems.concat(diagramItems).join('')
    })
  }

  function buildEpub(data) {
    var zip = new JSZip() // eslint-disable-line no-undef
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

    // mimetype must be the first file and stored without compression
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    return embedImages(data.content, zip).then(function (imageItems) {
      return embedFigures(data.content, zip).then(function (figureItems) {
        return imageItems + figureItems
      })
    }).then(function (imageItems) {
      // XMLSerializer emits well-formed XML (self-closed voids, no named
      // entities like &nbsp;) — required by strict ePub readers.
      var contentXhtml = data.content
        ? new XMLSerializer().serializeToString(data.content)
        : ''
      // EPUB 3 requires the svg property on documents with inline SVG (icons
      // etc. — charts and diagrams have been moved out to image files).
      var contentProps = contentXhtml.indexOf('<svg') !== -1 ? ' properties="svg"' : ''

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
            '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"' + contentProps + '/>' +
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
        '.epub-compare__item{margin:1em 0;text-align:center}.epub-compare__item img{width:100%;height:auto}' +
        '.epub-compare__label{font-size:.875em;font-weight:600;margin:.25em 0 0}' +
        '.epub-figure{margin:1em 0;text-align:center}.epub-figure img{width:100%;height:auto}' +
        '.chart__legend{font-size:.85em;text-align:center}.chart__swatch{width:.8em;height:.8em;vertical-align:middle}')

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
