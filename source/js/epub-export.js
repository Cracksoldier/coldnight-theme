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

  function getCleanContent() {
    var body = document.querySelector('.post-body')
    if (!body) return ''
    var clone = body.cloneNode(true)
    clone.querySelectorAll('.code-toolbar, .heading-anchor').forEach(function (el) { el.remove() })
    // Fix void elements so the document is valid XHTML (strip any existing trailing slash first)
    return clone.innerHTML.replace(/<(br|hr|img|input|link|meta)(\s[^>]*?)?\s*\/?>/gi, '<$1$2/>')
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

  function buildEpub(data) {
    var zip = new JSZip() // eslint-disable-line no-undef
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

    // mimetype must be the first file and stored without compression
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

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
          data.content +
        '</body>' +
      '</html>')

    zip.file('OEBPS/style.css',
      'body{font-family:Georgia,"Times New Roman",serif;line-height:1.7;max-width:42em;margin:0 auto;padding:1em}' +
      'h1,h2,h3{line-height:1.3}' +
      'pre,code{font-family:monospace;font-size:.9em}' +
      'pre{background:#f5f5f5;padding:1em;white-space:pre-wrap;overflow-x:auto}' +
      'img{max-width:100%}' +
      'a{color:#4080ff}' +
      'blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:1em;color:#555}' +
      'table{border-collapse:collapse;width:100%}' +
      'td,th{border:1px solid #ddd;padding:.5em}' +
      'figure{margin:1.5em 0}figcaption{font-size:.875em;color:#666;text-align:center;margin-top:.25em}' +
      'details summary{cursor:pointer;font-weight:600}')

    return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
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
