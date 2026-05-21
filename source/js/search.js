;(function () {
  'use strict'

  var scriptEl      = document.querySelector('script[data-search-url]')
  var searchJsonUrl = (scriptEl && scriptEl.getAttribute('data-search-url')) || '/search.json'

  var data        = null
  var loadPromise = null

  function loadIndex() {
    if (loadPromise) return loadPromise
    loadPromise = fetch(searchJsonUrl)
      .then(function (r) { return r.json() })
      .then(function (json) { data = Array.isArray(json) ? json : (json.posts || []) })
      .catch(function () { data = [] })
    return loadPromise
  }

  function init(inputId, wrapperId, resultsId) {
    var input   = document.getElementById(inputId)
    if (!input) return

    var wrap    = document.getElementById(wrapperId)
    var results = document.getElementById(resultsId)
    var timer   = null

    input.addEventListener('focus', function loadOnce() {
      input.removeEventListener('focus', loadOnce)
      loadIndex().then(function () {
        if (input.value.trim()) runSearch()
      })
    })

    input.addEventListener('input', function () {
      clearTimeout(timer)
      timer = setTimeout(runSearch, 180)
    })

    function runSearch() {
      var q = input.value.trim().toLowerCase()
      if (!q || !data) { closeResults(); return }

      var terms   = q.split(/\s+/)
      var matched = data.filter(function (post) {
        var hay = [
          post.title || '',
          post.content ? post.content.slice(0, 800) : '',
          (post.tags || []).join(' ')
        ].join(' ').toLowerCase()
        return terms.every(function (t) { return hay.indexOf(t) !== -1 })
      }).slice(0, 8)

      render(matched, q)
    }

    function render(matched, q) {
      if (!matched.length) {
        results.innerHTML = '<div class="search-no-results">No results for "' +
          esc(q) + '"</div>'
        openResults()
        return
      }
      results.innerHTML = matched.map(function (post) {
        var title = mark(esc(post.title || 'Untitled'), q)
        var snip  = mark(esc(snippet(post.content, q)), q)
        return '<a href="' + esc(post.url) + '" class="search-result-item">' +
          '<div>' + title + '</div>' +
          (snip ? '<div class="search-result-item__snip">' + snip + '</div>' : '') +
          '</a>'
      }).join('')
      openResults()
    }

    function openResults() {
      results.classList.add('open')
      input.setAttribute('aria-expanded', 'true')
    }

    function closeResults() {
      results.classList.remove('open')
      input.setAttribute('aria-expanded', 'false')
      results.innerHTML = ''
    }

    document.addEventListener('click', function (e) {
      if (wrap && !wrap.contains(e.target)) closeResults()
    })

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeResults(); input.blur(); return }
      var items = results.querySelectorAll('.search-result-item')
      if (!items.length) return
      if (e.key === 'ArrowDown') { e.preventDefault(); items[0].focus() }
    })

    results.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeResults(); input.focus(); return }
      var items = Array.from(results.querySelectorAll('.search-result-item'))
      var idx   = items.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        var next = items[idx + 1] || items[0]
        if (next) next.focus()
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (idx <= 0) { input.focus(); return }
        items[idx - 1].focus()
      }
    })
  }

  init('search-input', 'search-wrap', 'search-results')
  init('search-input-mobile', 'search-wrap-mobile', 'search-results-mobile')

  document.addEventListener('keydown', function (e) {
    if (e.key !== '/') return
    var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return
    var input = document.getElementById('search-input')
    if (!input) return
    e.preventDefault()
    input.focus()
    input.select()
  })

  var _shortcutsDialog = null

  function getShortcutsDialog() {
    if (_shortcutsDialog) return _shortcutsDialog
    var d = document.createElement('dialog')
    d.className = 'shortcuts-modal'
    d.innerHTML =
      '<button class="shortcuts-modal__close" aria-label="Close">&times;</button>' +
      '<h2 class="shortcuts-modal__title">Keyboard shortcuts</h2>' +
      '<dl class="shortcuts-modal__list">' +
        '<div><dt><kbd>/</kbd></dt><dd>Focus search</dd></div>' +
        '<div><dt><kbd>Esc</kbd></dt><dd>Close search / dismiss</dd></div>' +
        '<div><dt><kbd>?</kbd></dt><dd>Show this help</dd></div>' +
        '<div><dt><kbd>←</kbd></dt><dd>Previous post</dd></div>' +
        '<div><dt><kbd>→</kbd></dt><dd>Next post</dd></div>' +
      '</dl>'
    document.body.appendChild(d)
    d.querySelector('.shortcuts-modal__close').addEventListener('click', function () { d.close() })
    d.addEventListener('click', function (e) { if (e.target === d) d.close() })
    _shortcutsDialog = d
    return d
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== '?') return
    var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return
    e.preventDefault()
    var dlg = getShortcutsDialog()
    if (!dlg.open) dlg.showModal()
  })

  function snippet(content, q) {
    if (!content) return ''
    var terms = q.trim().split(/\s+/).filter(Boolean)
    var text  = content.replace(/\s+/g, ' ').slice(0, 600)
    if (terms.length) {
      var idx = text.toLowerCase().indexOf(terms[0].toLowerCase())
      if (idx > 50) text = '…' + text.slice(idx - 30)
    }
    return text.slice(0, 130) + (text.length > 130 ? '…' : '')
  }

  function mark(text, q) {
    q.trim().split(/\s+/).filter(Boolean).forEach(function (t) {
      text = text.replace(new RegExp('(' + reEsc(t) + ')', 'gi'), '<mark>$1</mark>')
    })
    return text
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
})()
