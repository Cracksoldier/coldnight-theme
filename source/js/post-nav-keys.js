;(function () {
  'use strict'

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    var el = document.activeElement
    if (!el) return
    var tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return
    if (el.isContentEditable) return

    var selector = e.key === 'ArrowLeft'
      ? '.post-nav__item--prev a'
      : '.post-nav__item--next a'
    var link = document.querySelector(selector)
    if (link) link.click()
  })
})()
