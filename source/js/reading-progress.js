;(function () {
  'use strict'

  var bar = document.getElementById('reading-progress')
  if (!bar) return

  function update() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop
    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
    var pct = docHeight > 0 ? Math.min(100, Math.round(scrollTop / docHeight * 100)) : 0
    bar.style.width = pct + '%'
    bar.setAttribute('aria-valuenow', pct)
  }

  window.addEventListener('scroll', update, { passive: true })
  update()
})()
