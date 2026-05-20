;(function () {
  'use strict'

  var btn      = document.getElementById('toc-drawer-btn')
  var drawer   = document.getElementById('toc-drawer')
  var overlay  = document.getElementById('toc-drawer-overlay')
  var closeBtn = document.getElementById('toc-drawer-close')
  if (!btn || !drawer) return

  function openDrawer() {
    drawer.hidden = false
    btn.setAttribute('aria-expanded', 'true')
    document.body.style.overflow = 'hidden'
    closeBtn.focus()
  }

  function closeDrawer() {
    drawer.hidden = true
    btn.setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
    btn.focus()
  }

  btn.addEventListener('click', openDrawer)
  overlay.addEventListener('click', closeDrawer)
  closeBtn.addEventListener('click', closeDrawer)

  document.addEventListener('keydown', function (e) {
    if (drawer.hidden) return
    if (e.key === 'Escape') { closeDrawer(); return }
    if (e.key === 'Tab') {
      var focusables = Array.prototype.slice.call(drawer.querySelectorAll('button, a[href]'))
      if (!focusables.length) return
      var first = focusables[0]
      var last  = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
  })

  drawer.querySelectorAll('.toc-link').forEach(function (a) {
    a.addEventListener('click', closeDrawer)
  })
})()
