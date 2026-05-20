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
    if (e.key === 'Escape' && !drawer.hidden) closeDrawer()
  })

  drawer.querySelectorAll('.toc-link').forEach(function (a) {
    a.addEventListener('click', closeDrawer)
  })
})()
