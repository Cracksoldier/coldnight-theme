(function () {
  'use strict'

  document.addEventListener('DOMContentLoaded', function () {
    var triggers = document.querySelectorAll('[data-category-desc]')
    if (!triggers.length) return

    var tooltip = document.createElement('div')
    tooltip.className = 'category-tooltip'
    tooltip.id = 'category-tooltip'
    tooltip.setAttribute('role', 'tooltip')
    document.body.appendChild(tooltip)

    var active = null

    function show(el) {
      var desc = el.getAttribute('data-category-desc')
      if (!desc) return
      active = el
      tooltip.textContent = desc

      tooltip.style.visibility = 'hidden'
      tooltip.classList.add('category-tooltip--visible')
      var rect = el.getBoundingClientRect()
      var left = Math.max(8, Math.min(
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2,
        window.innerWidth - tooltip.offsetWidth - 8
      ))
      var top = rect.top - tooltip.offsetHeight - 8
      if (top < 8) top = rect.bottom + 8
      tooltip.style.left = left + 'px'
      tooltip.style.top = top + 'px'
      tooltip.style.visibility = ''

      el.setAttribute('aria-describedby', 'category-tooltip')
    }

    function hide() {
      tooltip.classList.remove('category-tooltip--visible')
      if (active) {
        active.removeAttribute('aria-describedby')
        active = null
      }
    }

    triggers.forEach(function (el) {
      el.addEventListener('mouseenter', function () { show(el) })
      el.addEventListener('mouseleave', hide)
      el.addEventListener('focus', function () { show(el) })
      el.addEventListener('blur', hide)
    })

    // position: fixed — the tooltip would otherwise drift away from its trigger
    window.addEventListener('scroll', hide, { passive: true })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide()
    })
  })
})()
