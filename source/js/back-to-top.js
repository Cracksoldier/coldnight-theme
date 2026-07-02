;(function () {
  'use strict'

  const btn = document.getElementById('back-to-top')
  if (!btn) return

  window.addEventListener('scroll', function () {
    btn.classList.toggle('back-to-top--visible', window.scrollY > window.innerHeight)
  }, { passive: true })

  btn.addEventListener('click', function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  })
})()
