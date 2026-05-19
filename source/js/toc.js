;(function () {
  'use strict'

  var tocLinks = document.querySelectorAll('.toc-link')
  if (!tocLinks.length) return

  var headings = Array.from(tocLinks).map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1))
  }).filter(Boolean)

  if (!headings.length) return

  function setActive(id) {
    tocLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id)
    })
  }

  var lastActiveId = null

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) lastActiveId = entry.target.id
    })
    if (lastActiveId) setActive(lastActiveId)
  }, { rootMargin: '0px 0px -65% 0px', threshold: 0 })

  headings.forEach(function (h) { observer.observe(h) })

  // Mobile toggle
  var toggle = document.querySelector('.widget-toc__toggle')
  var list = document.getElementById('toc-list')
  if (toggle && list) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true'
      toggle.setAttribute('aria-expanded', String(!expanded))
      list.hidden = expanded
    })
  }
})()
