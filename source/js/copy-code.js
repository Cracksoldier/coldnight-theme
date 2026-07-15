(function () {
  'use strict'

  // Threshold arrives via data-collapse-lines on this file's <script> tag
  // (post.ejs omits the attribute when code.collapse is false). 0 = disabled.
  const collapseLines = (function () {
    const script = document.currentScript
    const n = script ? parseInt(script.dataset.collapseLines, 10) : 0
    return n > 0 ? n : 0
  })()

  // Never collapse unless the button would reveal more than this many lines
  const COLLAPSE_MARGIN = 5

  function showToast(message, type) {
    const container = document.getElementById('toast-container')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = 'toast toast--' + (type || 'info')
    toast.innerHTML =
      '<span style="flex:1">' + message + '</span>' +
      '<button class="toast__close" aria-label="Dismiss">&times;</button>'

    const closeBtn = toast.querySelector('.toast__close')
    closeBtn.addEventListener('click', () => toast.remove())

    container.appendChild(toast)
    setTimeout(() => toast.remove(), 3500)
  }

  function writeToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(ta)
      return Promise.resolve()
    } catch (err) {
      document.body.removeChild(ta)
      return Promise.reject(err)
    }
  }

  function getCodeText(block) {
    const codeCell = block.querySelector('td.code')
    const source = codeCell
      ? (codeCell.querySelector('code') || codeCell)
      : (block.querySelector('code') || block)

    const clone = source.cloneNode(true)
    clone.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n') })
    return clone.textContent.trim()
  }

  // The filename comment may carry a project path (// filename: src/app.js)
  // to show context in the chip — but a.download doesn't sanitize slashes
  // consistently across browsers, so use the basename for the actual save name.
  function basename(filename) {
    return filename.split(/[\\/]/).pop()
  }

  function downloadCode(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = basename(filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Deferred revoke — same margin epub-export.js's triggerDownload() uses;
    // revoking immediately after click() has raced with the download starting
    // on some browser engines.
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
  }

  function addCopyButton(block) {
    const btn = document.createElement('button')
    btn.className = 'btn btn--icon btn--sm code-copy-btn'
    btn.setAttribute('aria-label', 'Copy code')
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>' +
      '</svg>'

    btn.addEventListener('click', function () {
      writeToClipboard(getCodeText(block)).then(function () {
        showToast('Copied to clipboard', 'success')
      }).catch(function () {
        showToast('Copy failed', 'error')
      })
    })

    const toolbar = document.createElement('div')
    toolbar.className = 'code-toolbar'

    const filename = block.getAttribute('data-filename')
    if (filename) {
      const fnLabel = document.createElement('button')
      fnLabel.type = 'button'
      fnLabel.className = 'code-filename-label'
      fnLabel.textContent = filename
      fnLabel.setAttribute('aria-label', 'Download ' + filename)
      fnLabel.addEventListener('click', function () {
        downloadCode(filename, getCodeText(block))
      })
      toolbar.appendChild(fnLabel)
    }

    const lang = block.getAttribute('data-lang')
    if (lang) {
      const label = document.createElement('span')
      label.className = 'code-lang-label'
      label.textContent = lang
      toolbar.appendChild(label)
    }

    toolbar.appendChild(btn)
    block.style.position = 'relative'
    block.appendChild(toolbar)
  }

  function countLines(block) {
    const gutterLines = block.querySelectorAll('td.gutter .line')
    if (gutterLines.length) return gutterLines.length
    const code = block.querySelector('code') || block
    const brs = code.querySelectorAll('br').length
    if (brs) return brs + 1
    return code.textContent.replace(/\n$/, '').split('\n').length
  }

  function makeCollapsible(block, index) {
    const total = countLines(block)
    if (total <= collapseLines + COLLAPSE_MARGIN) return

    const hiddenCount = total - collapseLines
    if (!block.id) block.id = 'code-block-' + index

    block.classList.add('code-collapsible', 'is-collapsed')
    block.style.setProperty('--code-visible-lines', collapseLines)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn btn--sm btn--ghost code-collapse__btn'
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-controls', block.id)
    btn.textContent = 'Show ' + hiddenCount + ' more lines'

    btn.addEventListener('click', function () {
      const collapsed = block.classList.toggle('is-collapsed')
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
      btn.textContent = collapsed ? 'Show ' + hiddenCount + ' more lines' : 'Collapse'
      if (collapsed && block.getBoundingClientRect().top < 0) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        block.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
      }
    })

    const footer = document.createElement('div')
    footer.className = 'code-collapse'
    footer.appendChild(btn)
    block.appendChild(footer)
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Hexo wraps code in figure.highlight — target those as well as bare <pre>
    const figures = document.querySelectorAll('figure.highlight')
    figures.forEach(addCopyButton)

    const pres = document.querySelectorAll('.post-body pre:not(figure.highlight pre)')
    pres.forEach(addCopyButton)

    if (collapseLines > 0) {
      figures.forEach(makeCollapsible)
      pres.forEach(function (pre, i) { makeCollapsible(pre, figures.length + i) })
    }

    const permaBtn = document.querySelector('.post-permalink-btn')
    if (permaBtn) {
      permaBtn.addEventListener('click', function () {
        writeToClipboard(permaBtn.dataset.permalink).then(function () {
          showToast('Link copied', 'success')
        }).catch(function () {
          showToast('Copy failed', 'error')
        })
      })
    }

    // Mastodon has no universal share endpoint — ask for the reader's home
    // instance once and remember it; the prefilled prompt doubles as the
    // change-instance path. The scheme is hardcoded so a malicious entry can
    // never yield a javascript: URL.
    document.querySelectorAll('.post-share-mastodon').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var stored = ''
        try { stored = localStorage.getItem('coldnight:mastodon-instance') || '' } catch (e) {}
        var input = window.prompt('Your Mastodon instance (e.g. mastodon.social)', stored || 'mastodon.social')
        if (input === null) return
        var domain = input.trim().toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/[\/?#].*$/, '')
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
          showToast('Invalid instance domain', 'error')
          return
        }
        try { localStorage.setItem('coldnight:mastodon-instance', domain) } catch (e) {}
        var text = btn.dataset.title + '\n\n' + btn.dataset.permalink
        window.open('https://' + domain + '/share?text=' + encodeURIComponent(text), '_blank', 'noopener')
      })
    })

    document.querySelectorAll('.post-share-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        writeToClipboard(btn.dataset.permalink).then(function () {
          showToast('Link copied', 'success')
        }).catch(function () {
          showToast('Copy failed', 'error')
        })
      })
    })

    document.querySelectorAll('.post-body h2[id], .post-body h3[id]').forEach(function (h) {
      var a = document.createElement('a')
      a.className = 'heading-anchor'
      a.href = '#' + h.id
      a.setAttribute('aria-hidden', 'true')
      a.setAttribute('tabindex', '-1')
      a.textContent = '#'
      a.addEventListener('click', function (e) {
        e.preventDefault()
        var url = window.location.origin + window.location.pathname + '#' + h.id
        writeToClipboard(url).then(function () {
          showToast('Link copied', 'success')
        }).catch(function () {
          showToast('Copy failed', 'error')
        })
      })
      h.appendChild(a)
    })

    // Footnote tooltips
    var fnRefs = document.querySelectorAll('.footnote-ref a')
    if (fnRefs.length) {
      var fnTooltip = document.createElement('div')
      fnTooltip.className = 'fn-tooltip'
      fnTooltip.setAttribute('role', 'tooltip')
      document.body.appendChild(fnTooltip)

      var fnHideTimer

      function showFnTooltip(ref) {
        clearTimeout(fnHideTimer)
        var targetId = ref.getAttribute('href')
        var li = targetId ? document.getElementById(targetId.slice(1)) : null
        if (!li) return
        var clone = li.cloneNode(true)
        var backref = clone.querySelector('.footnote-backref')
        if (backref) backref.remove()
        fnTooltip.innerHTML = clone.innerHTML.trim()

        fnTooltip.style.visibility = 'hidden'
        fnTooltip.classList.add('fn-tooltip--visible')
        var rect = ref.getBoundingClientRect()
        var ttWidth = fnTooltip.offsetWidth
        var ttHeight = fnTooltip.offsetHeight
        var left = Math.max(8, Math.min(
          rect.left + rect.width / 2 - ttWidth / 2,
          window.innerWidth - ttWidth - 8
        ))
        var top = rect.top - ttHeight - 8
        if (top < 8) top = rect.bottom + 8
        fnTooltip.style.left = left + 'px'
        fnTooltip.style.top  = top  + 'px'
        fnTooltip.style.visibility = ''
      }

      function hideFnTooltip() {
        fnTooltip.classList.remove('fn-tooltip--visible')
      }

      fnRefs.forEach(function (ref) {
        ref.addEventListener('mouseenter', function () { showFnTooltip(ref) })
        ref.addEventListener('mouseleave', function () {
          fnHideTimer = setTimeout(hideFnTooltip, 200)
        })
        ref.addEventListener('click', function (e) {
          e.preventDefault()
          if (fnTooltip.classList.contains('fn-tooltip--visible')) {
            hideFnTooltip()
          } else {
            showFnTooltip(ref)
          }
        })
      })

      document.addEventListener('click', function (e) {
        if (!e.target.closest('.footnote-ref') && !e.target.closest('.fn-tooltip')) {
          hideFnTooltip()
        }
      })

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideFnTooltip()
      })
    }
  })
})()
