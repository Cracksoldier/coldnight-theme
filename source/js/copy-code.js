(function () {
  'use strict'

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
      const codeCell = block.querySelector('td.code')
      const source = codeCell
        ? (codeCell.querySelector('code') || codeCell)
        : (block.querySelector('code') || block)

      const clone = source.cloneNode(true)
      clone.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n') })
      const text = clone.textContent.trim()

      navigator.clipboard.writeText(text).then(function () {
        showToast('Copied to clipboard', 'success')
      }).catch(function () {
        showToast('Copy failed', 'error')
      })
    })

    const toolbar = document.createElement('div')
    toolbar.className = 'code-toolbar'

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

  document.addEventListener('DOMContentLoaded', function () {
    // Hexo wraps code in figure.highlight — target those as well as bare <pre>
    const figures = document.querySelectorAll('figure.highlight')
    figures.forEach(addCopyButton)

    const pres = document.querySelectorAll('.post-body pre:not(figure.highlight pre)')
    pres.forEach(addCopyButton)
  })
})()
