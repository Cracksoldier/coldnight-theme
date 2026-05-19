;(function () {
  'use strict'

  var input   = document.getElementById('search-input')
  if (!input) return

  var wrap    = document.getElementById('search-wrap')
  var results = document.getElementById('search-results')
  var data    = null
  var timer   = null

  // Load the index on first focus (lazy — avoids blocking page load)
  input.addEventListener('focus', function loadIndex() {
    input.removeEventListener('focus', loadIndex)
    fetch('/search.json')
      .then(function (r) { return r.json() })
      .then(function (json) { data = Array.isArray(json) ? json : (json.posts || []) })
      .catch(function () { data = [] })
  })

  input.addEventListener('input', function () {
    clearTimeout(timer)
    timer = setTimeout(runSearch, 180)
  })

  function runSearch() {
    var q = input.value.trim().toLowerCase()
    if (!q || !data) { close(); return }

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
      open()
      return
    }
    results.innerHTML = matched.map(function (post) {
      var title = mark(esc(post.title || 'Untitled'), q)
      var snip  = mark(esc(snippet(post.content, q)), q)
      return '<a href="' + post.url + '" class="search-result-item">' +
        '<div>' + title + '</div>' +
        (snip ? '<div class="search-result-item__snip">' + snip + '</div>' : '') +
        '</a>'
    }).join('')
    open()
  }

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

  function open() {
    results.classList.add('open')
    input.setAttribute('aria-expanded', 'true')
  }

  function close() {
    results.classList.remove('open')
    input.setAttribute('aria-expanded', 'false')
    results.innerHTML = ''
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (wrap && !wrap.contains(e.target)) close()
  })

  // Keyboard: Escape closes; ArrowDown moves focus into results
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { close(); input.blur(); return }
    var items = results.querySelectorAll('.search-result-item')
    if (!items.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); items[0].focus() }
  })

  // Keyboard: arrow navigation within results; Escape returns focus to input
  results.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { close(); input.focus(); return }
    var items   = Array.from(results.querySelectorAll('.search-result-item'))
    var idx     = items.indexOf(document.activeElement)
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
})()
