;(function () {
  'use strict'

  var h1 = document.querySelector('.post-title')
  if (!h1) return

  var inner = document.querySelector('.navbar__inner')
  if (!inner) return

  var brand = inner.querySelector('.navbar__brand')
  var span = document.createElement('span')
  span.className = 'navbar__post-title'
  span.textContent = h1.textContent
  brand.insertAdjacentElement('afterend', span)
  inner.classList.add('has-post-title')

  var observer = new IntersectionObserver(function (entries) {
    inner.classList.toggle('navbar--title-visible', !entries[0].isIntersecting)
  }, { threshold: 0 })

  observer.observe(h1)
})()
